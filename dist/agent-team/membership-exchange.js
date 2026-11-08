import { brandString } from '@deepseek-ai/dsh-brand';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { assertNoIdentityTransition, setIdentityRecovery, withIdleContinuable } from '../subagent/internal.js';
import { membershipExchangeReason, parseMembershipExchangeRequest } from "./membership-ui.js";
function sameOperation(left, right) {
    return left.rootId === right.rootId && left.targetId === right.targetId && left.operationId === right.operationId && left.to === right.to;
}
function compatibleReplay(pending, replay) {
    return sameOperation(pending, replay)
        && (replay.name === undefined || replay.name === pending.name)
        && (replay.description === undefined || replay.description === pending.description);
}
/** Private UI port; deliberately absent from the service's named/model operations. */
export class MembershipExchange {
    ctx;
    roster;
    journal;
    lifecycle;
    reconcile;
    recovering = new Map();
    notified = new Map();
    pendingNotifications = new Map();
    flushedOperations = new Map();
    markFlushed(rootId, receipts) {
        const ids = this.flushedOperations.get(rootId) ?? new Set();
        for (const receipt of receipts)
            ids.add(receipt.operationId);
        this.flushedOperations.set(rootId, ids);
    }
    /** The committed edge is the durable outbox; the receiver inbox event is its receipt. */
    async recover(root) {
        if (this.lifecycle.disposed || this.roster.tryMembership(root)?.role !== 'lead')
            return;
        // Snapshot before flushing: a flush-then-read sequence could observe a new
        // in-memory receipt that the completed flush did not persist.
        const snapshot = [...this.journal.state(root).operations];
        await this.ctx.sessions.flush(root.session);
        this.markFlushed(root.id, snapshot);
        const latest = new Map();
        for (const receipt of snapshot)
            latest.set(receipt.memberId, receipt);
        const failures = [];
        for (const receipt of latest.values()) {
            try {
                const request = { rootId: root.id, targetId: receipt.memberId, operationId: receipt.operationId, to: receipt.to };
                let stableReceipt = false;
                const reconciled = await withIdleContinuable(this.ctx.subagents, root, receipt.memberId, async (child, signal) => {
                    signal.throwIfAborted();
                    const current = [...this.journal.state(root).operations].reverse().find(value => value.memberId === receipt.memberId);
                    if (current?.operationId !== receipt.operationId || current.to !== receipt.to)
                        return false;
                    // The durable edge and exact current operation are checked while the
                    // same manager fence/idle maintenance lease used by conversion is held.
                    this.reconcile(child);
                    stableReceipt = true;
                    return true;
                }, (_child, confirmed) => {
                    if (confirmed && stableReceipt) {
                        setIdentityRecovery(this.ctx.subagents, receipt.memberId, false);
                        if (this.recovering.get(receipt.memberId)?.operationId === receipt.operationId)
                            this.recovering.delete(receipt.memberId);
                    }
                });
                if (!reconciled)
                    continue;
                const notification = await this.notify(root, request);
                if (notification === 'failed')
                    this.pendingNotifications.set(receipt.memberId, request);
                else if (this.pendingNotifications.get(receipt.memberId)?.operationId === receipt.operationId)
                    this.pendingNotifications.delete(receipt.memberId);
            }
            catch (error) {
                // One busy or inconsistent child must not block independent durable
                // receipts. Its Manager guard is left untouched and failures surface
                // together after the remaining children have been attempted.
                failures.push(error);
            }
        }
        if (failures.length > 0)
            throw new AggregateError(failures, 'Agent Teams receipt recovery incomplete');
    }
    constructor(ctx, roster, journal, lifecycle, reconcile) {
        this.ctx = ctx;
        this.roster = roster;
        this.journal = journal;
        this.lifecycle = lifecycle;
        this.reconcile = reconcile;
    }
    async candidates() {
        if (this.lifecycle.disposed)
            return [];
        const rows = [];
        for (const root of this.ctx.agents.list()) {
            if (this.roster.tryMembership(root)?.role !== 'lead')
                continue;
            const stateBeforeFlush = this.journal.state(root);
            const confirmed = this.flushedOperations.get(root.id) ?? new Set();
            const unconfirmed = stateBeforeFlush.operations.filter(receipt => !confirmed.has(receipt.operationId));
            if (unconfirmed.length > 0) {
                await this.ctx.sessions.flush(root.session);
                this.markFlushed(root.id, unconfirmed);
            }
            const state = this.journal.state(root);
            const receiptSnapshot = state.operations.filter(receipt => this.flushedOperations.get(root.id)?.has(receipt.operationId));
            for (const entry of await this.ctx.subagents.listChildren(root.id, this.lifecycle.signal)) {
                if (entry.mode !== 'continuable')
                    continue;
                const member = state.members.find(value => value.id === entry.id);
                if (member !== undefined && member.phase !== 'active' && member.phase !== 'departed')
                    continue;
                const live = this.ctx.agents.get(entry.id);
                let reason = null;
                let recovery = this.recovering.get(entry.id) ?? this.pendingNotifications.get(entry.id) ?? null;
                try {
                    assertNoIdentityTransition(this.ctx.subagents, entry.id);
                }
                catch (error) {
                    reason = membershipExchangeReason(error);
                    // A rebuilt coordinator only needs a durable retry request while the Manager still guards this child.
                    if (recovery === null && typeof error === 'object' && error !== null && 'code' in error && error.code === 'IDENTITY_RECOVERY_REQUIRED') {
                        const receipt = [...receiptSnapshot].reverse().find(value => value.memberId === entry.id);
                        if (receipt !== undefined)
                            recovery = { rootId: root.id, targetId: entry.id, operationId: receipt.operationId, to: receipt.to };
                    }
                }
                if (live !== undefined && live.status !== 'idle')
                    reason = 'busy';
                rows.push({
                    rootId: root.id, targetId: entry.id,
                    role: member?.phase === 'active' ? 'teammate' : 'subagent',
                    name: member?.name ?? '', label: entry.label,
                    status: live?.status === 'running' ? 'running' : 'inactive', reason,
                    recovery,
                });
            }
        }
        return rows;
    }
    convert(raw) {
        return this.lifecycle.track(this.convertAdmitted(parseMembershipExchangeRequest(raw)));
    }
    async convertAdmitted(request) {
        const result = (status, reason, notification = 'unchanged') => ({
            rootId: request.rootId, targetId: request.targetId, operationId: request.operationId, to: request.to, status, reason, notification,
        });
        if (this.lifecycle.disposed)
            return result('rejected', 'unavailable');
        const root = this.ctx.agents.get(brandString(request.rootId));
        const targetId = brandString(request.targetId);
        if (root === undefined || this.roster.tryMembership(root)?.role !== 'lead' || root.id === targetId)
            return result('rejected', 'not-found');
        const pending = this.recovering.get(targetId);
        if (pending !== undefined && !compatibleReplay(pending, request))
            return result('recovery-required', 'inconsistent-state');
        const admitted = pending ?? request;
        try {
            try {
                assertNoIdentityTransition(this.ctx.subagents, targetId);
            }
            catch (error) {
                const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
                if (code !== 'IDENTITY_RECOVERY_REQUIRED')
                    return result('recovery-required', membershipExchangeReason(error));
                if (pending === undefined) {
                    // A rebuilt Coordinator has lost its in-memory request. Permit only
                    // the exact operation whose receipt this Manager is guarding, and
                    // first make that snapshot durable before retrying it.
                    const snapshot = [...this.journal.state(root).operations];
                    const receipt = snapshot.find(value => value.operationId === request.operationId
                        && value.memberId === targetId && value.to === request.to);
                    if (receipt === undefined)
                        return result('recovery-required', 'inconsistent-state');
                    await this.ctx.sessions.flush(root.session);
                    this.markFlushed(root.id, snapshot);
                    const current = [...this.journal.state(root).operations].reverse().find(value => value.memberId === targetId);
                    if (current?.operationId !== receipt.operationId || current.to !== receipt.to)
                        return result('recovery-required', 'inconsistent-state');
                }
            }
            let reconciliationReady = false;
            const converted = await withIdleContinuable(this.ctx.subagents, root, targetId, async (child, signal) => {
                signal.throwIfAborted();
                this.lifecycle.signal.throwIfAborted();
                this.recovering.set(targetId, admitted);
                setIdentityRecovery(this.ctx.subagents, targetId, true);
                let committed = false;
                try {
                    const receipt = await this.roster.convertMembership(root, child, admitted);
                    committed = true;
                    // A same-operation receipt may follow append-then-flush failure. A
                    // receipt in memory is not evidence that persistence succeeded.
                    await this.ctx.sessions.flush(root.session);
                    this.markFlushed(root.id, [receipt]);
                    signal.throwIfAborted();
                    this.reconcile(child);
                    reconciliationReady = true;
                    return result(receipt.replayed ? 'unchanged' : 'converted', null);
                }
                catch (error) {
                    const uncertain = pending !== undefined || committed || (typeof error === 'object' && error !== null && 'code' in error && error.code === 'TEAM_MEMBERSHIP_COMMIT_UNCERTAIN');
                    if (!uncertain) {
                        setIdentityRecovery(this.ctx.subagents, targetId, false);
                        this.recovering.delete(targetId);
                    }
                    return result(uncertain ? 'recovery-required' : 'rejected', membershipExchangeReason(error));
                }
            }, (_child, stableResult) => {
                if (reconciliationReady && (stableResult.status === 'converted' || stableResult.status === 'unchanged')) {
                    setIdentityRecovery(this.ctx.subagents, targetId, false);
                    if (this.recovering.get(targetId)?.operationId === request.operationId)
                        this.recovering.delete(targetId);
                }
            });
            if (converted.status === 'converted' || converted.status === 'unchanged') {
                const notification = await this.notify(root, request);
                if (notification === 'failed')
                    this.pendingNotifications.set(targetId, request);
                else
                    this.pendingNotifications.delete(targetId);
                return { ...converted, notification };
            }
            return converted;
        }
        catch (error) {
            return result(this.recovering.has(targetId) ? 'recovery-required' : 'rejected', membershipExchangeReason(error));
        }
    }
    async notify(root, request) {
        const key = JSON.stringify([root.id, request.operationId]);
        const sent = this.notified.get(key) ?? new Set();
        this.notified.set(key, sent);
        let delivered = false;
        let failed = false;
        // Stable receiver identity deduplicates parent and Lead, not their labels.
        // This protocol admits only direct children of this exact Lead: parent and
        // Lead are the same durable receiver. No volatile child is needed to recover.
        const receivers = new Set([root.id]);
        for (const id of receivers) {
            if (sent.has(id))
                continue;
            const receiver = this.ctx.agents.get(id);
            if (receiver === undefined) {
                failed = true;
                continue;
            }
            try {
                const accepted = receiver.session.snapshotEvents(receiver.session.inheritedEventCount).some(event => event.type === 'agent/inbox/spliced' && event.data.inserted.some(message => {
                    const source = message.source;
                    return source.kind === 'team-membership-changed' && source.rootId === root.id
                        && source.targetId === request.targetId && source.operationId === request.operationId;
                }));
                if (accepted) {
                    await this.ctx.sessions.flush(receiver.session);
                    sent.add(id);
                    continue;
                }
                const message = createUserMessage({
                    source: { kind: 'team-membership-changed', rootId: root.id, targetId: brandString(request.targetId), operationId: request.operationId, to: request.to },
                    content: [{ type: 'text', text: `Identity transition ${request.operationId} completed for conversation ${request.targetId}: destination ${request.to === 'teammate' ? 'Team teammate' : 'independent Subagent'}. Session identity, history, model and working directory were preserved. This records that transition, not task completion or a claim that no later identity change occurred.` }],
                });
                if (receiver.status === 'idle')
                    receiver.followup(message);
                else
                    receiver.steer(message);
                await this.ctx.sessions.flush(receiver.session);
                sent.add(id);
                delivered = true;
            }
            catch {
                failed = true;
            }
        }
        return failed ? 'failed' : delivered ? 'delivered' : 'unchanged';
    }
}
