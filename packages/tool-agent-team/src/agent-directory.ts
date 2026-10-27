/** Mixed Team/subagent discovery and cancellable change observation for Team tools. */
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type { TeamMemberView } from '@dsh-native-collab/agent-team'
import { TeamError } from '@dsh-native-collab/agent-team'
import { requireCollabSubagents } from '@dsh-native-collab/subagent'

/** Select Team discovery, direct children, or the caller's descendant catalogs. */
export type DirectoryScope = 'all' | 'team' | 'children' | 'descendants'
/** Domains whose next change can wake the model. */
export type WaitScope = 'all' | 'team' | 'subagents'

/** Stable mixed-directory row; availability never represents task success. */
export interface DirectorySubagent {
  readonly kind: 'subagent'
  readonly id: SessionId
  readonly mode: 'continuable' | 'one-shot' | 'external' | 'unknown'
  readonly label?: string
  readonly status: 'running' | 'inactive' | 'unknown'
  readonly parent?: SessionId
  readonly depth?: number
}

/** Read authorized child catalogs without exposing Team members twice.
 * @param ctx - mounted discovery and activity services.
 * @param caller - exact calling Agent.
 * @param scope - selected catalog depth.
 * @param members - caller's Team roster, used only for duplicate exclusion.
 * @param signal - cancels catalog reads.
 * @returns independent subagents and unreadable descendant diagnostics.
 */
export async function listIndependentAgents(
  ctx: Context, caller: Agent, scope: Exclude<DirectoryScope, 'team'>,
  members: readonly TeamMemberView[], signal: AbortSignal,
) {
  const excluded = new Set(members.filter(member => member.id !== caller.id).map(member => member.id))
  const runtime = requireCollabSubagents(ctx)
  const entries = scope === 'descendants'
    ? await ctx.subagents.listDescendants(caller.id, signal)
    : await ctx.subagents.listChildren(caller.id, signal)
  const running = new Set(runtime.childActivity(caller, excluded).runningIds)
  // Descendant catalogs are pre-order. Exclude an entire Team branch, not just
  // its root row, so Team-owned work is not presented as an independent child.
  const hidden = new Set(excluded)
  type Entry = DirectorySubagent | { readonly kind: 'diagnostic'; readonly id: SessionId; readonly reason: 'corrupt' | 'unsupported' | 'unavailable'; readonly parent?: SessionId; readonly depth?: number }
  return entries.flatMap<Entry>(entry => {
    if (hidden.has(entry.id) || ('parentId' in entry && hidden.has(entry.parentId))) {
      hidden.add(entry.id)
      return []
    }
    const at = 'parentId' in entry ? { parent: entry.parentId, depth: entry.depth } : {}
    if ('kind' in entry && entry.kind === 'diagnostic') {
      return [{ kind: 'diagnostic' as const, id: entry.id, reason: entry.reason, ...at }]
    }
    const status = running.has(entry.id) || ctx.agents.get(entry.id)?.status === 'running'
      ? 'running' as const
      : entry.mode === 'external' || entry.mode === 'unknown' ? 'unknown' as const : 'inactive' as const
    const row: DirectorySubagent = {
      kind: 'subagent', id: entry.id, mode: entry.mode, status,
      ...entry.label === undefined ? {} : { label: entry.label }, ...at,
    }
    return [row]
  })
}

/** One model wait outcome, including the absence of progressing work. */
export interface AgentWaitResult {
  readonly timedOut: boolean
  readonly noProgress?: {
    readonly reason: 'no-active-agent'
    readonly message: string
  }
}

/** Observe selected activity without yielding between snapshots and subscriptions; release losing waits.
 * @param ctx - Team and derived subagent services.
 * @param caller - exact calling Agent.
 * @param scope - domains to observe; all includes independent subagents.
 * @param timeoutMs - integer milliseconds from ten seconds through one hour.
 * @param signal - cancellation of this observation, never cancellation of Agents.
 * @returns next-change, timeout, or no-progress outcome; never wakes an Agent.
 */
export async function waitForAgents(
  ctx: Context, caller: Agent, scope: WaitScope, timeoutMs: number, signal: AbortSignal,
): Promise<AgentWaitResult> {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 10_000 || timeoutMs > 3_600_000) {
    throw new TeamError('timeoutMs must be an integer from 10000 through 3600000', 'TEAM_INVALID_TIMEOUT')
  }
  signal.throwIfAborted()
  const members = ctx.agentTeams.listMembers(caller)
  const excluded = new Set(members.filter(member => member.id !== caller.id).map(member => member.id))
  const observeTeam = scope !== 'subagents'
  const runtime = scope === 'team' ? undefined : requireCollabSubagents(ctx)
  const stop = new AbortController()
  const observationSignal = AbortSignal.any([signal, stop.signal])
  const changed = Promise.withResolvers<AgentWaitResult>()
  let observedChange = false
  let dispose: (() => void) | undefined
  let teamWait: Promise<{ readonly timedOut: boolean }> | undefined
  const onAbort = (): void => { changed.reject(observationSignal.reason) }
  observationSignal.addEventListener('abort', onAbort, { once: true })
  const timer = setTimeout(() => { changed.resolve({ timedOut: true }) }, timeoutMs)
  try {
    observationSignal.throwIfAborted()
    dispose = runtime?.observeChildActivity(caller, excluded, () => {
      observedChange = true
      changed.resolve({ timedOut: false })
    })
    const activity = runtime?.childActivity(caller, excluded)
    const activeChild = activity !== undefined && (activity.preparing || activity.runningIds.length > 0)
    const activeTeam = observeTeam && members.some(member => member.id !== caller.id
      && (member.status === 'running' || member.status === 'provisioning'))
    observationSignal.throwIfAborted()
    if (observedChange) return { timedOut: false }
    if (!activeChild && !activeTeam) return {
      timedOut: false,
      noProgress: {
        reason: 'no-active-agent',
        message: 'No other agent in the selected scope is progressing. This is not proof of task completion. Re-list agents and results; use send_message to resume a required inactive continuable agent before waiting.',
      },
    }
    // No asynchronous work separates the Team status read from registration.
    // Do not create a Team wait at all on the no-progress path: its rejection
    // must not be hidden by a later shortcut or by cleanup of an unused wait.
    teamWait = observeTeam ? ctx.agentTeams.waitForChange(caller, timeoutMs, observationSignal) : undefined
    return await Promise.race(teamWait === undefined ? [changed.promise] : [changed.promise, teamWait])
  } finally {
    clearTimeout(timer)
    observationSignal.removeEventListener('abort', onAbort)
    try {
      dispose?.()
    } finally {
      stop.abort(new Error('wait_agent observation finished'))
      // Setup failures also own this promise even before Promise.race exists.
      changed.resolve({ timedOut: false })
      await Promise.allSettled([changed.promise, ...(teamWait === undefined ? [] : [teamWait])])
    }
  }
}
