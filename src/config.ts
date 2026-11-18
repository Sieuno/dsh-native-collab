import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { SETTINGS_LOCALES } from './settings-locale.ts'

export type ModelSource = 'conversation' | 'settings' | 'all'
export interface Config {
  modelEnhancement: Volatile<boolean>
  modelSource?: Volatile<ModelSource>
  teamRequestLimit: Volatile<number>
  disableWaitAgent: Volatile<boolean>
  /** Retired switches are accepted when reading old config, but have no effect. */
  communicationEnhancement?: boolean
  runningChildGuidance?: boolean
  completedChildContinuation?: boolean
  delegationGuidance?: boolean
  /** Accepted only to read preferences saved by 0.3.x. No runtime is replaced. */
  runtimeMode?: 'native' | 'managed'
  nativeModelSelectionCompatibility?: Volatile<boolean | undefined>
}

export const Config = z.object({
  modelEnhancement: z.boolean().default(true).volatile(),
  modelSource: z.union(['conversation', 'settings', 'all']).volatile(),
  teamRequestLimit: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(32).volatile(),
  disableWaitAgent: z.boolean().default(false).volatile(),
  communicationEnhancement: z.boolean(),
  runningChildGuidance: z.boolean(),
  completedChildContinuation: z.boolean(),
  delegationGuidance: z.boolean(),
  runtimeMode: z.union(['native', 'managed']),
  nativeModelSelectionCompatibility: z.boolean().volatile(),
}).i18n(SETTINGS_LOCALES)

export interface Preferences {
  modelSource: ModelSource
  teamRequestLimit: number
  disableWaitAgent: boolean
}

export function preferences(config: Config): Preferences {
  const limit = config.teamRequestLimit.get()
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('teamRequestLimit must be a positive safe integer')
  return {
    modelSource: config.modelEnhancement.get() === false ? 'conversation'
      : config.modelSource?.get() ?? (config.nativeModelSelectionCompatibility?.get() === false ? 'settings' : 'conversation'),
    teamRequestLimit: limit,
    disableWaitAgent: config.disableWaitAgent.get(),
  }
}
