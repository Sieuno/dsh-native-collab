/**
 * Registration object for the native policy event.
 * Same key and stateVersion as the official unit. No wire payload.
 */
import { z } from 'zod';
import { applyPolicy, initPolicy, POLICY_KEY, POLICY_STATE_VERSION } from "./state.js";
export const subagentModelSelectionProjection = {
    key: POLICY_KEY,
    stateVersion: POLICY_STATE_VERSION,
    stateSchema: z.array(z.object({
        provider: z.string().min(1),
        model: z.string().min(1),
    }).strict()).min(1).nullable(),
    init: (_header, _inheritedEventCount) => initPolicy(),
    apply: applyPolicy,
};
