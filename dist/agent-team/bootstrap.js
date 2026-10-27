/** Root package entry: collaboration UI service plus its own volatile settings. */
import z from '@deepseek-ai/schemastery';
import { CollabUiService } from "./collab-ui.js";
/**
 * Next-start preferences for this control entry only. Runtime ownership is
 * automatic while the entry is enabled; runtimeMode is legacy compatibility.
 * Enhancement fields have no schema default; unset preserves native behavior.
 */
export const Config = z.object({
    runtimeMode: z.union(['native', 'managed']).default('managed').volatile().description('Deprecated compatibility field. The installed management entry owns runtime assembly; ordinary enhancement preferences do not require offline migration.'),
    modelEnhancement: z.boolean().volatile().description('Next-assembly model enhancement. Unset follows the existing row. Off does not disable native ordinary subagent selection.'),
    communicationEnhancement: z.boolean().volatile().description('Next-assembly communication enhancement. Unset follows the existing row. Off keeps native send_message.'),
    runningChildGuidance: z.boolean().volatile().description('When communication enhancement is enabled, allow parent messages to running children. Unset preserves native behavior.'),
    completedChildContinuation: z.boolean().volatile().description('When communication enhancement is enabled, allow parent messages to resume idle continuable children. Unset preserves native behavior.'),
    teamRequestLimit: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).volatile().description('Maximum consecutive automatic cross-session wakes shared by one delegation family (default 32). Human input resets the counter; direct-parent completion/stop reports are exempt. No request counting or cancellation.'),
    nativeModelSelectionCompatibility: z.boolean().volatile().description('Legacy compatibility setting. Used only when modelSource is unset.'),
    modelSource: z.union(['conversation', 'settings', 'all']).volatile().description('Model source for subagent and teammate selection.'),
});
CollabUiService.Config = Config;
export { CollabUiService as default };
