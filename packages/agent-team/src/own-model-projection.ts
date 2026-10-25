/**
 * Host-only own-model projection. No wire payload. The inherited cut is the init argument.
 */
import { z } from 'zod'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import { applyOwnModel, initOwnModel, OWN_MODEL_KEY } from './own-model.ts'

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionStateMap {
    teamMemberOwnModel: {
      inheritedEventCount: number
      provider?: string
      model?: string
      reasoningEffort?: string
    }
  }
}

export const teamMemberOwnModelProjection = {
  key: OWN_MODEL_KEY,
  stateVersion: 1,
  stateSchema: z.object({
    inheritedEventCount: z.number().int().nonnegative(),
    provider: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    reasoningEffort: z.string().min(1).optional(),
  }).strict(),
  init: initOwnModel,
  apply: applyOwnModel,
} satisfies ProjectionDefinition<'teamMemberOwnModel'>
