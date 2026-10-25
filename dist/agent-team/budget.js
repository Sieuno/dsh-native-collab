/** Durable team-local logical request-admission quota stored in Host storage domains. */
import z from 'zod';
import { errorMessage, TeamError } from "./error.js";
const nonNegativeSafeInteger = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const positiveSafeInteger = nonNegativeSafeInteger.min(1);
const teamBudgetRecordSchema = z.object({
    ledgerVersion: z.literal(1),
    epoch: z.literal(1),
    rootSessionId: z.string().min(1),
    limit: positiveSafeInteger,
    used: nonNegativeSafeInteger,
    firstDenied: z.object({
        agentId: z.string().min(1),
        turn: nonNegativeSafeInteger,
        step: nonNegativeSafeInteger,
    }).strict().optional(),
}).strict();
/** Encode a root Session id using storage-json's safe record-key alphabet. */
function ledgerKey(rootId) {
    return `r-${Buffer.from(rootId, 'utf8').toString('base64url')}`;
}
function teamHasHistory(root, journal) {
    const state = journal.state(root);
    return state.members.length > 0 || state.tasks.length > 0 || state.messages.length > 0;
}
function budgetView(record) {
    return {
        status: record.used >= record.limit ? 'exhausted' : 'active',
        limit: record.limit,
        used: record.used,
        ...record.firstDenied === undefined ? {} : {
            firstDenied: { ...record.firstDenied, agentId: record.firstDenied.agentId },
        },
    };
}
function budgetStorageError(error) {
    if (error instanceof TeamError)
        return error;
    const rawCode = typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : '';
    const code = ['invalid-record', 'version-mismatch', 'malformed-medium'].includes(rawCode)
        ? 'TEAM_BUDGET_STORAGE_INVALID'
        : 'TEAM_BUDGET_STORAGE_UNAVAILABLE';
    return new TeamError(`Agent Team request budget storage failed closed: ${errorMessage(error)}`, code, { cause: error });
}
/** Durable Team budget ledger. Domain data is never mirrored into Session events. */
export class TeamBudget {
    ctx;
    journal;
    limit;
    domain;
    opening;
    openFailure;
    constructor(ctx, journal, limit) {
        this.ctx = ctx;
        this.journal = journal;
        this.limit = limit;
    }
    /** Open the Host-owned per-record domain before Team service activation. */
    async open() {
        if (this.domain !== undefined)
            return;
        if (this.openFailure !== undefined)
            throw this.openFailure;
        if (this.opening !== undefined)
            return await this.opening;
        this.opening = this.openDomain();
        try {
            await this.opening;
        }
        catch (error) {
            this.opening = undefined;
            this.openFailure = budgetStorageError(error);
            throw this.openFailure;
        }
    }
    async openDomain() {
        const facility = this.ctx.get('storageDomain');
        if (typeof facility !== 'object' || facility === null || !('open' in facility)
            || typeof facility.open !== 'function') {
            throw new TeamError('Agent Teams require the Host storage-domain service; no in-memory or temporary fallback is allowed', 'TEAM_BUDGET_STORAGE_UNAVAILABLE');
        }
        try {
            const spec = {
                name: 'native_collab_team_budget',
                version: 1,
                layout: 'per-record',
                tables: { ledgers: { valueSchema: teamBudgetRecordSchema } },
            };
            // DomainFacility.open is the public Host API; it validates this standard
            // DomainSpec through descriptorOf before opening the configured backend.
            const open = facility.open;
            const opened = await open.call(facility, spec);
            if (typeof opened !== 'object' || opened === null || !('table' in opened)
                || typeof opened.table !== 'function' || !('close' in opened) || typeof opened.close !== 'function') {
                throw new TeamError('Host storage-domain returned an invalid domain handle', 'TEAM_BUDGET_STORAGE_INVALID');
            }
            this.domain = opened;
        }
        catch (error) {
            throw budgetStorageError(error);
        }
    }
    /** Close the opened domain after Team-owned Agent work has settled. */
    async close() {
        const domain = this.domain;
        this.domain = undefined;
        if (domain !== undefined)
            await domain.close();
    }
    /** Whether one root already has a durable ledger. Requires `open()` first. */
    hasLedger(root) {
        return this.domain?.table('ledgers').get(ledgerKey(root.id)) !== undefined;
    }
    /** Start the persisted epoch before the first durable collaboration write. */
    async ensureStarted(root) {
        const table = this.requireTable();
        const prior = table.get(ledgerKey(root.id));
        if (prior !== undefined) {
            this.assertRootRecord(root, prior);
            return;
        }
        if (teamHasHistory(root, this.journal)) {
            throw new TeamError('Team request budget is unavailable for a legacy Team; explicit migration or a new Team is required', 'TEAM_BUDGET_LEGACY');
        }
        try {
            await table.put(ledgerKey(root.id), {
                ledgerVersion: 1,
                epoch: 1,
                rootSessionId: root.id,
                limit: this.limit,
                used: 0,
            });
        }
        catch (error) {
            throw budgetStorageError(error);
        }
    }
    /** Read the exact durable quota state without mutating it. */
    get(root) {
        const ledger = this.requireTable().get(ledgerKey(root.id));
        if (ledger === undefined) {
            if (teamHasHistory(root, this.journal)) {
                throw new TeamError('Team request budget is unavailable for a legacy Team; explicit migration or a new Team is required', 'TEAM_BUDGET_LEGACY');
            }
            return { status: 'not-started', limit: this.limit, used: 0 };
        }
        this.assertRootRecord(root, ledger);
        return budgetView(ledger);
    }
    /** Persist the first denied admission as a single Team-domain update. */
    async recordFirstDenial(root, agentId, turn, step) {
        await this.journal.transact(root.id, async () => {
            const table = this.requireTable();
            const prior = table.get(ledgerKey(root.id));
            if (prior === undefined) {
                if (teamHasHistory(root, this.journal)) {
                    throw new TeamError('Team request budget is unavailable for a legacy Team', 'TEAM_BUDGET_LEGACY');
                }
                throw new TeamError('Team request budget ledger is not started', 'TEAM_BUDGET_STORAGE_INVALID');
            }
            this.assertRootRecord(root, prior);
            if (prior.firstDenied !== undefined || prior.used < prior.limit)
                return;
            try {
                await table.update(ledgerKey(root.id), current => {
                    this.assertRootRecord(root, current);
                    if (current.firstDenied !== undefined || current.used < current.limit)
                        return current;
                    return { ...current, firstDenied: { agentId, turn, step } };
                });
            }
            catch (error) {
                throw budgetStorageError(error);
            }
        });
    }
    /** Atomically reserve and durably commit one logical request admission. */
    async reserve(root) {
        return await this.journal.transact(root.id, async () => {
            const table = this.requireTable();
            const prior = table.get(ledgerKey(root.id));
            if (prior === undefined) {
                if (teamHasHistory(root, this.journal)) {
                    throw new TeamError('Team request budget is unavailable for a legacy Team; explicit migration or a new Team is required', 'TEAM_BUDGET_LEGACY');
                }
                return { admitted: true, budget: { status: 'not-started', limit: this.limit, used: 0 } };
            }
            this.assertRootRecord(root, prior);
            if (prior.used >= prior.limit)
                return { admitted: false, budget: budgetView(prior) };
            let next;
            try {
                next = await table.update(ledgerKey(root.id), current => {
                    this.assertRootRecord(root, current);
                    if (current.used >= current.limit)
                        return current;
                    return { ...current, used: current.used + 1 };
                });
            }
            catch (error) {
                throw budgetStorageError(error);
            }
            if (next.used === prior.used)
                return { admitted: false, budget: budgetView(next) };
            return { admitted: true, budget: budgetView(next) };
        });
    }
    requireTable() {
        const domain = this.domain;
        if (domain === undefined) {
            throw this.openFailure ?? new TeamError('Agent Team request budget storage is not open; request denied without fallback', 'TEAM_BUDGET_STORAGE_UNAVAILABLE');
        }
        return domain.table('ledgers');
    }
    assertRootRecord(root, record) {
        if (record.rootSessionId !== root.id || record.epoch !== 1 || record.ledgerVersion !== 1) {
            throw new TeamError(`Team request budget record does not match root Session "${root.id}" and epoch 1`, 'TEAM_BUDGET_STORAGE_INVALID');
        }
    }
}
