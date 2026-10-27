/**
 * Live discovery for the derived fresh tool when compatibility mode is off.
 * Catalog membership is display metadata. Allowed but unadvertised ids stay listed.
 *
 * Derived from DeepSeek Harness dsh-v0.2.1-rc.2 tool-subagent (MIT).
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { discoverLiveRoutes } from './delegation.ts'
import type { AdvertisedModel, RegisteredProvider } from './delegation.ts'
import { readCurrentModelSource } from '@dsh-native-collab/subagent'
import { listSubagentModels } from './list-models.ts'
import type { ModelSelectionPolicy } from './model-selection.ts'

interface LiveListRequest {
  readonly provider?: string
  readonly model?: string
}

/**
 * Register `list_subagent_models` so each call reads the current Host allowlist.
 * @param ctx - Context whose tool registry owns the discovery definition.
 */
export function registerLiveListSubagentModels(ctx: Context, conversationPolicy?: ModelSelectionPolicy): void {
  ctx.tools.register(defineTool({
    name: 'list_subagent_models',
    description:
      'Discover available LLM routes for subagents. Call with no arguments to list '
      + 'providers, with `provider` to list its models, or with `provider` '
      + 'and `model` to inspect that model. Use the returned ids in '
      + '`provider`, `model`, and `reasoning_effort`.',
    parameters: {
      provider: {
        type: 'string',
        description: 'LLM provider id. Omit to list allowed providers.',
      },
      model: {
        type: 'string',
        description: 'Model id to inspect. Requires provider; omit to list allowed models.',
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, result) => [{ type: 'text', text: result }],
    },
    async execute(args: LiveListRequest, exec) {
      const source = readCurrentModelSource(ctx)
      if (source === undefined) throw new Error('cannot discover child LLM routes because the collabUi model-source service is unavailable')
      if (source === 'conversation') {
        if (conversationPolicy === undefined) throw new Error('no child LLM routes were captured for this conversation')
        return listSubagentModels(ctx, conversationPolicy, args, exec.signal)
      }
      const llm = ctx.get('llm')
      const providers: RegisteredProvider[] = llm === undefined ? [] : llm.listProviders().map(provider => ({
        id: provider.id,
        name: provider.name,
      }))
      if (source === 'all') {
        if (llm === undefined) throw new Error('cannot discover child LLM routes because the `llm` service is unavailable')
        if (args.model !== undefined && args.provider === undefined) throw new Error('`model` requires `provider`')
        if (args.provider === undefined) return providers.length === 0 ? '(no LLM providers)' : providers.map(p => `${p.id} — ${p.name}`).join('\n')
        if (!providers.some(p => p.id === args.provider)) throw new Error(`LLM provider "${args.provider}" is not registered`)
        if (args.model === undefined) {
          const models = await llm.listModels(args.provider)
          return models.length === 0 ? `(no advertised models for ${args.provider})` : models.map(model => `${args.provider}/${model.id} — ${model.name}`).join('\n')
        }
        const info = await llm.resolveModelInfo(args.provider, args.model, exec.signal)
        const efforts = info.reasoning?.efforts.map(effort => `${effort.id}${info.reasoning?.defaultEffort === effort.id ? ' (default)' : ''} — ${effort.name}`).join('\n') || '(no advertised reasoning efforts)'
        return `${args.provider}/${info.id} — ${info.name}\nReasoning efforts:\n${efforts}`
      }
      const settingsService = ctx.get('subagentModelSelection')
      if (settingsService === undefined) {
        throw new Error('cannot discover child LLM routes because the host subagentModelSelection service is unavailable')
      }
      const settings = settingsService.current()
      if (!settings || typeof settings.enabled !== 'boolean' || !Array.isArray(settings.allowedModels)) {
        throw new Error('cannot discover child LLM routes because the current host setting is malformed')
      }
      let advertised: AdvertisedModel[] = []
      if (llm !== undefined && args.provider !== undefined && args.provider.length > 0) {
        try {
          const models = await llm.listModels(args.provider)
          advertised = models.map(model => ({ provider: args.provider as string, id: model.id, name: model.name }))
        } catch (error) {
          void error
          advertised = []
        }
      }
      return discoverLiveRoutes(settings, providers, advertised, args)
    },
  }))
}
