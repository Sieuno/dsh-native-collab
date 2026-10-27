/** Pure model-source policy decisions shared by subagent and Team adapters. */
export type ModelSource = 'conversation' | 'settings' | 'all'
export interface ModelRoute { readonly provider: string; readonly model: string }
export interface LiveSelection { readonly enabled: boolean; readonly allowedModels: readonly ModelRoute[] }

/** Explicit enum wins. Legacy true maps to conversation, false to settings, unset to conservative conversation. */
export function resolveModelSource(explicit: unknown, legacy: unknown): ModelSource {
  if (explicit === 'conversation' || explicit === 'settings' || explicit === 'all') return explicit
  if (legacy === true) return 'conversation'
  if (legacy === false) return 'settings'
  return 'conversation'
}

/** Fail closed unless a requested provider/model is authorized by the selected source. */
export function assertModelRouteAllowed(
  source: ModelSource,
  route: ModelRoute,
  conversation: readonly ModelRoute[] | undefined,
  settings: LiveSelection | undefined,
  liveProviders: readonly string[] | undefined,
): void {
  if (typeof route.provider !== 'string' || route.provider.length === 0
    || typeof route.model !== 'string' || route.model.length === 0) {
    throw new Error('selected child LLM route is malformed')
  }
  if (source === 'conversation') {
    if (!Array.isArray(conversation)) throw new Error('conversation model policy is unavailable')
    if (!conversation.some(item => item?.provider === route.provider && item?.model === route.model)) {
      throw new Error(`child LLM route "${route.provider}/${route.model}" is not allowed for this conversation`)
    }
    return
  }
  if (source === 'settings') {
    if (!settings || typeof settings.enabled !== 'boolean' || !Array.isArray(settings.allowedModels)) {
      throw new Error('current subagent model-selection setting is unavailable or malformed')
    }
    if (!settings.enabled || !settings.allowedModels.some(item => item?.provider === route.provider && item?.model === route.model)) {
      throw new Error(`child LLM route "${route.provider}/${route.model}" is not allowed by current settings`)
    }
    return
  }
  if (!Array.isArray(liveProviders)) throw new Error('live LLM provider catalog is unavailable')
  if (!liveProviders.includes(route.provider)) throw new Error(`LLM provider "${route.provider}" is not currently registered`)
}
