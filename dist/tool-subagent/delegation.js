/**
 * Model-selection decisions for the derived delegation tool.
 *
 * Derived from DeepSeek Harness dsh-v0.2.1-rc.2 tool-subagent (MIT).
 * This module does not mount a settings service and does not import official src/*.
 * Advertised catalog membership is display metadata, never an authorization table.
 */
const DISABLED_DISCOVERY = '(no child LLM routes; host selection is disabled)';
/** Copy one allowlist so a later settings mutation cannot alias the decision. */
export function detachRoutes(routes) {
    return routes.map(route => ({ provider: route.provider, model: route.model }));
}
/** True when the caller sent any selection field, including an incomplete pair. */
export function hasExplicitSelection(request) {
    return request.provider !== undefined || request.model !== undefined || request.reasoning_effort !== undefined;
}
/**
 * Native fresh-top-level test. The caller supplies the Session reads.
 * A restored fork is not fresh when event 0 is session/end-seed, even if firstLiveSeq is 0.
 */
export function isFreshTopLevel(session) {
    return session.firstLiveSeq === 0 && session.eventAt(0)?.type !== 'session/end-seed';
}
/**
 * Native install decision. Existing snapshot wins and is not rewritten.
 * Parent policy is inherited and recorded on the child when the child has none.
 * Settings are sampled only for a fresh top-level session with no snapshot and no parent policy.
 * @param existing - projection value already stored for this Session, if any.
 * @param parentPolicy - parent Session policy, when this Session is a subagent child.
 * @param freshTopLevel - result of {@link isFreshTopLevel}.
 * @param settings - current Host preference; read only when a fresh sample is required.
 */
export function resolveNativePolicy(existing, parentPolicy, freshTopLevel, settings) {
    if (existing !== undefined)
        return { policy: detachRoutes(existing), shouldRecord: false };
    if (parentPolicy !== undefined)
        return { policy: detachRoutes(parentPolicy), shouldRecord: true };
    if (!freshTopLevel)
        return { policy: undefined, shouldRecord: false };
    if (settings === undefined) {
        throw new Error('native model selection requires the host subagentModelSelection service');
    }
    if (!settings.enabled)
        return { policy: undefined, shouldRecord: false };
    if (settings.allowedModels.length === 0) {
        throw new Error('enabled subagent model selection requires at least one allowed model');
    }
    return { policy: detachRoutes(settings.allowedModels), shouldRecord: true };
}
/** Whether one exact route is in the authorization allowlist. Catalog membership is ignored. */
export function routeAllowed(allowlist, provider, model) {
    return allowlist.some(route => route.provider === provider && route.model === model);
}
/**
 * Live-host authorization. Reads only the settings object the caller just sampled.
 * An earlier discovery string is not an input and cannot authorize a revoked route.
 */
export function authorizeLiveSelection(settings, request, advertised = []) {
    if (!hasExplicitSelection(request))
        return { kind: 'omit' };
    if (request.provider === undefined || request.provider.length === 0 || request.model === undefined || request.model.length === 0) {
        return { kind: 'reject', reason: 'child LLM selection requires both provider and model' };
    }
    if (!settings.enabled) {
        return { kind: 'reject', reason: 'child LLM selection is disabled by the current host setting' };
    }
    if (!routeAllowed(settings.allowedModels, request.provider, request.model)) {
        return {
            kind: 'reject',
            reason: `child LLM route "${request.provider}/${request.model}" is not allowed for this Session`,
        };
    }
    const advertisedHit = advertised.some(model => model.provider === request.provider && model.id === request.model);
    return {
        kind: 'accept',
        route: { provider: request.provider, model: request.model },
        advertised: advertisedHit,
        agentOptions: {
            provider: request.provider,
            model: request.model,
            ...request.reasoning_effort === undefined ? {} : { reasoningEffort: request.reasoning_effort },
        },
    };
}
/**
 * Discovery text for the current Host allowlist.
 * Unadvertised and currently unregistered routes stay listed; they are not banned here.
 */
export function discoverLiveRoutes(settings, providers, advertised, request = {}) {
    if (!settings.enabled || settings.allowedModels.length === 0)
        return DISABLED_DISCOVERY;
    const allowed = detachRoutes(settings.allowedModels);
    if (request.provider === undefined) {
        const ids = [...new Set(allowed.map(route => route.provider))];
        return ids.map(id => {
            const known = providers.find(provider => provider.id === id);
            const suffix = known === undefined ? ' (provider not registered)' : '';
            return `${id}${known?.name === undefined ? '' : ` — ${known.name}`}${suffix}`;
        }).join('\n');
    }
    const routes = allowed.filter(route => route.provider === request.provider);
    if (routes.length === 0) {
        throw new Error(`LLM provider "${request.provider}" is not allowed for this Session`);
    }
    if (request.model === undefined) {
        return routes.map(route => {
            const info = advertised.find(model => model.provider === route.provider && model.id === route.model);
            const label = info === undefined ? 'unadvertised' : (info.name ?? route.model);
            return `${route.provider}/${route.model} — ${label}`;
        }).join('\n');
    }
    if (!routes.some(route => route.model === request.model)) {
        throw new Error(`child LLM route "${request.provider}/${request.model}" is not allowed for this Session`);
    }
    const info = advertised.find(model => model.provider === request.provider && model.id === request.model);
    return `${request.provider}/${request.model} — ${info === undefined ? 'unadvertised' : (info.name ?? request.model)}`;
}
/**
 * Call the adapter resolver. A missing provider must surface as the adapter's NO_ADAPTER.
 * This function does not substitute another model.
 */
export async function preflightRoute(llm, route, signal) {
    if (llm === undefined || typeof llm.resolveCallConfig !== 'function') {
        throw new Error('cannot resolve the selected child LLM route because the `llm` service is unavailable');
    }
    await llm.resolveCallConfig({ provider: route.provider, model: route.model }, signal);
}
/** Schema fields and the handler kind that enforces them. Fork is always `none`. */
export function selectionFields(kind) {
    if (kind === 'none')
        return {};
    const live = kind === 'live';
    return {
        provider: {
            type: 'string',
            description: live
                ? 'LLM provider id. Checked against the current host allowlist when supplied. Omit both provider and model to inherit.'
                : 'LLM provider id captured for this Session. Omit both provider and model to inherit.',
        },
        model: {
            type: 'string',
            description: live
                ? 'Model id. An id absent from the advertised catalog remains selectable when the current host allowlist includes it and the adapter can resolve it.'
                : 'Model id captured for this Session. Catalog membership is advisory.',
        },
        reasoning_effort: {
            type: 'string',
            description: 'Optional reasoning effort passed to the adapter with an explicit route. Omission inherits.',
        },
    };
}
/**
 * Install plan. Fork never owns discovery. Native schema fields exist only when a policy was captured.
 * Live-host fresh keeps a stable optional schema so an enabled flip does not rebuild the tool.
 */
export function planTools(input) {
    if (!input.ownsDiscovery) {
        return {
            toolName: input.toolName,
            ownsDiscovery: false,
            selectionKind: 'none',
            recordsPolicy: false,
        };
    }
    if (input.compatibility) {
        return {
            toolName: input.toolName,
            ownsDiscovery: input.policyDefined,
            selectionKind: input.policyDefined ? 'captured' : 'none',
            recordsPolicy: input.policyDefined,
        };
    }
    return {
        toolName: input.toolName,
        ownsDiscovery: true,
        selectionKind: 'live',
        recordsPolicy: false,
    };
}
/**
 * Resolve one delegation. Omission does not preflight and does not set agentOptions.
 * Acceptance preflights the exact route. Rejection and adapter failure do not start a child.
 */
export async function resolveDelegation(kind, request, captured, readSettings, advertised, llm, signal) {
    if (kind === 'none') {
        if (hasExplicitSelection(request)) {
            return { kind: 'reject', reason: 'this delegation tool does not accept child LLM selection' };
        }
        return { kind: 'omit' };
    }
    if (kind === 'captured') {
        if (!hasExplicitSelection(request))
            return { kind: 'omit' };
        if (captured === undefined) {
            return { kind: 'reject', reason: 'this Session has no captured child LLM policy' };
        }
        const decision = authorizeLiveSelection({ enabled: true, allowedModels: captured }, request, advertised);
        if (decision.kind === 'accept' && decision.route !== undefined) {
            await preflightRoute(llm, decision.route, signal);
        }
        return decision;
    }
    const decision = authorizeLiveSelection(readSettings(), request, advertised);
    if (decision.kind === 'accept' && decision.route !== undefined) {
        await preflightRoute(llm, decision.route, signal);
    }
    return decision;
}
