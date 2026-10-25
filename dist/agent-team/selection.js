/**
 * Pure Team spawn-selection and delivery rules.
 * No service lookup, name claim, or persistence.
 */
/** Whether the caller named any selection field. */
export function hasSelectionFields(value) {
    return value?.provider !== undefined || value?.model !== undefined || value?.reasoningEffort !== undefined;
}
/**
 * Parent route used as the inheritance baseline.
 * A complete request-header route wins over creation options.
 * @param source - caller creation options and optional current request header.
 * @returns the baseline route. Incomplete headers fall back to creation options.
 */
export function callerRoute(source) {
    const header = source.requestHeader;
    if (header?.provider !== undefined && header.model !== undefined) {
        return {
            provider: header.provider,
            model: header.model,
            ...header.reasoningEffort === undefined ? {} : { reasoningEffort: header.reasoningEffort },
        };
    }
    return {
        ...source.options.provider === undefined ? {} : { provider: source.options.provider },
        ...source.options.model === undefined ? {} : { model: source.options.model },
        ...source.options.reasoningEffort === undefined ? {} : { reasoningEffort: source.options.reasoningEffort },
    };
}
function emptyField(value, field) {
    if (value !== undefined && value.trim() === '')
        return `${field} must be non-empty`;
    return undefined;
}
/**
 * Decide whether spawn omits agentOptions, rejects, or must validate before claiming a name.
 * A route change without reasoningEffort does not carry the parent effort.
 * @param requested - optional Team agentOptions. Absent or empty means native inheritance.
 * @param baseline - caller header route, or creation options before the first request.
 * @param enhanced - deployment flag. Off rejects present fields instead of dropping them.
 */
export function decideTeamSelection(requested, baseline, enhanced) {
    if (!hasSelectionFields(requested))
        return { kind: 'omit' };
    if (!enhanced) {
        return {
            kind: 'reject',
            code: 'TEAM_ENHANCEMENT_DISABLED',
            message: 'agentOptions is not accepted while selection enhancement is off',
        };
    }
    const fields = requested ?? {};
    const empty = emptyField(fields.provider, 'provider')
        ?? emptyField(fields.model, 'model')
        ?? emptyField(fields.reasoningEffort, 'reasoningEffort');
    if (empty !== undefined) {
        return { kind: 'reject', code: 'TEAM_AGENT_OPTIONS_INCOMPLETE', message: empty };
    }
    if ((fields.provider === undefined) !== (fields.model === undefined)) {
        return {
            kind: 'reject',
            code: 'TEAM_AGENT_OPTIONS_INCOMPLETE',
            message: 'provider and model must be supplied together',
        };
    }
    const routeChanged = fields.provider !== undefined
        && (fields.provider !== baseline.provider || fields.model !== baseline.model);
    const provider = fields.provider ?? baseline.provider;
    const model = fields.model ?? baseline.model;
    if (provider === undefined || model === undefined) {
        return {
            kind: 'reject',
            code: 'TEAM_AGENT_OPTIONS_INCOMPLETE',
            message: 'cannot select a child route without an effective provider and model',
        };
    }
    const reasoningEffort = fields.reasoningEffort !== undefined
        ? fields.reasoningEffort
        : routeChanged ? undefined : baseline.reasoningEffort;
    return {
        kind: 'validate',
        routeChanged,
        call: {
            provider,
            model,
            ...reasoningEffort === undefined ? {} : { reasoningEffort },
        },
        pass: {
            provider,
            model,
            reasoningEffort,
        },
    };
}
/**
 * Normalize delivery. Illegal values reject; they are not downgraded to steer.
 * A present value while enhancement is off rejects rather than being dropped.
 * @param value - raw delivery field.
 * @param enhanced - deployment flag.
 */
export function decideDelivery(value, enhanced) {
    if (value === undefined)
        return { kind: 'use', delivery: 'steer' };
    if (!enhanced) {
        return {
            kind: 'reject',
            code: 'TEAM_ENHANCEMENT_DISABLED',
            message: 'delivery is not accepted while selection enhancement is off',
        };
    }
    if (value !== 'queue' && value !== 'steer') {
        return {
            kind: 'reject',
            code: 'TEAM_DELIVERY_INVALID',
            message: 'delivery must be "queue" or "steer"',
        };
    }
    return { kind: 'use', delivery: value };
}
