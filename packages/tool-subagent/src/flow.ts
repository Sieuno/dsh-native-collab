/**
 * Derived delegation apply.
 * Tool schema, provider lifecycle, preset checks, and startActivation forwarding
 * follow DeepSeek Harness dsh-v0.2.1-rc.2 packages/subagent/tool-subagent (MIT).
 * Derived differences: compatibility ON uses the native Session snapshot; OFF reads
 * the live Host allowlist. An explicit model-enhancement overlay off stays native,
 * not none. Fork remains none.
 *
 * @module @dsh-native-collab/tool-subagent
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { scopeChainOf, scopeOf } from '@deepseek-ai/dsh-scope'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import type { Agent, AgentOptions } from '@deepseek-ai/dsh-agent'
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import { SessionSeq } from '@deepseek-ai/dsh-session'
import type { Session } from '@deepseek-ai/dsh-session'
import { requireAssemblySnapshot, resolveOrdinarySelectionKind } from '@dsh-native-collab/subagent'
import {
  assertSubagentMaxDepth,
  delegationDepthOf,
  parentAgentOptionsForDelegation,
} from '@deepseek-ai/dsh-subagent'
import type { SubagentProvider } from '@deepseek-ai/dsh-subagent'
import {
  assertAllowedModelSelection,
  hasConfiguredLlmSelection,
  hasDelegationModelRequest,
  preflightChildLlmRoute,
  requestedAgentOptions,
} from './model-selection.ts'
import type { DelegationModelRequest, ModelSelectionPolicy } from './model-selection.ts'
import { registerListSubagentModels } from './list-models.ts'
import { registerLiveListSubagentModels } from './live-list.ts'
import { SubagentPresetSelection, type PresetSelectionConfig, type PresetSelectionRequest } from './preset-selection.ts'
import {
  recordSubagentModelSelection,
  subagentModelSelectionProjectionDefinition,
  subagentModelSelectionPolicy,
} from './model-selection-state.ts'

const delegationTools = new Set<ToolDefinition>()

export interface DerivedConfig extends PresetSelectionConfig {
  /** Subagent execution backend. This is not the child LLM provider. */
  provider: string
  /** Model-facing tool name. Fresh defaults to `subagent`; fork defaults to `subagent_fork`. */
  toolName?: string
  /**
   * When true, keep the native Session policy snapshot.
   * Read at apply. A later edit applies on Host reassembly, not through a watcher.
   */
  nativeModelSelectionCompatibility?: boolean
  /** Fresh owns discovery. Fork must pass false. */
  ownsDiscovery?: boolean
  /** Agent options applied to every child. Omitted fields use child-loop defaults. */
  agentOptions?: AgentOptions
  /** Numeric cap, or `provider-managed` to send no cap. Omission reads the Host depth setting. */
  maxDepth?: number | 'provider-managed'
}

/** Loader schema. `ownsDiscovery` is set by the entry, not by cordis.yml. */
export function configSchema(toolNameDefault: string): z<DerivedConfig> {
  return z.object({
    provider: z.string().default('subagent'),
    toolName: z.string().default(toolNameDefault),
    nativeModelSelectionCompatibility: z.boolean().default(false),
    agentOptions: z.object({
      provider: z.string(),
      model: z.string(),
      reasoningEffort: z.string().min(1) as z<ReturnType<typeof ReasoningEffortId>>,
      maxTokens: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER),
    }).default(undefined as unknown as {
      provider: string
      model: string
      reasoningEffort: ReturnType<typeof ReasoningEffortId>
      maxTokens: number
    }),
    agentPreset: z.string().min(1),
    allowedAgentPresets: (z.array(z.string().min(1)).min(1) as z<string[] | undefined>).default(undefined),
    maxDepth: z.union([z.natural().max(Number.MAX_SAFE_INTEGER), z.const('provider-managed' as const)]),
  })
}

type SelectionBinding =
  | { readonly kind: 'native', readonly policy: ModelSelectionPolicy | undefined }
  | { readonly kind: 'live' }
  | { readonly kind: 'none' }

function providerWording(inheritsConversation: boolean): { description: string, promptDescription: string } {
  if (inheritsConversation) {
    return {
      description:
        'Delegate a task to a subagent that inherits this conversation: a child agent seeded with all '
        + 'completed turns so far (it does not see the current in-flight turn). Use this when the subtask '
        + 'builds on this conversation\'s context — a follow-up analysis, '
        + 'a review, a continuation — without consuming this conversation\'s context for the work itself. '
        + 'You receive its result, not its intermediate steps.',
      promptDescription:
        'The task for the subagent. It already sees this conversation\'s completed turns, so build on them '
        + 'freely and state only what is new.',
    }
  }
  return {
    description:
      'Delegate a self-contained task to a subagent (a separate agent that works in its own context) '
      + 'to offload focused, independent work — research, a scoped '
      + 'implementation, an analysis — so it does not consume this conversation\'s context. The subagent '
      + 'returns its result, not its intermediate steps.',
    promptDescription:
      'The complete, self-contained task for the subagent. It does not share this '
      + 'conversation\'s context, so include everything it needs.',
  }
}

/**
 * Install one derived delegation composition.
 * A missing Session does not skip registration: unscoped live apply installs on the caller,
 * and a scoped standing apply installs into each composed Agent.
 * @param ctx - Context that owns the registrations.
 * @param config - Delegation configuration. `ownsDiscovery` false is the fork entry.
 * @param session - Unpublished Session from a direct Agent setup. Omit for a standing composition.
 */
export async function applyDerivedDelegation(ctx: Context, config: DerivedConfig, session?: Session): Promise<void> {
  for (const field of ['persona', 'toolFilter']) {
    if (Object.hasOwn(config, field)) {
      throw new Error(`tool-subagent: ${field} is no longer supported; configure persona and tool plugins in an Agent Preset and select it with agentPreset (spawn only)`)
    }
  }
  const presets = new SubagentPresetSelection(config)
  if (presets.configured && ctx.get('agentPresets') === undefined) {
    throw new Error('tool-subagent: agent preset selection requires the agent-presets service')
  }
  if (config.maxDepth !== 'provider-managed') assertSubagentMaxDepth(config.maxDepth)
  const toolName = config.toolName ?? 'subagent'
  const kind: SelectionBinding['kind'] = resolveOrdinarySelectionKind(
    config.ownsDiscovery,
    config.nativeModelSelectionCompatibility,
    requireAssemblySnapshot(ctx),
  )
  const selectionCapable = kind !== 'none'
  ctx.sessionProjections.register(subagentModelSelectionProjectionDefinition)

  const assertSubagentProviderConfiguration = (subagentProvider: SubagentProvider): void => {
    presets.assertProvider(subagentProvider)
    if (ctx.subagents.resolveMaxDepth(config.maxDepth) !== undefined && !subagentProvider.capabilities.depthLimit) {
      throw new Error(
        `tool-subagent: provider "${subagentProvider.name}" cannot enforce maxDepth (no depthLimit capability) — `
        + 'set maxDepth: \'provider-managed\' to leave the recursion budget to the provider',
      )
    }
    if (config.agentOptions !== undefined && !subagentProvider.capabilities.agentOptions) {
      throw new Error(`tool-subagent: provider "${subagentProvider.name}" does not support child agentOptions`)
    }
    if (selectionCapable && !subagentProvider.capabilities.agentOptions) {
      throw new Error(`tool-subagent: provider "${subagentProvider.name}" does not support child model selection`)
    }
  }

  ctx.on('subagent/provider-added', (subagentProvider) => {
    if (subagentProvider.name === config.provider) assertSubagentProviderConfiguration(subagentProvider)
  })
  const initialProvider = ctx.subagents.getProvider(config.provider)
  if (initialProvider !== undefined) assertSubagentProviderConfiguration(initialProvider)

  const install = (runtimeCtx: Context, binding: SelectionBinding): void => {
    const modelSelectionEnabled = binding.kind === 'live' || (binding.kind === 'native' && binding.policy !== undefined)
    if (binding.kind === 'native' && binding.policy !== undefined) registerListSubagentModels(runtimeCtx, binding.policy)
    if (binding.kind === 'live') registerLiveListSubagentModels(runtimeCtx)
    let mounted: { subagentProvider: SubagentProvider, definition: ToolDefinition, disposeTool: () => void } | undefined
    const mount = (subagentProvider: SubagentProvider): void => {
      assertSubagentProviderConfiguration(subagentProvider)
      const wording = providerWording(subagentProvider.inheritsParentContext)
      const providerRouteDefaults = subagentProvider.agentRouteDefaults
      const selectionDescription = providerRouteDefaults !== undefined
        ? ' Child LLM selection is optional. Omit `provider`, `model`, and `reasoning_effort` to use configured child defaults and this provider\'s route defaults. Supply `provider` and `model` together after using `list_subagent_models` to inspect advertised routes and efforts. Changing the effective route without naming an effort uses the selected model\'s default effort.'
        : ' Child LLM selection is optional. Omit `provider`, `model`, and `reasoning_effort` to use configured child defaults and inherit compatible missing values from the parent Agent. Supply `provider` and `model` together after using `list_subagent_models` to inspect advertised routes and efforts. Changing the effective route without naming an effort uses the selected model\'s default effort.'
      const choiceDescription = !modelSelectionEnabled
        ? ''
        : selectionDescription
          + (subagentProvider.inheritsParentContext
            ? ' Changing the route can prevent provider-side reuse of the inherited conversation prefix.'
            : '')
      const definition = defineTool({
        name: toolName,
        description: wording.description
          + ' This tool starts an independently managed subagent and immediately returns its id. The runtime notifies you when it finishes.'
          + (subagentProvider.prepareContinuable !== undefined
            ? ' The child reports results with `send_message`; use `send_message` to steer it while running or continue its conversation after it finishes.'
            : ' The completion notice includes its final answer. This backend does not accept follow-up messages.')
          + choiceDescription,
        parameters: {
          cwd: {
            type: 'string',
            description: 'Initial child working directory. Relative paths use your current directory; omitted inherits it. Later directory changes in either agent are independent.',
          },
          description: {
            type: 'string',
            required: true,
            description: 'A short (3-5 word) description of the delegated task, for display.',
          },
          prompt: {
            type: 'string',
            required: true,
            description: wording.promptDescription,
          },
          ...presets.choices === undefined ? {} : {
            agent_preset: {
              type: 'string' as const,
              enum: [...presets.choices],
              description: presets.description,
            },
          },
          ...modelSelectionEnabled ? {
            provider: {
              type: 'string' as const,
              description: binding.kind === 'live'
                ? 'LLM provider route for the child. Checked against the current host allowlist when supplied. Omit both provider and model to inherit.'
                : 'LLM provider route for the child. Supply together with model; omit both to use configured child defaults or inherit the parent route.',
            },
            model: {
              type: 'string' as const,
              description: binding.kind === 'live'
                ? 'Model id interpreted by provider. An id absent from the advertised catalog remains selectable when the current host allowlist includes it.'
                : 'Model id interpreted by provider. Supply together with provider; omit both to use configured child defaults or inherit the parent route.',
            },
            reasoning_effort: {
              type: 'string' as const,
              description: 'Adapter-owned reasoning effort for the effective child route. Omit to inherit.',
            },
          } : {},
        },
        output: {
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              kind: { type: 'string', required: true, const: 'activation' },
              subagentId: { type: 'string', required: true },
            },
          },
          render: (_args, value) => [{ type: 'text', text: `started subagent ${value.subagentId}` }],
        },
        isConcurrencySafe: () => true,
        async execute(args, exec) {
          const parent = exec.agent
          if (!parent) throw new Error('subagent tool requires a calling agent (exec.agent was undefined)')
          const agentPreset = presets.resolve(args as PresetSelectionRequest)
          const modelRequest = args as DelegationModelRequest
          const parentOptions = parentAgentOptionsForDelegation(parent)
          const requiresRoutePreflight = hasDelegationModelRequest(modelRequest)
            || hasConfiguredLlmSelection(config.agentOptions)
          const configuredChildAgentOptions = requiresRoutePreflight && providerRouteDefaults !== undefined
            ? { ...providerRouteDefaults, ...config.agentOptions }
            : config.agentOptions
          const requestedChildAgentOptions = requestedAgentOptions(
            parentOptions,
            configuredChildAgentOptions,
            modelRequest,
            modelSelectionEnabled,
          )
          if (binding.kind === 'native') {
            assertAllowedModelSelection(binding.policy, parentOptions, requestedChildAgentOptions, modelRequest)
          } else if (binding.kind === 'live' && hasDelegationModelRequest(modelRequest)) {
            const settingsService = runtimeCtx.get('subagentModelSelection')
            if (settingsService === undefined) {
              throw new Error('cannot authorize child LLM selection because the host subagentModelSelection service is unavailable')
            }
            const current = settingsService.current()
            if (current.enabled !== true) {
              throw new Error('child LLM selection is disabled by the current host setting')
            }
            assertAllowedModelSelection(
              { routes: current.allowedModels },
              parentOptions,
              requestedChildAgentOptions,
              modelRequest,
            )
          }
          if (requiresRoutePreflight) {
            const llm = runtimeCtx.get('llm')
            if (llm === undefined) {
              throw new Error('cannot resolve the selected child LLM route because the `llm` service is unavailable')
            }
            await preflightChildLlmRoute(
              llm,
              parentOptions,
              requestedChildAgentOptions,
              exec.signal,
              providerRouteDefaults === undefined,
            )
            if (runtimeCtx.subagents.getProvider(config.provider) !== subagentProvider) {
              throw new Error(`subagent provider "${config.provider}" changed while resolving the child LLM route; retry the delegation`)
            }
          }
          exec.signal.throwIfAborted()
          const maxDepth = runtimeCtx.subagents.resolveMaxDepth(config.maxDepth)
          const request = {
            ...args.cwd === undefined ? {} : { cwd: args.cwd },
            prompt: [{ type: 'text', text: args.prompt }] as ContentBlock[],
            parent,
            ...agentPreset === undefined ? {} : { agentPreset },
            ...requestedChildAgentOptions !== undefined ? { agentOptions: requestedChildAgentOptions } : {},
            ...maxDepth !== undefined ? { maxDepth } : {},
          }
          const started = await runtimeCtx.subagents.startActivation({
            provider: config.provider,
            label: args.description,
            request,
            signal: exec.signal,
            delivery: 'parent',
          })
          return { kind: 'activation' as const, subagentId: started.childId }
        },
      })
      const disposeTool = runtimeCtx.effect(() => {
        const unregister = runtimeCtx.tools.register(definition)
        delegationTools.add(definition)
        return () => {
          delegationTools.delete(definition)
          unregister()
        }
      })
      mounted = { subagentProvider, definition, disposeTool }
    }

    runtimeCtx.on('subagent/provider-added', (subagentProvider) => {
      if (subagentProvider.name === config.provider && mounted === undefined) mount(subagentProvider)
    })
    runtimeCtx.on('subagent/provider-removed', (name) => {
      if (name !== config.provider || mounted === undefined) return
      mounted.disposeTool()
      mounted = undefined
    })
    const present = runtimeCtx.subagents.getProvider(config.provider)
    if (present !== undefined) mount(present)
    else runtimeCtx.logger.info(`subagent provider "${config.provider}" not registered yet; the "${toolName}" tool will register when it appears`)
    runtimeCtx.systemPrompt.section({
      name: `tool:${toolName}`,
      order: runtimeCtx.systemPrompt.getSectionOrder('TOOL_SUBAGENT'),
      text: (context) => {
        if (mounted === undefined) return ''
        const visible = [...delegationTools]
          .filter(tool => runtimeCtx.tools.get(tool.name, context.scope) === tool)
          .map(tool => tool.name)
          .sort()
        if (visible[0] !== toolName) return ''
        const names = visible.map(name => `\`${name}\``).join(' or ')
        return `Start independent delegations with ${names} together in one assistant message and continue useful work while they run.`
      },
    })
    runtimeCtx.systemPrompt.context({
      name: `tool:${toolName}:depth`,
      order: runtimeCtx.systemPrompt.getContextOrder('SUBAGENT_DELEGATION'),
      text: (context) => {
        if (context.agent === undefined || mounted === undefined
          || runtimeCtx.tools.get(toolName, context.scope) !== mounted.definition) return ''
        const maxDepth = runtimeCtx.subagents.resolveMaxDepth(config.maxDepth)
        if (maxDepth === undefined) return ''
        const depth = delegationDepthOf(context.agent)
        if (depth < maxDepth) return ''
        return `Delegation depth for \`${toolName}\`: current ${depth}, maximum ${maxDepth}, remaining levels 0.`
          + ` Do not call \`${toolName}\` at this depth; carry out the work directly.`
      },
    })
  }

  const compositionScope = scopeOf(ctx)
  if (presets.configured && (session !== undefined || compositionScope === undefined)) await presets.validate(ctx)

  if (kind === 'none' && (!presets.configured || session !== undefined || compositionScope === undefined)) {
    install(ctx, { kind: 'none' })
    return
  }

  const settings = selectionCapable ? ctx.get('subagentModelSelection') : undefined
  if (selectionCapable && settings === undefined) {
    throw new Error('tool-subagent: child model selection requires the host subagentModelSelection service')
  }
  const selectForSession = (target: Session): ModelSelectionPolicy | undefined => {
    if (kind !== 'native' || settings === undefined) return undefined
    const freshSession = target.firstLiveSeq === 0
      && target.eventAt(SessionSeq(0))?.type !== 'session/end-seed'
    let allowedModels = subagentModelSelectionPolicy(ctx.sessionProjections, target)
    if (allowedModels === undefined) {
      const parentId = target.header.origin === 'subagent' ? target.header.parentSession : undefined
      if (parentId !== undefined) {
        const sessions = ctx.get('sessions')
        if (sessions === undefined) {
          throw new Error('tool-subagent: child model-selection inheritance requires the Session registry')
        }
        const parent = sessions.get(parentId)
        allowedModels = parent === undefined ? undefined : subagentModelSelectionPolicy(ctx.sessionProjections, parent)
      } else if (freshSession) {
        const current = settings.current()
        allowedModels = current.enabled ? current.allowedModels : undefined
      }
    }
    if (allowedModels !== undefined) recordSubagentModelSelection(ctx.sessionProjections, target, allowedModels)
    return allowedModels === undefined ? undefined : { routes: allowedModels }
  }

  if (session !== undefined) {
    install(ctx, kind === 'native' ? { kind: 'native', policy: selectForSession(session) } : { kind })
    return
  }
  if (kind === 'live' && compositionScope === undefined) {
    install(ctx, { kind: 'live' })
    return
  }
  if (compositionScope === undefined) {
    throw new Error('tool-subagent: standing nativeModelSelectionCompatibility requires a scoped preset Context')
  }
  const agents = ctx.get('agents')
  if (agents === undefined) throw new Error('tool-subagent: standing delegation requires the Agent registry')
  const scopedInstalls = new WeakMap<Agent, ReturnType<Context['inject']>>()
  const installing = new WeakSet<Agent>()
  const belongsToComposition = (candidate: Agent): boolean =>
    scopeChainOf(scopeOf(candidate.ctx)).includes(compositionScope)
  const installScoped = (candidate: Agent): ReturnType<Context['inject']> | undefined => {
    const existing = scopedInstalls.get(candidate)
    if (existing !== undefined) return existing
    if (installing.has(candidate)) return
    installing.add(candidate)
    let fiber: ReturnType<Context['inject']>
    try {
      const binding: SelectionBinding = kind === 'native'
        ? { kind: 'native', policy: selectForSession(candidate.session) }
        : { kind }
      fiber = candidate.ctx.inject(['tools', 'subagents', 'systemPrompt'], async (runtimeCtx) => {
        if (presets.configured) await presets.validate(ctx)
        install(runtimeCtx, binding)
      })
    } finally {
      installing.delete(candidate)
    }
    scopedInstalls.set(candidate, fiber)
    return fiber
  }
  const removeScoped = (candidate: Agent): void => {
    const fiber = scopedInstalls.get(candidate)
    if (fiber === undefined) return
    scopedInstalls.delete(candidate)
    void fiber.dispose().catch((error: unknown) => {
      ctx.logger.warn(`tool-subagent: failed to remove recomposed Agent "${candidate.id}" definitions: ${String(error)}`)
    })
  }
  const reconcileComposedAgents = (): void => {
    for (const candidate of agents.list()) {
      if (belongsToComposition(candidate)) installScoped(candidate)
      else removeScoped(candidate)
    }
  }
  ctx.on('agent/created', async ({ agent: created }) => {
    await installScoped(created)
  })
  ctx.on('agent/disposed', ({ agent: disposed }) => { removeScoped(disposed) })
  ctx.on('tools/change', reconcileComposedAgents)
  reconcileComposedAgents()
}
