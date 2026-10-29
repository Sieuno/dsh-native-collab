import { brandString } from '@deepseek-ai/dsh-brand';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { assertNoIdentityTransition, setIdentityRecovery, withIdleContinuable } from '../subagent/internal.js';
import { membershipExchangeReason, parseMembershipExchangeRequest } from "./membership-ui.js";
function sameRequest(left, right) {
    return left.rootId === right.rootId && left.targetId === right.targetId && left.operationId === right.operationId
        && left.to === right.to && left.name === right.name && left.description === right.description;
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
    /** The committed edge is the durable outbox; the receiver inbox event is its receipt. */
    async recover(root) {
        if (this.lifecycle.disposed || this.roster.tryMembership(root)?.role !== 'lead')
            return;
        await this.ctx.sessions.flush(root.session);
        for (const receipt of this.journal.state(root).operations) {
            const request = { rootId: root.id, targetId: receipt.memberId, operationId: receipt.operationId, to: receipt.to };
            const notification = await this.notify(root, request);
            if (notification === 'failed')
                this.pendingNotifications.set(receipt.memberId, request);
            else if (this.pendingNotifications.get(receipt.memberId)?.operationId === receipt.operationId)
                this.pendingNotifications.delete(receipt.memberId);
        }
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
            const state = this.journal.state(root);
            for (const entry of await this.ctx.subagents.listChildren(root.id, this.lifecycle.signal)) {
                if (entry.mode !== 'continuable')
                    continue;
                const member = state.members.find(value => value.id === entry.id);
                if (member !== undefined && member.phase !== 'active' && member.phase !== 'departed')
                    continue;
                const live = this.ctx.agents.get(entry.id);
                let reason = null;
                try {
                    assertNoIdentityTransition(this.ctx.subagents, entry.id);
                }
                catch (error) {
                    reason = membershipExchangeReason(error);
                }
                if (live !== undefined && live.status !== 'idle')
                    reason = 'busy';
                rows.push({
                    rootId: root.id, targetId: entry.id,
                    role: member?.phase === 'active' ? 'teammate' : 'subagent',
                    name: member?.name ?? '', label: entry.label,
                    status: live?.status === 'running' ? 'running' : 'inactive', reason, recovery: this.recovering.get(entry.id) ?? this.pendingNotifications.get(entry.id) ?? null,
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
        if (pending !== undefined && !sameRequest(pending, request))
            return result('recovery-required', 'inconsistent-state');
        try {
            const converted = await withIdleContinuable(this.ctx.subagents, root, targetId, async (child, signal) => {
                signal.throwIfAborted();
                this.lifecycle.signal.throwIfAborted();
                this.recovering.set(targetId, request);
                setIdentityRecovery(this.ctx.subagents, targetId, true);
                let committed = false;
                try {
                    const receipt = await this.roster.convertMembership(root, child, request);
                    committed = true;
                    // A same-operation receipt may follow append-then-flush failure. A
                    // receipt in memory is not evidence that persistence succeeded.
                    await this.ctx.sessions.flush(root.session);
                    signal.throwIfAborted();
                    this.reconcile(child);
                    // Keep the recovery guard until the manager's final maintenance checks
                    // have passed as well; a durable edge cannot be rolled back by an abort.
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
            });
            if (converted.status === 'converted' || converted.status === 'unchanged') {
                setIdentityRecovery(this.ctx.subagents, targetId, false);
                this.recovering.delete(targetId);
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
