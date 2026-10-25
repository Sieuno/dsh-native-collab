/** Root package entry: collaboration UI service plus its own volatile settings. */
import z from '@deepseek-ai/schemastery'
import { CollabUiService } from './collab-ui.ts'

/**
 * Next-assembly preference for this control entry only.
 * Each field is optional and has no default. Unset follows the existing row.
 */
export const Config = z.object({
  modelEnhancement: z.boolean().volatile().description('Next-assembly model enhancement. Unset follows the existing row. Off does not disable native ordinary subagent selection.'),
  communicationEnhancement: z.boolean().volatile().description('Next-assembly communication enhancement. Unset follows the existing row. Off keeps native send_message.'),
  runningChildGuidance: z.boolean().volatile().description('When communication enhancement is enabled, allow parent messages to running children. Unset preserves native behavior.'),
  completedChildContinuation: z.boolean().volatile().description('When communication enhancement is enabled, allow parent messages to resume idle continuable children. Unset preserves native behavior.'),
  teamRequestLimit: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).volatile().description('Request quota for new Team ledgers after restart. Unset follows the Team row (default 32). Existing ledgers retain their limit and usage.'),
  nativeModelSelectionCompatibility: z.boolean().volatile().description('When model enhancement is on, true uses the native snapshot and false uses the live allowlist. Ignored while model enhancement is off or unset.'),
})

CollabUiService.Config = Config
export { CollabUiService as default }
