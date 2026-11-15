import z from '@deepseek-ai/schemastery';
import { SETTINGS_LOCALES } from './settings-locale.js';
export const Config = z.object({
    modelEnhancement: z.boolean().default(true).volatile(),
    modelSource: z.union(['conversation', 'settings', 'all']).volatile(),
    teamRequestLimit: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(32).volatile(),
    communicationEnhancement: z.boolean(),
    runningChildGuidance: z.boolean(),
    completedChildContinuation: z.boolean(),
    delegationGuidance: z.boolean(),
    runtimeMode: z.union(['native', 'managed']),
    nativeModelSelectionCompatibility: z.boolean().volatile(),
}).i18n(SETTINGS_LOCALES);
export function preferences(config) {
    const limit = config.teamRequestLimit.get();
    if (!Number.isSafeInteger(limit) || limit < 1)
        throw new Error('teamRequestLimit must be a positive safe integer');
    return {
        modelSource: config.modelEnhancement.get() === false ? 'conversation'
            : config.modelSource?.get() ?? (config.nativeModelSelectionCompatibility?.get() === false ? 'settings' : 'conversation'),
        teamRequestLimit: limit,
    };
}
