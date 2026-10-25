import { applyDerivedDelegation, configSchema } from "./flow.js";
export const name = 'tool-subagent-fork';
export const inject = ['tools', 'subagents', 'systemPrompt', 'sessionProjections', 'collabUi'];
export const Config = configSchema('subagent_fork');
export function apply(ctx, config, session) {
    return applyDerivedDelegation(ctx, {
        ...config,
        toolName: config.toolName ?? 'subagent_fork',
        ownsDiscovery: false,
    }, session);
}
