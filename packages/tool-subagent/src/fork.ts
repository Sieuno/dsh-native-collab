/**
 * Fork derived `subagent_fork` tool. It does not own discovery or child selection.
 * The compatibility flag is accepted and does not grant a list or selection fields.
 *
 * Derived from DeepSeek Harness dsh-v0.2.1-rc.2 tool-subagent (MIT).
 * @module @dsh-native-collab/tool-subagent/fork
 */
import type { Context } from '@deepseek-ai/cordis'
import type { Session } from '@deepseek-ai/dsh-session'
import { applyDerivedDelegation, configSchema } from './flow.ts'
import type { DerivedConfig } from './flow.ts'

export const name = 'tool-subagent-fork'
export const inject = ['tools', 'subagents', 'systemPrompt', 'sessionProjections', 'collabUi']
export const Config = configSchema('subagent_fork')
export type Config = DerivedConfig

export function apply(ctx: Context, config: Config, session?: Session): Promise<void> {
  return applyDerivedDelegation(ctx, {
    ...config,
    toolName: config.toolName ?? 'subagent_fork',
    ownsDiscovery: false,
  }, session)
}
