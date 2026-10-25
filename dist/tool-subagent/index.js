import { applyDerivedDelegation, configSchema } from "./flow.js";
export const name = 'tool-subagent';
export const inject = ['tools', 'subagents', 'systemPrompt', 'sessionProjections', 'collabUi'];
export const Config = configSchema('subagent');
export function apply(ctx, config, session) {
    return applyDerivedDelegation(ctx, {
        ...config,
        toolName: config.toolName ?? 'subagent',
        ownsDiscovery: true,
    }, session);
}
