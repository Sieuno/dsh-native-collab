/**
 * Host-only own-model projection. No wire payload. The inherited cut is the init argument.
 */
import { z } from 'zod';
import { applyOwnModel, initOwnModel, OWN_MODEL_KEY } from "./own-model.js";
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
};
