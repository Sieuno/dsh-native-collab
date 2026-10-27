/**
 * Host-only display of one Session's own recorded model.
 * The inherited cut is an argument, never inferred from firstLiveSeq.
 */
import type { SessionEvent } from '@deepseek-ai/dsh-session'

export const OWN_MODEL_KEY = 'teamMemberOwnModel'

export interface OwnModelState {
  readonly inheritedEventCount: number
  readonly provider?: string
  readonly model?: string
  readonly reasoningEffort?: string
}

export type ModelSource = 'own-request' | 'creation-default'

/** Empty own-model state. The header is accepted and ignored so the cut cannot be inferred from it. */
export function initOwnModel(_header: unknown, inheritedEventCount: number): OwnModelState {
  return { inheritedEventCount }
}

/** Fold one committed Session event. Ancestor events below the inherited cut are ignored. */
export function applyOwnModel(state: OwnModelState, event: SessionEvent): OwnModelState {
  if (event.type !== 'request/header') return state
  if (typeof event.seq === 'number' && event.seq < state.inheritedEventCount) return state
  const config = event.data?.header?.config
  if (config === undefined || typeof config.model !== 'string' || config.model.length === 0) return state
  return {
    inheritedEventCount: state.inheritedEventCount,
    ...typeof config.provider === 'string' && config.provider.length > 0 ? { provider: config.provider } : {},
    model: config.model,
    ...typeof config.reasoningEffort === 'string' && config.reasoningEffort.length > 0 ? { reasoningEffort: config.reasoningEffort } : {},
  }
}

/**
 * Fields list_agents may show. Own request evidence wins over creation options.
 * A live Agent with no own request may show its creation model and must say so.
 * No live Agent and no own evidence omits the model.
 */
export function rosterModelFields(input: {
  readonly ownModel?: string
  readonly ownProvider?: string
  readonly agentLive: boolean
  readonly creationModel?: string
  readonly creationProvider?: string
}): { readonly model?: string, readonly modelSource?: ModelSource, readonly llmProvider?: string } {
  if (input.ownModel !== undefined && input.ownModel.length > 0) {
    return {
      model: input.ownModel,
      modelSource: 'own-request',
      ...input.ownProvider !== undefined && input.ownProvider.length > 0 ? { llmProvider: input.ownProvider } : {},
    }
  }
  if (input.agentLive && input.creationModel !== undefined && input.creationModel.length > 0) {
    return {
      model: input.creationModel,
      modelSource: 'creation-default',
      ...input.creationProvider !== undefined && input.creationProvider.length > 0 ? { llmProvider: input.creationProvider } : {},
    }
  }
  return {}
}
