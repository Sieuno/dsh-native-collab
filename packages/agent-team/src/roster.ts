/** Team membership, continuable-child provisioning, and roster-owned teardown. */

import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import { brandString } from '@deepseek-ai/dsh-brand'
import type { Agent, AgentOptions } from '@deepseek-ai/dsh-agent'
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import type { MessageId } from '@deepseek-ai/dsh-llm'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { foldSubagentDescriptor } from '@deepseek-ai/dsh-subagent'
import { errorMessage, TeamError } from './error.ts'
import { callerRoute, decideTeamSelection } from './selection.ts'
import type { PinnedChildCall } from './selection.ts'
import type { TeamJournal } from './journal.ts'
import type { TeamRuntimeLifecycle } from './lifecycle.ts'
import { readPersistedSession } from './persisted.ts'
import type { TeamState } from './projection.ts'
import { messageAccepted } from './session-message.ts'
import { OWN_MODEL_KEY, rosterModelFields } from './own-model.ts'
import { TeamId } from './types.ts'
import type {
  SpawnTeammateRequest,
  SpawnTeammateResult,
  ConvertMembershipRequest,
  TeamMembershipConversionResult,
  TeamMemberSnapshot,
  TeamMemberView,
} from './types.ts'
import { requiredText } from './validation.ts'

type PreparedSpawnRequest = Omit<SpawnTeammateRequest, 'agentOptions'> & {
  readonly agentOptions?: PinnedChildCall
}

const MEMBER_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

/** Caller identity inside one implicit Team. */
export interface TeamMembership {
  readonly root: Agent
  readonly id: TeamId
  readonly role: 'lead' | 'teammate'
  readonly name: string
  readonly memberId: SessionId
  readonly epoch: number
}

/**
 * Resolve one active Team member by model-facing name, including the Lead pseudo-row.
 * @param root - exact live Team Lead.
 * @param state - current Team state.
 * @param rawName - candidate member name.
 * @returns resolved durable id and normalized name.
 */
export function resolveActiveMember(
  root: Agent,
  state: TeamState,
  rawName: string,
): { id: SessionId; name: string } {
  const name = rawName.trim()
  if (name === 'lead') return { id: root.id, name }
  const member = state.members.find(candidate => candidate.name === name)
  if (member === undefined || member.phase !== 'active') {
    throw new TeamError(`active teammate "${name}" not found`, 'TEAM_MEMBER_NOT_FOUND')
  }
  return { id: member.id, name }
}

/** Public route check used before any Team name claim. */
export interface TeamSelectionPort {
  readonly enhanced: boolean
  resolveCallConfig(
    config: { readonly provider: string; readonly model: string; readonly reasoningEffort?: string },
    signal: AbortSignal,
    caller: Agent,
  ): Promise<unknown>
}

/**
 * Copy the verified snapshot into child options.
 * An own `reasoningEffort: undefined` is kept so the native spread clears parent effort.
 * @param fields - detached route captured before the route lookup.
 * @returns options for `startActivation`.
 */
function toAgentOptions(fields: PinnedChildCall): AgentOptions {
  const options: AgentOptions = {
    provider: fields.provider,
    model: fields.model,
  }
  if (fields.reasoningEffort !== undefined) {
    options.reasoningEffort = ReasoningEffortId(fields.reasoningEffort)
    return options
  }
  return Object.assign(options, { reasoningEffort: undefined })
}

/** Owns Team identities and the lifecycle of rostered continuable children. */
export class TeamRoster {
  /**
   * @param ctx - Team service context with Agent, Session, persistence, and subagent services.
   * @param journal - authoritative Lead-log transaction owner.
   * @param lifecycle - shared Team runtime admission cutoff.
   * @param maxMembers - maximum immutable roster entries per Team.
   * @param selection - route validation that must finish before a name claim.
   */
  constructor(
    private readonly ctx: Context,
    private readonly journal: TeamJournal,
    private readonly lifecycle: TeamRuntimeLifecycle,
    private readonly maxMembers: number,
    private readonly selection: TeamSelectionPort,
  ) {}

  /**
   * Resolve one exact live Agent's Team role.
   * @param agent - exact live Agent used as the authority credential.
   * @returns its root, Team identity, role, and model-facing name.
   */
  membership(agent: Agent): TeamMembership {
    const membership = this.tryMembership(agent)
    if (membership === undefined) {
      throw new TeamError(`agent "${agent.id}" is not a member of an active Agent Team`, 'TEAM_NOT_MEMBER')
    }
    return membership
  }

  /**
   * Resolve a caller without throwing for scoped installation and lifecycle observers.
   * @param agent - candidate exact live Agent.
   * @returns Team membership, or undefined for non-Team subagents and stale identities.
   */
  tryMembership(agent: Agent): TeamMembership | undefined {
    if (this.ctx.agents.get(agent.id) !== agent) return undefined
    try {
      const parentId = agent.session.header.parentSession
      if (parentId !== undefined) {
        const root = this.ctx.agents.get(parentId)
        if (root !== undefined) {
          const member = this.journal.state(root).members.find(candidate => candidate.id === agent.id)
          if (member?.phase === 'active' || member?.phase === 'provisioning') {
            return { root, id: TeamId(root.id), role: 'teammate', name: member.name, memberId: member.id, epoch: member.epoch ?? 0 }
          }
          // A direct child outside the durable roster is not a teammate. Ordinary
          // host forks are independent roots; subagent descriptors distinguish
          // provider-owned workers that must not receive a nested Team identity.
          if (this.subagentDescriptor(agent)) return undefined
          return { root: agent, id: TeamId(agent.id), role: 'lead', name: 'lead', memberId: agent.id, epoch: 0 }
        }
      }
      // A continuation can briefly outlive its parent during child-first teardown.
      // Do not reinterpret that durable child as a new implicit root Team. A host-
      // resumed ordinary fork has no descriptor in its own suffix and remains a
      // valid new root whose inherited Team records stay outside its projected Team state.
      if (this.subagentDescriptor(agent)) return undefined
      return { root: agent, id: TeamId(agent.id), role: 'lead', name: 'lead', memberId: agent.id, epoch: 0 }
    } catch {
      // This method is used by lifecycle observers and teardown discovery. A
      // malformed durable stream is surfaced by authoritative Team operations;
      // the non-throwing probe must not veto unrelated Agent lifecycle edges.
      return undefined
    }
  }

  /**
   * Own request evidence wins. A live Agent with none may show its creation model.
   * Inactive absence omits the model. Display reads the projection, not the live header reader.
   */
  private modelFields(agent: Agent | undefined, session: object | undefined): { model?: string, modelSource?: 'own-request' | 'creation-default', llmProvider?: string } {
    let registry: { stateOf?: (target: object, key: string) => { model?: string, provider?: string } | null } | undefined
    try {
      registry = this.ctx.get('sessionProjections') as { stateOf?: (target: object, key: string) => { model?: string, provider?: string } | null } | undefined
    } catch (error) {
      void error
    }
    let ownModel: string | undefined
    let ownProvider: string | undefined
    if (registry !== undefined && session !== undefined && typeof registry.stateOf === 'function') {
      try {
        const state = registry.stateOf(session, OWN_MODEL_KEY)
        if (typeof state?.model === 'string' && state.model.length > 0) ownModel = state.model
        if (typeof state?.provider === 'string' && state.provider.length > 0) ownProvider = state.provider
      } catch (error) {
        void error
      }
    }
    return rosterModelFields({
      ownModel,
      ownProvider,
      agentLive: agent !== undefined,
      creationModel: agent?.options.model,
      creationProvider: agent?.options.provider,
    })
  }

  /**
   * List the runtime-enriched roster visible to one Team member.
   * @param membership - exact caller membership resolved by this roster.
   * @returns Lead and teammate rows in creation order.
   */
  list(membership: TeamMembership): TeamMemberView[] {
    const { root } = membership
    const state = this.journal.state(root)
    const result: TeamMemberView[] = [{
      id: root.id,
      name: 'lead',
      role: 'lead',
      status: availability(root),
      ...this.modelFields(root, root.session),
      diagnostics: [],
    }]
    for (const member of state.members) {
      if (member.phase === 'departed') continue
      const live = this.ctx.agents.get(member.id)
      const session = live?.session ?? this.ctx.sessions.get(member.id)
      result.push({
        id: member.id,
        name: member.name,
        role: 'teammate',
        status: member.phase === 'failed'
          ? 'failed'
          : member.phase === 'provisioning'
            ? 'provisioning'
            : availability(live),
        description: member.description,
        provider: member.provider,
        context: member.context,
        ...this.modelFields(live, session),
        diagnostics: member.error === undefined ? [] : [member.error],
      })
    }
    return result
  }

  /**
   * Persist a user-interface conversion edge without replacing the target Session.
   * @param caller - exact Lead authorizing the roster edge.
   * @param child - exact live target Agent.
   * @param request - idempotency key and destination metadata.
   * @returns durable edge receipt, marked replayed for an existing operation id.
   */
  async convertMembership(caller: Agent, child: Agent, request: ConvertMembershipRequest): Promise<TeamMembershipConversionResult> {
    this.assertExactLead(caller)
    const root = caller
    const operationId = requiredText(request.operationId, 'operationId', 200)
    return this.journal.transact(root.id, async () => {
      const state = this.journal.state(root)
      const replay = state.operations.find(receipt => receipt.operationId === operationId)
      if (replay !== undefined) {
        if (replay.memberId !== child.id || replay.to !== request.to) throw new TeamError('operationId was already used for another conversion', 'TEAM_INVALID_ARGUMENT')
        try {
          await this.journal.flush(root)
        } catch (error: unknown) {
          throw new TeamError('membership receipt replay flush failed; retry the same operationId', 'TEAM_MEMBERSHIP_COMMIT_UNCERTAIN', { cause: error })
        }
        return { ...replay, replayed: true }
      }
      if (this.ctx.agents.get(child.id) !== child) throw new TeamError('conversion target is not the exact live Agent', 'TEAM_INVALID_TARGET')
      if (child.status === 'running') throw new TeamError('running Agents cannot change Team membership', 'TEAM_MEMBER_RUNNING')
      const descriptor = foldSubagentDescriptor(child.session.snapshotEvents(child.session.inheritedEventCount))
      if (child.session.header.parentSession !== root.id || descriptor?.mode !== 'continuable') {
        throw new TeamError('conversion target must be a direct continuable child of this Lead', 'TEAM_INVALID_TARGET')
      }
      const prior = state.members.find(member => member.id === child.id)
      const name = prior?.name ?? (request.name === undefined ? undefined : this.memberName(request.name))
      if (prior !== undefined && request.name !== undefined && this.memberName(request.name) !== prior.name) throw new TeamError('rejoin must retain the historical teammate name', 'TEAM_INVALID_MEMBER_NAME')
      if (prior !== undefined && request.description !== undefined && request.description !== prior.description) throw new TeamError('rejoin must retain the historical teammate description', 'TEAM_INVALID_ARGUMENT')
      if (request.to === 'teammate') {
        if (prior !== undefined && prior.phase !== 'departed') throw new TeamError('target is already a Team member', 'TEAM_INVALID_TARGET')
        if (name === undefined) throw new TeamError('joining requires a teammate name', 'TEAM_INVALID_MEMBER_NAME')
        if (prior === undefined && state.members.some(member => member.name === name)) throw new TeamError(`teammate name "${name}" was already used in this Team`, 'TEAM_MEMBER_NAME_TAKEN')
        if (prior === undefined && state.members.length >= this.maxMembers) throw new TeamError(`Team member limit ${this.maxMembers} reached`, 'TEAM_MEMBER_LIMIT')
        const snapshot: TeamMemberSnapshot = {
          id: child.id, name, description: requiredText(prior?.description ?? request.description ?? descriptor.label, 'description', 200),
          provider: requiredText(prior?.provider ?? descriptor.provider, 'provider', 200), context: prior?.context ?? (child.session.inheritedEventCount > 0 ? 'fork' : 'fresh'), phase: 'active', epoch: (prior?.epoch ?? 0) + 1,
        }
        const data = { version: 3 as const, teamId: TeamId(root.id), operationId, action: 'join' as const, memberId: child.id, epoch: snapshot.epoch ?? 1, member: snapshot }
        try {
          await this.journal.appendAndFlush(root, 'team/member', data)
        } catch (error: unknown) {
          throw new TeamError('membership commit outcome is uncertain; retry the same operationId', 'TEAM_MEMBERSHIP_COMMIT_UNCERTAIN', { cause: error })
        }
        const receipt = this.journal.state(root).operations.find(item => item.operationId === operationId)
        if (receipt === undefined) throw new TeamError('membership commit flushed but its receipt is unavailable; retry the same operationId', 'TEAM_MEMBERSHIP_COMMIT_UNCERTAIN')
        return receipt
      }
      if (prior === undefined || prior.phase !== 'active') throw new TeamError('only an active teammate can leave', 'TEAM_INVALID_TARGET')
      if (state.tasks.some(task => task.ownerId === child.id && (task.status === 'pending' || task.status === 'in_progress'))) {
        throw new TeamError('member owns pending or in-progress tasks; reassign or complete them before leaving', 'TEAM_MEMBER_HAS_TASKS')
      }
      const epoch = (prior.epoch ?? 0) + 1
      try {
        await this.journal.appendAndFlush(root, 'team/member', { version: 3, teamId: TeamId(root.id), operationId, action: 'leave', memberId: child.id, epoch })
      } catch (error: unknown) {
        throw new TeamError('membership commit outcome is uncertain; retry the same operationId', 'TEAM_MEMBERSHIP_COMMIT_UNCERTAIN', { cause: error })
      }
      const receipt = this.journal.state(root).operations.find(item => item.operationId === operationId)
      if (receipt === undefined) throw new TeamError('membership commit flushed but its receipt is unavailable; retry the same operationId', 'TEAM_MEMBERSHIP_COMMIT_UNCERTAIN')
      return receipt
    })
  }

  /**
   * Create one named, continuable direct child of the Team Lead.
   * @param caller - exact live Lead Agent.
   * @param request - immutable name, description, prompt, context mode, provider, and cancellation.
   * @returns the active roster row.
   */
  async spawn(caller: Agent, request: SpawnTeammateRequest): Promise<SpawnTeammateResult> {
    if (this.lifecycle.disposed) throw new TeamError('Agent Teams service is disposing', 'TEAM_DISPOSED')
    this.assertExactLead(caller)
    const prepared = await this.prepareSelection(caller, request)
    this.assertExactLead(caller)
    if (this.lifecycle.disposed) throw new TeamError('Agent Teams service is disposing', 'TEAM_DISPOSED')
    request.signal.throwIfAborted()
    return await this.lifecycle.track(this.spawnAdmitted(caller, prepared))
  }

  /** Require the exact live Lead before a route lookup or a name claim. */
  private assertExactLead(caller: Agent): void {
    const membership = this.membership(caller)
    if (membership.role !== 'lead' || membership.root !== caller) {
      throw new TeamError('only the Team Lead can create teammates', 'TEAM_LEAD_REQUIRED')
    }
  }

  /**
   * Validate a named child route before membership or name claim.
   * Omission leaves agentOptions unset so the child uses native inheritance.
   */
  private async prepareSelection(caller: Agent, request: SpawnTeammateRequest): Promise<PreparedSpawnRequest> {
    const header = caller.session.requestHeader()?.config
    const decision = decideTeamSelection(request.agentOptions, callerRoute({
      options: caller.options,
      requestHeader: header === undefined ? undefined : {
        provider: header.provider,
        model: header.model,
        ...header.reasoningEffort === undefined ? {} : { reasoningEffort: header.reasoningEffort },
      },
    }), this.selection.enhanced)
    if (decision.kind === 'reject') throw new TeamError(decision.message, decision.code)
    if (decision.kind === 'omit') {
      const { agentOptions: _omitted, ...rest } = request
      return rest
    }
    const signal = AbortSignal.any([request.signal, this.lifecycle.signal])
    signal.throwIfAborted()
    await this.selection.resolveCallConfig(decision.call, signal, caller)
    signal.throwIfAborted()
    if (this.lifecycle.disposed) throw new TeamError('Agent Teams service is disposing', 'TEAM_DISPOSED')
    return { ...request, agentOptions: decision.pass }
  }

  /**
   * Reconcile provisioning state when one Team member Session starts.
   * @param agent - newly started exact live Agent.
   * @param signal - shared runtime cancellation.
   */
  async recoverFor(agent: Agent, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted()
    const membership = this.tryMembership(agent)
    if (membership?.role === 'lead') await this.reconcileProvisioning(membership.root, signal)
  }

  /**
   * Interrupt one live teammate turn without clearing its pending inbox.
   * @param caller - exact live Lead Agent.
   * @param targetName - durable teammate name.
   * @returns the target status sampled before cancellation.
   */
  interrupt(caller: Agent, targetName: string): { previousStatus: 'running' | 'inactive' } {
    const membership = this.membership(caller)
    if (membership.role !== 'lead') throw new TeamError('only the Team Lead can interrupt teammates', 'TEAM_LEAD_REQUIRED')
    const state = this.journal.state(membership.root)
    const target = resolveActiveMember(membership.root, state, targetName)
    if (target.id === membership.root.id) throw new TeamError('the Team Lead cannot interrupt itself', 'TEAM_INVALID_TARGET')
    const live = this.ctx.agents.get(target.id)
    if (live === undefined) return { previousStatus: 'inactive' }
    const previousStatus = availability(live)
    this.ctx.subagents.interrupt(target.id, { kind: 'ancestor', agent: caller })
    return { previousStatus }
  }

  /**
   * Group exact live roster children by their current Lead for runtime teardown.
   * @returns each live Lead and the roster child ids currently in the Agent registry.
   */
  liveChildrenByRoot(): Map<Agent, SessionId[]> {
    const teams = new Map<Agent, SessionId[]>()
    for (const agent of this.ctx.agents.list()) {
      const rootId = agent.session.header.parentSession
      if (rootId === undefined) continue
      const root = this.ctx.agents.get(rootId)
      if (root === undefined
        || !this.journal.state(root).members.some(member => member.id === agent.id && (member.phase === 'active' || member.phase === 'provisioning'))) continue
      const children = teams.get(root) ?? []
      children.push(agent.id)
      teams.set(root, children)
    }
    return teams
  }

  /**
   * Release exact teammate Activations through the continuation lifecycle owner.
   * @param root - exact live Team Lead authorizing release.
   * @param childIds - selected roster child ids.
   */
  async stopTeammates(root: Agent, childIds: readonly SessionId[]): Promise<void> {
    await this.lifecycle.withTimeout(this.ctx.subagents.drainChildren(root, childIds))
  }

  /** Perform one creation admitted before the Team runtime disposal cutoff. */
  private async spawnAdmitted(
    caller: Agent,
    request: PreparedSpawnRequest,
  ): Promise<SpawnTeammateResult> {
    const membership = this.membership(caller)
    if (membership.role !== 'lead') {
      throw new TeamError('only the Team Lead can create teammates', 'TEAM_LEAD_REQUIRED')
    }
    const signal = AbortSignal.any([request.signal, this.lifecycle.signal])
    signal.throwIfAborted()
    const root = membership.root
    const name = this.memberName(request.name)
    const description = requiredText(request.description, 'description', 200)
    const childId = brandString<SessionId>(randomUUID())
    const member: TeamMemberSnapshot = {
      id: childId,
      name,
      description,
      provider: requiredText(request.provider, 'provider', 200),
      context: request.context,
      phase: 'provisioning',
    }

    await this.journal.transact(root.id, async () => {
      const state = this.journal.state(root)
      if (state.members.some(member => member.name === name)) {
        throw new TeamError(`teammate name "${name}" was already used in this Team`, 'TEAM_MEMBER_NAME_TAKEN')
      }
      if (state.members.length >= this.maxMembers) {
        throw new TeamError(`Team member limit ${this.maxMembers} reached`, 'TEAM_MEMBER_LIMIT')
      }
      await this.journal.appendAndFlush(root, 'team/member', { version: 2, teamId: TeamId(root.id), member })
    })

    try {
      const started = await this.ctx.subagents.startActivation({
        delivery: 'parent',
        childId,
        provider: request.provider,
        label: description,
        request: {
          prompt: request.prompt,
          parent: root,
          ...request.agentOptions === undefined ? {} : { agentOptions: toAgentOptions(request.agentOptions) },
        },
        signal,
      })
      await this.checkpointInitialPrompt(childId, started.messageId, signal)
    } catch (error: unknown) {
      const failed: TeamMemberSnapshot = {
        ...member,
        phase: 'failed',
        error: errorMessage(error),
      }
      try {
        const phase = await this.settleProvisioning(root, failed)
        await this.stopTeammates(root, [childId])
        if (phase === 'active') {
          throw new TeamError(
            `teammate "${name}" became active while its creator reported failure`,
            'TEAM_PROVISIONING_CONFLICT',
            { cause: error },
          )
        }
      } catch (recordError: unknown) {
        throw new AggregateError([error, recordError], 'teammate creation and durable failure recording both failed')
      }
      throw error
    }
    const active = {
      ...member,
      phase: 'active' as const,
    } satisfies TeamMemberSnapshot
    // Once the continuation accepted its first prompt, it is a real child. If
    // this checkpoint fails, keep the in-memory active edge instead of inventing
    // an impossible active -> failed transition; restart reconciliation covers
    // the provisioning-only durable prefix.
    const settledPhase = await this.settleProvisioning(root, active)
    if (settledPhase === 'failed') {
      const conflict = new TeamError(
        `teammate "${name}" was reconciled as failed while creation was in progress`,
        'TEAM_PROVISIONING_CONFLICT',
      )
      try {
        await this.stopTeammates(root, [childId])
      } catch (cleanupError: unknown) {
        /* v8 ignore next -- requires the independently tested HMR settlement conflict and cleanup failure together. */
        throw new AggregateError([conflict, cleanupError], 'provisioning conflict cleanup failed')
      }
      throw conflict
    }
    return { member: this.memberView(active) }
  }

  /** Flush the accepted initial inbox item before the Lead can commit `active`. */
  private async checkpointInitialPrompt(
    childId: SessionId,
    messageId: MessageId,
    signal: AbortSignal,
  ): Promise<void> {
    while (true) {
      signal.throwIfAborted()
      const session = this.ctx.sessions.get(childId)
      if (session === undefined) {
        const stored = await readPersistedSession(this.ctx.sessionPersistence, childId, signal)
        const suffix = stored.events.slice(stored.inheritedEventCount)
        if (messageAccepted(suffix, message => message.id === messageId)) return
        throw new TeamError(
          `teammate "${childId}" initial prompt was not durably accepted`,
          'TEAM_PROVISIONING_CONFLICT',
        )
      }

      const progress = Promise.withResolvers<void>()
      // Abort can win while the durability flush is still pending; mark the
      // later-awaited rejection handled without changing its eventual result.
      void progress.promise.catch(() => undefined)
      const stopEvent = this.ctx.on('session/event', (candidate) => {
        if (candidate === session) progress.resolve()
      })
      const stopDisposed = this.ctx.on('session/disposed', (candidate) => {
        if (candidate === session) progress.resolve()
      })
      const onAbort = (): void => {
        const reason: unknown = signal.reason
        progress.reject(reason instanceof Error
          ? reason
          : new TeamError(`teammate creation aborted: ${errorMessage(reason)}`, 'TEAM_DISPOSED'))
      }
      signal.addEventListener('abort', onAbort, { once: true })
      try {
        signal.throwIfAborted()
        await this.ctx.sessions.flush(session)
        // oxlint-disable-next-line typescript/no-deprecated -- Existing Session history read; migration deferred.
        const suffix = session.snapshotEvents(session.inheritedEventCount)
        if (messageAccepted(suffix, message => message.id === messageId)) return
        if (this.ctx.sessions.get(childId) !== session) continue
        await progress.promise
      } finally {
        signal.removeEventListener('abort', onAbort)
        stopDisposed()
        stopEvent()
      }
    }
  }

  /** Settle provisioning-only members from their independently durable child Sessions. */
  private async reconcileProvisioning(root: Agent, signal: AbortSignal): Promise<void> {
    const provisioning = this.journal.state(root).members.filter(member => member.phase === 'provisioning')
    for (const member of provisioning) {
      signal.throwIfAborted()
      // A live child means creation is still completing in this process. Its
      // creator owns the terminal member edge.
      if (this.ctx.agents.get(member.id) !== undefined) continue
      let phase: 'active' | 'failed' = 'failed'
      let failure = 'provisioning did not leave a resumable child Session'
      try {
        const loaded = await readPersistedSession(this.ctx.sessionPersistence, member.id, signal)
        const suffix = loaded.events.slice(loaded.inheritedEventCount)
        const descriptor = foldSubagentDescriptor(suffix)
        const acceptedInitialPrompt = messageAccepted(suffix, message => message.source.kind === 'user')
        if (loaded.header.parentSession === root.id
          && descriptor?.mode === 'continuable'
          && descriptor.provider === member.provider
          && acceptedInitialPrompt) {
          phase = 'active'
        } else {
          failure = 'persisted child Session does not match the provisioned continuation'
        }
      } catch (error: unknown) {
        failure = `child Session recovery failed: ${errorMessage(error)}`
      }
      signal.throwIfAborted()
      await this.journal.transact(root.id, async () => {
        signal.throwIfAborted()
        const current = this.journal.state(root).members.find(candidate => candidate.id === member.id)
        if (current?.phase !== 'provisioning') return
        const settled: TeamMemberSnapshot = {
          ...current,
          phase,
          ...phase === 'failed' ? { error: failure } : {},
        }
        await this.journal.appendAndFlush(root, 'team/member', {
          version: 2,
          teamId: TeamId(root.id),
          member: settled,
        })
      })
    }
  }

  /** Build one runtime member row after successful creation. */
  private memberView(member: TeamMemberSnapshot & { readonly phase: 'active' }): TeamMemberView {
    const live = this.ctx.agents.get(member.id)
    return {
      id: member.id,
      name: member.name,
      role: 'teammate',
      status: availability(live),
      description: member.description,
      provider: member.provider,
      context: member.context,
      ...live?.options.model === undefined ? {} : { model: live.options.model },
      diagnostics: [],
    }
  }

  /** Validate a never-reused model-facing teammate name. */
  private memberName(value: string): string {
    if (!MEMBER_NAME.test(value) || value.length > 64 || value === 'lead') {
      throw new TeamError(
        'teammate name must be lower-kebab-case, at most 64 characters, and not "lead"',
        'TEAM_INVALID_MEMBER_NAME',
      )
    }
    return value
  }

  /** Append one terminal provisioning edge unless recovery already settled it. */
  private async settleProvisioning(
    root: Agent,
    terminal: TeamMemberSnapshot,
  ): Promise<'active' | 'failed'> {
    return this.journal.transact(root.id, async () => {
      const current = this.journal.state(root).members.find(member => member.id === terminal.id)
      /* v8 ignore next 3 -- the append-only provisioning event is committed by this operation before settlement. */
      if (current === undefined) {
        throw new TeamError(`provisioned teammate "${terminal.id}" disappeared`, 'TEAM_PROVISIONING_CONFLICT')
      }
      if (current.phase === 'active' || current.phase === 'failed') return current.phase
      if (current.phase === 'departed') throw new TeamError('provisioning teammate departed before settlement', 'TEAM_PROVISIONING_CONFLICT')
      await this.journal.appendAndFlush(root, 'team/member', {
        version: 2,
        teamId: TeamId(root.id),
        member: terminal,
      })
      return terminal.phase === 'active' ? 'active' : 'failed'
    })
  }

  /** Whether a Session's own suffix identifies a provider-owned subagent child. */
  private subagentDescriptor(agent: Agent): boolean {
    // oxlint-disable-next-line typescript/no-deprecated -- Existing Session history read; migration deferred.
    return foldSubagentDescriptor(agent.session.snapshotEvents(agent.session.inheritedEventCount)) !== undefined
  }
}

/** Turn availability is independent of whether the Agent is loaded. */
function availability(agent: Agent | undefined): 'running' | 'inactive' {
  return agent?.status === 'running' ? 'running' : 'inactive'
}
