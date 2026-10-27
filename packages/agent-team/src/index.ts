/** Agent Teams service façade over roster, messaging, task, and runtime lifecycle owners. */

import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-session-persistence'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { brandString } from '@deepseek-ai/dsh-brand'
import { createUserMessage, ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import type { MessageId } from '@deepseek-ai/dsh-llm'
import { TeamActivity } from './activity.ts'
import { errorMessage, TeamError } from './error.ts'
import { assertModelRouteAllowed, readCurrentModelSource, requireAssemblySnapshot, resolveTeamFlags } from '@dsh-native-collab/subagent'
import { hostDeliverPrompt, modelDeliverySelectionEnabled } from './host-delivery.ts'
import { decideDelivery } from './selection.ts'
import { TeamJournal } from './journal.ts'
import { TeamRuntimeLifecycle } from './lifecycle.ts'
import { teamMemberOwnModelProjection } from './own-model-projection.ts'
import { teamProjectionDefinition } from './projection.ts'
import { resolveActiveMember, TeamRoster } from './roster.ts'
import type { TeamSelectionPort } from './roster.ts'
import type { TeamMembership } from './roster.ts'
import { TeamTaskBoard } from './task-board.ts'
import { TeamId, TeamTaskId } from './types.ts'
import type {
  Config,
  CreateTeamTaskRequest,
  SendTeamMessageRequest,
  SendTeamMessageResult,
  SpawnTeammateRequest,
  SpawnTeammateResult,
  TeamMemberView,
  TeamTaskView,
  TeamWaitResult,
  UpdateTeamTaskRequest,
} from './types.ts'

export type * from './types.ts'
export type { TeamMembership } from './roster.ts'
export { TeamId, TeamMessageId, TeamTaskId } from './types.ts'
export { TeamError } from './error.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    agentTeams: TeamService
  }
}

const DEFAULT_MAX_MEMBERS = 16
const DEFAULT_MAX_TASKS = 256
const DEFAULT_MAX_MESSAGE_BYTES = 65_536
const DEFAULT_DISPOSAL_TIMEOUT_MS = 5_000
/** Validate one positive safe-integer deployment limit. */
function positiveLimit(name: string, value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TeamError(`${name} must be a positive safe integer`, 'TEAM_INVALID_CONFIG')
  }
  return value
}

/** Call the public llm service only after a structural capability check. */
function selectionPort(ctx: Context, enhanced: boolean): TeamSelectionPort {
  return {
    enhanced,
    resolveCallConfig(config, signal, caller) {
      const source = readCurrentModelSource(ctx)
      if (source === undefined) throw new TeamError('collabUi model-source service is unavailable', 'TEAM_LLM_UNAVAILABLE')
      const settingsService = source === 'settings' ? ctx.get('subagentModelSelection') : undefined
      if (source === 'settings' && settingsService === undefined) throw new TeamError('subagentModelSelection service is unavailable', 'TEAM_LLM_UNAVAILABLE')
      const current = settingsService?.current()
      const projections = source === 'conversation'
        ? ctx.get('sessionProjections') as { stateOf?: (session: object, key: string) => unknown } | undefined
        : undefined
      const policy = projections?.stateOf?.(caller.session, 'subagentModelSelectionPolicy')
      const runtimeForPolicy = ctx.get('llm')
      try {
        assertModelRouteAllowed(
          source,
          { provider: config.provider, model: config.model },
          Array.isArray(policy) ? policy as { provider: string; model: string }[] : undefined,
          current,
          source === 'all' && runtimeForPolicy !== undefined ? runtimeForPolicy.listProviders().map(provider => provider.id) : undefined,
        )
      } catch (error) {
        throw new TeamError(error instanceof Error ? error.message : 'child route is not authorized', 'TEAM_AGENT_OPTIONS_INCOMPLETE', { cause: error })
      }
      const runtime: unknown = ctx.get('llm')
      if (runtime === null || typeof runtime !== 'object' || !('resolveCallConfig' in runtime)) {
        throw new TeamError('llm.resolveCallConfig is unavailable', 'TEAM_LLM_UNAVAILABLE')
      }
      const resolve = runtime.resolveCallConfig
      if (typeof resolve !== 'function') {
        throw new TeamError('llm.resolveCallConfig is unavailable', 'TEAM_LLM_UNAVAILABLE')
      }
      return resolve.call(runtime, {
        provider: config.provider,
        model: config.model,
        ...config.reasoningEffort === undefined ? {} : { reasoningEffort: ReasoningEffortId(config.reasoningEffort) },
      }, signal)
    },
  }
}

/** Agent Teams service backed by the exact live Lead Session log. */
export class TeamService extends Service {
  static inject = ['agents', 'sessions', 'sessionPersistence', 'sessionProjections', 'subagents', 'collabUi']

  static Config: z<Config> = z.object({
    maxMembers: z.number().step(1).min(1).default(DEFAULT_MAX_MEMBERS),
    maxTasks: z.number().step(1).min(1).default(DEFAULT_MAX_TASKS),
    maxMessageBytes: z.number().step(1).min(1).default(DEFAULT_MAX_MESSAGE_BYTES),
    disposalTimeoutMs: z.number().step(1).min(1).default(DEFAULT_DISPOSAL_TIMEOUT_MS),
    maxLogicalRequests: z.number().step(1).min(1).description('Deprecated compatibility option; no request counting or cancellation is performed.'),
    enhancedSelection: z.boolean().default(true),
  })

  /** Validated deployment limits used by every Team operation. */
  private readonly config: Required<Omit<Config, 'maxLogicalRequests'>>

  /** Whether Team spawn enhancement parameters are accepted. */
  readonly selectionEnhanced: boolean

  /** Whether Team send_message delivery parameters are accepted. */
  readonly communicationEnhanced: boolean

  private readonly activity: TeamActivity
  private readonly lifecycle: TeamRuntimeLifecycle
  private readonly journal: TeamJournal
  private readonly roster: TeamRoster
  private readonly tasks: TeamTaskBoard

  constructor(ctx: Context, config: Config = {}) {
    const snapshot = requireAssemblySnapshot(ctx)
    super(ctx, 'agentTeams')
    this.config = {
      maxMembers: positiveLimit('maxMembers', config.maxMembers ?? DEFAULT_MAX_MEMBERS),
      maxTasks: positiveLimit('maxTasks', config.maxTasks ?? DEFAULT_MAX_TASKS),
      maxMessageBytes: positiveLimit('maxMessageBytes', config.maxMessageBytes ?? DEFAULT_MAX_MESSAGE_BYTES),
      disposalTimeoutMs: positiveLimit(
        'disposalTimeoutMs',
        config.disposalTimeoutMs ?? DEFAULT_DISPOSAL_TIMEOUT_MS,
      ),
      enhancedSelection: config.enhancedSelection ?? true,
    }
    const flags = resolveTeamFlags(this.config.enhancedSelection, snapshot)
    this.selectionEnhanced = flags.selectionEnhanced
    this.communicationEnhanced = flags.communicationEnhanced

    this.activity = new TeamActivity()
    this.lifecycle = new TeamRuntimeLifecycle(this.config.disposalTimeoutMs)
    this.journal = new TeamJournal(ctx, (root) => { this.activity.notify(TeamId(root.id)) })
    this.roster = new TeamRoster(
      ctx,
      this.journal,
      this.lifecycle,
      this.config.maxMembers,
      selectionPort(ctx, this.selectionEnhanced),
    )
    this.tasks = new TeamTaskBoard(this.journal, this.config.maxTasks)

    ctx.on('agent/created', ({ agent }) => { this.scheduleRecovery(agent); return undefined })
    ctx.on('agent/status', ({ agent }) => {
      const membership = this.roster.tryMembership(agent)
      if (membership !== undefined) this.activity.notify(membership.id)
    })
    ctx.effect(() => {
      const disposeProjection = ctx.root.sessionProjections.register(teamProjectionDefinition)
      const disposeOwnModel = ctx.root.sessionProjections.register(teamMemberOwnModelProjection)
      return async () => {
        try {
          await this.disposeRuntime()
        } finally {
          disposeProjection()
          disposeOwnModel()
        }
      }
    }, 'agentTeams.runtimeLifecycle()')
  }

  /** Reconcile any Team continuations already live when the service is installed. */
  protected async [Service.init](): Promise<void> {
    for (const agent of this.ctx.agents.list()) this.scheduleRecovery(agent)
  }

  /**
   * Resolve one exact live Agent's Team role.
   * @param agent - exact live Agent used as the authority credential.
   * @returns its root, Team identity, role, and model-facing name.
   */
  membership(agent: Agent): TeamMembership {
    return this.roster.membership(agent)
  }

  /**
   * List the runtime-enriched roster visible to one Team member.
   * @param agent - exact live Team member.
   * @returns Lead and teammate rows in creation order.
   */
  listMembers(agent: Agent): TeamMemberView[] {
    return this.roster.list(this.roster.membership(agent))
  }

  /**
   * Create one named, continuable direct child of the Team Lead.
   * @param caller - exact live Lead Agent.
   * @param request - immutable name, description, prompt, context mode, provider, and cancellation.
   * @returns the active roster row.
   */
  async spawnTeammate(caller: Agent, request: SpawnTeammateRequest): Promise<SpawnTeammateResult> {
    return await this.roster.spawn(caller, request)
  }

  /**
   * Steer one peer message into the target inbox or reject the attempt.
   * @param caller - exact live sending Team member.
   * @param request - target name, content, and cancellation before acceptance.
   * @returns accepted inbox identity; acceptance follows normal Agent persistence and does not await model processing.
   */
  async sendMessage(caller: Agent, request: SendTeamMessageRequest): Promise<SendTeamMessageResult> {
    if (this.lifecycle.disposed) throw new TeamError('Agent Teams service is disposing', 'TEAM_DISPOSED')
    const delivery = decideDelivery(request.delivery, this.communicationEnhanced)
    if (delivery.kind === 'reject') throw new TeamError(delivery.message, delivery.code)
    if (delivery.delivery === 'queue' && !modelDeliverySelectionEnabled(this.ctx.get('subagents'))) {
      throw new TeamError(
        'delivery selection is disabled; queue was rejected',
        'TEAM_DELIVERY_DISABLED',
      )
    }
    return await this.lifecycle.track(this.sendAdmitted(caller, {
      ...request,
      delivery: delivery.delivery,
      signal: AbortSignal.any([request.signal, this.lifecycle.signal]),
    }))
  }

  /**
   * Create one unowned pending task in the Team Lead log.
   * @param caller - exact live Team member creating the task.
   * @param request - task text, blockers, and advisory write scopes.
   * @returns the revision-one task view.
   */
  async createTask(caller: Agent, request: CreateTeamTaskRequest): Promise<TeamTaskView> {
    return await this.tasks.create(this.roster.membership(caller), request)
  }

  /**
   * Return one task, including a deleted tombstone.
   * @param caller - exact live Team member reading the task.
   * @param id - Team-local task identity.
   * @returns the latest task value and derived readiness diagnostics.
   */
  getTask(caller: Agent, id: TeamTaskId): TeamTaskView {
    return this.tasks.get(this.roster.membership(caller), id)
  }

  /**
   * List current non-deleted tasks in numeric creation order.
   * @param caller - exact live Team member reading the board.
   * @returns detached current task views.
   */
  listTasks(caller: Agent): TeamTaskView[] {
    return this.tasks.list(this.roster.membership(caller))
  }

  /**
   * Compare-and-set one authorized task transition.
   * @param caller - exact live Team member authorizing the mutation.
   * @param request - task identity, expected revision, action, and action fields.
   * @returns the committed next task revision.
   */
  async updateTask(caller: Agent, request: UpdateTeamTaskRequest): Promise<TeamTaskView> {
    return await this.tasks.update(caller, this.roster.membership(caller), request)
  }

  /**
   * Wait for the next Team-domain or member-status change.
   * @param caller - exact live Team member waiting for activity.
   * @param timeoutMs - bounded wait duration from ten seconds through one hour.
   * @param signal - caller cancellation for the wait only.
   * @returns one observed change or a timeout result.
   */
  async waitForChange(caller: Agent, timeoutMs: number, signal: AbortSignal): Promise<TeamWaitResult> {
    const membership = this.roster.membership(caller)
    return await this.activity.wait(membership.id, timeoutMs, signal)
  }

  /**
   * Interrupt one live teammate turn without clearing its pending inbox.
   * @param caller - exact live Lead Agent.
   * @param targetName - durable teammate name.
   * @returns the target status sampled before cancellation.
   */
  interrupt(caller: Agent, targetName: string): { previousStatus: 'running' | 'inactive' } {
    return this.roster.interrupt(caller, targetName)
  }

  /**
   * Resolve a caller without throwing, used by scoped-tool installation and observers.
   * @param agent - candidate exact live Agent.
   * @returns Team membership, or undefined for non-Team subagents and stale identities.
   */
  tryMembership(agent: Agent): TeamMembership | undefined {
    return this.roster.tryMembership(agent)
  }

  /** Deliver an admitted send using the Lead's authority and the actual sender's identity. */
  private async sendAdmitted(caller: Agent, request: SendTeamMessageRequest): Promise<SendTeamMessageResult> {
    const membership = this.roster.membership(caller)
    request.signal.throwIfAborted()
    const { root } = membership
    const target = resolveActiveMember(root, this.journal.state(root), request.target)
    if (target.id === caller.id) throw new TeamError('a Team member cannot message itself', 'TEAM_SELF_MESSAGE')
    const taskResult = request.taskResult === true
    if (taskResult && (membership.role === 'lead' || target.id !== root.id)) {
      throw new TeamError('taskResult is reserved for teammate completion reports to the Team Lead', 'TEAM_TASK_RESULT_UNAUTHORIZED')
    }
    const content = [
      { type: 'text' as const, text: `Team message from ${membership.name}:` },
      ...structuredClone(request.content),
    ]
    if (Buffer.byteLength(JSON.stringify(content), 'utf8') > this.config.maxMessageBytes) {
      throw new TeamError(`team message exceeds ${this.config.maxMessageBytes} bytes`, 'TEAM_MESSAGE_TOO_LARGE')
    }
    const source = { kind: 'agent-message' as const, form: 'relay' as const, senderSessionId: caller.id }
    const delivery = request.delivery ?? 'steer'
    type AutomaticReservation = { commit(): void; refund(): void }
    type AutomaticReservationApi = {
      reserveAutomaticInteraction(sender: Agent, targetId: SessionId): AutomaticReservation
    }
    const automaticApi = this.ctx.subagents as unknown as Partial<AutomaticReservationApi>
    const reservation = taskResult ? undefined : automaticApi.reserveAutomaticInteraction?.call(this.ctx.subagents, caller, target.id)
    if (!taskResult && reservation === undefined) {
      throw new TeamError('automatic interaction reservation is unavailable', 'TEAM_AUTOMATIC_INTERACTION_UNAVAILABLE')
    }
    let messageId: MessageId
    try {
      if (target.id === root.id) {
        const input = createUserMessage({ content, source })
        if (delivery === 'queue') root.followup(input)
        else root.steer(input)
        messageId = input.id
      } else {
        const deliver = hostDeliverPrompt(this.ctx.subagents)
        if (deliver === undefined) {
          throw new TeamError(
            'replacement subagent runtime has no host delivery adapter',
            'TEAM_HOST_DELIVERY_UNAVAILABLE',
          )
        }
        const delivered: unknown = await deliver.call(
          this.ctx.subagents,
          root,
          target.id,
          content,
          source,
          request.signal,
          delivery,
        )
        if (typeof delivered !== 'string') {
          throw new TeamError('host delivery did not return a message id', 'TEAM_HOST_DELIVERY_UNAVAILABLE')
        }
        messageId = brandString<MessageId>(delivered)
      }
      reservation?.commit()
    } catch (error: unknown) {
      reservation?.refund()
      throw error
    }
    this.activity.notify(membership.id)
    return { messageId }
  }

  /** Queue one contained provisioning reconciliation after publication has unwound. */
  private scheduleRecovery(agent: Agent): void {
    queueMicrotask(() => {
      if (this.lifecycle.disposed) return
      void this.roster.recoverFor(agent, this.lifecycle.signal).catch((error: unknown) => {
        if (this.lifecycle.disposed) return
        this.ctx.logger.warn(`Agent Teams recovery for "${agent.id}" failed: ${errorMessage(error)}`)
      })
    })
  }

  /** Stop Team-owned live branches and release every waiter before service disposal completes. */
  private async disposeRuntime(): Promise<void> {
    this.lifecycle.close()
    this.activity.close()

    const failures: unknown[] = []
    await this.lifecycle.settle(this.lifecycle.pending(), failures)
    for (const [root, childIds] of this.roster.liveChildrenByRoot()) {
      try {
        await this.roster.stopTeammates(root, childIds)
      } catch (error: unknown) {
        failures.push(error)
      }
    }
    if (failures.length > 0) throw new AggregateError(failures, 'Agent Teams runtime disposal failed')
  }
}

export default TeamService
