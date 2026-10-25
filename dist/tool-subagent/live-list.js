/**
 * Live discovery for the derived fresh tool when compatibility mode is off.
 * Catalog membership is display metadata. Allowed but unadvertised ids stay listed.
 *
 * Derived from DeepSeek Harness dsh-v0.2.1-rc.2 tool-subagent (MIT).
 */
import { defineTool } from '@deepseek-ai/dsh-tools';
import { discoverLiveRoutes } from "./delegation.js";
/**
 * Register `list_subagent_models` so each call reads the current Host allowlist.
 * @param ctx - Context whose tool registry owns the discovery definition.
 */
export function registerLiveListSubagentModels(ctx) {
    ctx.tools.register(defineTool({
        name: 'list_subagent_models',
        description: 'Discover LLM routes for subagents without changing the current Agent. Call with no arguments to list '
            + 'providers on the current host allowlist, with `provider` to list its allowed models, or with `provider` '
            + 'and `model` to inspect that exact allowed model. Catalog membership is advisory: an allowed id that is '
            + 'not advertised is still listed and is not rejected here. Use the returned ids with a delegation tool\'s '
            + '`provider`, `model`, and `reasoning_effort` fields.',
        parameters: {
            provider: {
                type: 'string',
                description: 'LLM provider id on the current host allowlist. Omit to list allowed providers.',
            },
            model: {
                type: 'string',
                description: 'Exact model id to inspect. Requires provider; omit to list that provider\'s allowed models.',
            },
        },
        output: {
            schema: { type: 'string' },
            render: (_args, result) => [{ type: 'text', text: result }],
        },
        async execute(args) {
            const settingsService = ctx.get('subagentModelSelection');
            if (settingsService === undefined) {
                throw new Error('cannot discover child LLM routes because the host subagentModelSelection service is unavailable');
            }
            const settings = settingsService.current();
            const llm = ctx.get('llm');
            const providers = llm === undefined ? [] : llm.listProviders().map(provider => ({
                id: provider.id,
                name: provider.name,
            }));
            let advertised = [];
            if (llm !== undefined && args.provider !== undefined && args.provider.length > 0) {
                try {
                    const models = await llm.listModels(args.provider);
                    advertised = models.map(model => ({ provider: args.provider, id: model.id, name: model.name }));
                }
                catch (error) {
                    void error;
                    advertised = [];
                }
            }
            return discoverLiveRoutes(settings, providers, advertised, args);
        },
    }));
}
