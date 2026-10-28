/**
 * Registration object for the native policy event.
 * Same key and stateVersion as the official unit. No wire payload.
 */
import { z } from 'zod'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import { applyPolicy, initPolicy, POLICY_KEY, POLICY_STATE_VERSION, type PolicyState } from './state.ts'

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionStateMap {
    subagentModelSelectionPolicy: PolicyState
  }
}

export const subagentModelSelectionProjection = {
  key: POLICY_KEY,
  stateVersion: POLICY_STATE_VERSION,
  stateSchema: z.array(z.object({
    provider: z.string().min(1),
    model: z.string().min(1),
  }).strict()).min(1).nullable(),
  init: (_header?: unknown, _inheritedEventCount?: number) => initPolicy(),
  apply: applyPolicy,
} satisfies ProjectionDefinition<'subagentModelSelectionPolicy', PolicyState>
