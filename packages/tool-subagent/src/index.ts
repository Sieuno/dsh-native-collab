/**
 * Fresh derived `subagent` tool. Compatibility defaults off and is read at apply.
 * Fork does not use this entry.
 *
 * Derived from DeepSeek Harness dsh-v0.2.1-rc.2 tool-subagent (MIT).
 * @module @dsh-native-collab/tool-subagent
 */
import type { Context } from '@deepseek-ai/cordis'
import type { Session } from '@deepseek-ai/dsh-session'
import { applyDerivedDelegation, configSchema } from './flow.ts'
import type { DerivedConfig } from './flow.ts'

export const name = 'tool-subagent'
export const inject = ['tools', 'subagents', 'systemPrompt', 'sessionProjections', 'collabUi']
export const Config = configSchema('subagent')
export type Config = DerivedConfig

export function apply(ctx: Context, config: Config, session?: Session): Promise<void> {
  return applyDerivedDelegation(ctx, {
    ...config,
    toolName: config.toolName ?? 'subagent',
    ownsDiscovery: true,
  }, session)
}
