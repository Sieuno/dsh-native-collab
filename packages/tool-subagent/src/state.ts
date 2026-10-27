/**
 * Host-only fold of the native subagent model-selection policy event.
 * Same key and stateVersion as the official unit so a shared registry keeps one apply.
 * This fold does not filter on the fork cut: the event is this Session's own record.
 */
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { AllowedModelRoute } from './model-selection.ts'

export const POLICY_KEY = 'subagentModelSelectionPolicy'
export const POLICY_EVENT = 'subagent/model-selection-policy'
export const POLICY_STATE_VERSION = 1

/** Same alias as the official projection augmentation, not a structural duplicate. */
export type PolicyState = AllowedModelRoute[] | null

export function initPolicy(): PolicyState {
  return null
}

/** First write wins. Later policy events do not replace a recorded snapshot. */
export function applyPolicy(policy: PolicyState, event: SessionEvent): PolicyState {
  if (policy !== null || event.type !== POLICY_EVENT) return policy
  const data: unknown = event.data
  const allowedModels = data !== null && typeof data === 'object' && 'allowedModels' in data
    ? data.allowedModels
    : undefined
  if (!Array.isArray(allowedModels) || allowedModels.length === 0) {
    throw new Error('subagent/model-selection-policy requires at least one route')
  }
  return allowedModels.map(route => {
    if (route === null || typeof route !== 'object' || typeof route.provider !== 'string' || typeof route.model !== 'string' || route.provider.length === 0 || route.model.length === 0) {
      throw new Error('subagent/model-selection-policy route is malformed')
    }
    return { provider: route.provider, model: route.model }
  })
}

/**
 * Append the policy once. A second call does not append.
 * @param session - Session that will store the event.
 * @param alreadyRecorded - true when the projection already has routes.
 */
export function recordPolicy(
  session: { append: (type: string, data: { allowedModels: AllowedModelRoute[] }) => unknown },
  alreadyRecorded: boolean,
  allowedModels: readonly AllowedModelRoute[],
): boolean {
  if (alreadyRecorded) return false
  session.append(POLICY_EVENT, {
    allowedModels: allowedModels.map(route => ({ provider: route.provider, model: route.model })),
  })
  return true
}
