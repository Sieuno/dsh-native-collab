import { AsyncLocalStorage } from 'node:async_hooks';
function routes(value) {
    if (!Array.isArray(value))
        throw new Error('Current subagent model settings are unavailable or malformed');
    const seen = new Set();
    return value.map(route => {
        if (!route || typeof route.provider !== 'string' || !route.provider || typeof route.model !== 'string' || !route.model) {
            throw new Error('Current subagent model settings contain an invalid route');
        }
        const key = JSON.stringify([route.provider, route.model]);
        if (seen.has(key))
            throw new Error('Current subagent model settings repeat a route');
        seen.add(key);
        return { provider: route.provider, model: route.model };
    });
}
/** Only the official tool's retained reader sees the per-call policy. Nothing is appended to the Session. */
export class ModelPolicy {
    ctx;
    preferences;
    current = new AsyncLocalStorage();
    constructor(ctx, preferences) {
        this.ctx = ctx;
        this.preferences = preferences;
    }
    reader(handle) {
        const stateOf = (session) => {
            const selection = this.current.getStore();
            return selection?.session === session ? selection.routes : handle.stateOf(session);
        };
        return { stateOf, readerFor: session => () => stateOf(session), dispose: () => handle.dispose() };
    }
    async run(name, input, exec, next) {
        const preferences = this.preferences();
        if (preferences.modelSource === 'conversation')
            return next();
        if (name !== 'list_subagent_models' && input !== null && typeof input === 'object'
            && !('provider' in input) && !('model' in input) && !('reasoning_effort' in input))
            return next();
        if (!exec.agent)
            throw new Error('Subagent model selection requires a calling agent');
        const args = input !== null && typeof input === 'object' ? input : {};
        // Let the official tool validate malformed JSON and paired route/effort fields.
        if ((args.provider !== undefined && typeof args.provider !== 'string')
            || (args.model !== undefined && typeof args.model !== 'string'))
            return next();
        let selected;
        if (preferences.modelSource === 'settings') {
            const settings = this.ctx.get('settings');
            if (!settings)
                throw new Error('Current subagent model settings require the settings service');
            const rows = settings.describe().filter(row => row.ns === 'subagent-model-selection-settings');
            if (rows.length !== 1)
                throw new Error('Current subagent model settings require one active native settings namespace');
            const value = rows[0].value;
            if (!value || typeof value !== 'object' || !('enabled' in value) || !('allowedModels' in value)
                || typeof value.enabled !== 'boolean')
                throw new Error('Current subagent model settings are malformed');
            selected = value.enabled ? routes(value.allowedModels) : [];
            if (value.enabled && selected.length === 0)
                throw new Error('Enabled native subagent model settings contain no authorized routes');
        }
        else {
            const llm = this.ctx.get('llm');
            if (!llm)
                throw new Error('All-model selection requires the LLM service');
            const providers = llm.listProviders();
            if (typeof args.provider === 'string' && args.provider && !providers.some(p => p.id === args.provider)) {
                throw new Error(`LLM provider "${args.provider}" is not registered`);
            }
            if (typeof args.provider === 'string' && typeof args.model === 'string' && args.provider && args.model) {
                // Authorization is not model validation: the official adapter preflight still resolves this exact route.
                selected = [{ provider: args.provider, model: args.model }];
            }
            else if (name === 'list_subagent_models') {
                if (typeof args.provider === 'string' && args.provider) {
                    const models = await llm.listModels(args.provider);
                    selected = models.length ? models.map(model => ({ provider: args.provider, model: model.id }))
                        : [{ provider: args.provider, model: '*' }];
                }
                else {
                    // Provider-only discovery never resolves a model. These placeholders exist only in this invocation.
                    selected = providers.map(provider => ({ provider: provider.id, model: '*' }));
                }
            }
            else
                selected = [];
        }
        exec.signal.throwIfAborted();
        return this.current.run({ session: exec.agent.session, routes: selected }, next);
    }
}
