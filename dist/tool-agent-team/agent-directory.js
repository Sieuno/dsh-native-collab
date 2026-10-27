import { TeamError } from '../agent-team/index.js';
import { requireCollabSubagents } from '../subagent/index.js';
/** Read authorized child catalogs without exposing Team members twice.
 * @param ctx - mounted discovery and activity services.
 * @param caller - exact calling Agent.
 * @param scope - selected catalog depth.
 * @param members - caller's Team roster, used only for duplicate exclusion.
 * @param signal - cancels catalog reads.
 * @returns independent subagents and unreadable descendant diagnostics.
 */
export async function listIndependentAgents(ctx, caller, scope, members, signal) {
    const excluded = new Set(members.filter(member => member.id !== caller.id).map(member => member.id));
    const runtime = requireCollabSubagents(ctx);
    const entries = scope === 'descendants'
        ? await ctx.subagents.listDescendants(caller.id, signal)
        : await ctx.subagents.listChildren(caller.id, signal);
    const running = new Set(runtime.childActivity(caller, excluded).runningIds);
    // Descendant catalogs are pre-order. Exclude an entire Team branch, not just
    // its root row, so Team-owned work is not presented as an independent child.
    const hidden = new Set(excluded);
    return entries.flatMap(entry => {
        if (hidden.has(entry.id) || ('parentId' in entry && hidden.has(entry.parentId))) {
            hidden.add(entry.id);
            return [];
        }
        const at = 'parentId' in entry ? { parent: entry.parentId, depth: entry.depth } : {};
        if ('kind' in entry && entry.kind === 'diagnostic') {
            return [{ kind: 'diagnostic', id: entry.id, reason: entry.reason, ...at }];
        }
        const status = running.has(entry.id) || ctx.agents.get(entry.id)?.status === 'running'
            ? 'running'
            : entry.mode === 'external' || entry.mode === 'unknown' ? 'unknown' : 'inactive';
        const row = {
            kind: 'subagent', id: entry.id, mode: entry.mode, status,
            ...entry.label === undefined ? {} : { label: entry.label }, ...at,
        };
        return [row];
    });
}
/** Observe selected activity without yielding between snapshots and subscriptions; release losing waits.
 * @param ctx - Team and derived subagent services.
 * @param caller - exact calling Agent.
 * @param scope - domains to observe; all includes independent subagents.
 * @param timeoutMs - integer milliseconds from ten seconds through one hour.
 * @param signal - cancellation of this observation, never cancellation of Agents.
 * @returns next-change, timeout, or no-progress outcome; never wakes an Agent.
 */
export async function waitForAgents(ctx, caller, scope, timeoutMs, signal) {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 10_000 || timeoutMs > 3_600_000) {
        throw new TeamError('timeoutMs must be an integer from 10000 through 3600000', 'TEAM_INVALID_TIMEOUT');
    }
    signal.throwIfAborted();
    const members = ctx.agentTeams.listMembers(caller);
    const excluded = new Set(members.filter(member => member.id !== caller.id).map(member => member.id));
    const observeTeam = scope !== 'subagents';
    const runtime = scope === 'team' ? undefined : requireCollabSubagents(ctx);
    const stop = new AbortController();
    const observationSignal = AbortSignal.any([signal, stop.signal]);
    const changed = Promise.withResolvers();
    let observedChange = false;
    let dispose;
    let teamWait;
    const onAbort = () => { changed.reject(observationSignal.reason); };
    observationSignal.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => { changed.resolve({ timedOut: true }); }, timeoutMs);
    try {
        observationSignal.throwIfAborted();
        dispose = runtime?.observeChildActivity(caller, excluded, () => {
            observedChange = true;
            changed.resolve({ timedOut: false });
        });
        const activity = runtime?.childActivity(caller, excluded);
        const activeChild = activity !== undefined && (activity.preparing || activity.runningIds.length > 0);
        const activeTeam = observeTeam && members.some(member => member.id !== caller.id
            && (member.status === 'running' || member.status === 'provisioning'));
        observationSignal.throwIfAborted();
        if (observedChange)
            return { timedOut: false };
        if (!activeChild && !activeTeam)
            return {
                timedOut: false,
                noProgress: {
                    reason: 'no-active-agent',
                    message: 'No other agent in the selected scope is progressing. This is not proof of task completion. Re-list agents and results; use send_message to resume a required inactive continuable agent before waiting.',
                },
            };
        // No asynchronous work separates the Team status read from registration.
        // Do not create a Team wait at all on the no-progress path: its rejection
        // must not be hidden by a later shortcut or by cleanup of an unused wait.
        teamWait = observeTeam ? ctx.agentTeams.waitForChange(caller, timeoutMs, observationSignal) : undefined;
        return await Promise.race(teamWait === undefined ? [changed.promise] : [changed.promise, teamWait]);
    }
    finally {
        clearTimeout(timer);
        observationSignal.removeEventListener('abort', onAbort);
        try {
            dispose?.();
        }
        finally {
            stop.abort(new Error('wait_agent observation finished'));
            // Setup failures also own this promise even before Promise.race exists.
            changed.resolve({ timedOut: false });
            await Promise.allSettled([changed.promise, ...(teamWait === undefined ? [] : [teamWait])]);
        }
    }
}
