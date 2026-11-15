import { AsyncLocalStorage } from 'node:async_hooks';
import { ModelPolicy } from './model-policy.js';
import { MessagePolicy } from './messages.js';
import { DELEGATION_GUIDANCE, WAKE_GUIDANCE } from './guidance.js';
/** Adapt one official plugin scope, never the shared registry, runtime, or Session projection. */
export function nativeToolContext(ctx, kind, preferences, messages, guidance, onDispose) {
    const registry = ctx.tools;
    const models = new ModelPolicy(ctx, preferences);
    const reports = new AsyncLocalStorage();
    const definitions = new Map();
    let closed = false;
    const decorate = (definition) => {
        if (closed)
            return definition;
        definitions.set(definition, { execute: definition.execute, parameters: definition.parameters, description: definition.description });
        const execute = definition.execute.bind(definition);
        if (kind === 'delegation' && (definition.name === 'subagent' || definition.name === 'list_subagent_models')) {
            definition.execute = (args, exec) => models.run(definition.name, args, exec, () => execute(args, exec));
        }
        else if (definition.name === 'send_message') {
            const properties = definition.parameters.properties;
            if (!properties || typeof properties !== 'object')
                throw new Error('Unsupported native send_message schema');
            definition.parameters = { ...definition.parameters, properties: {
                    ...properties,
                    task_result: { type: 'boolean', description: 'True only for a completed-task report to your direct parent; exempts this send from the automatic wake allowance.' },
                } };
            definition.execute = (input, exec) => {
                const args = input !== null && typeof input === 'object' ? input : {};
                if (Object.hasOwn(args, 'delivery'))
                    throw new Error('send_message uses native steer delivery; omit delivery');
                if (args.task_result !== undefined && typeof args.task_result !== 'boolean')
                    throw new Error('task_result must be a boolean');
                return reports.run(args.task_result === true, () => execute(input, exec));
            };
            definition.description += ' Success confirms inbox acceptance, not processing or a reply.';
        }
        return definition;
    };
    const tools = new Proxy(registry, {
        get(target, key) {
            if (key === 'register')
                return (definition, options) => {
                    const off = target.register(decorate(definition), options);
                    return () => {
                        off();
                        const original = definitions.get(definition);
                        if (original)
                            Object.assign(definition, original);
                        definitions.delete(definition);
                    };
                };
            const value = Reflect.get(target, key);
            return typeof value === 'function' ? value.bind(target) : value;
        },
    });
    const overrides = { tools };
    if (kind === 'delegation') {
        const projections = ctx.sessionProjections;
        overrides.sessionProjections = new Proxy(projections, {
            get(target, key) {
                if (key === 'register')
                    return async (definition) => {
                        if (definition.key !== 'subagentModelSelectionPolicy')
                            throw new Error('Unsupported native delegation projection');
                        const handle = await target.register(definition);
                        return models.reader(handle);
                    };
                const value = Reflect.get(target, key);
                return typeof value === 'function' ? value.bind(target) : value;
            },
        });
    }
    else {
        const native = ctx.subagents;
        overrides.subagents = new Proxy(native, {
            get(target, key) {
                if (key === 'sendMessage')
                    return (...args) => {
                        const [sender, targetId, , options] = args;
                        return messages.send(sender, targetId, reports.getStore() === true, options.signal, () => target.sendMessage(...args));
                    };
                const value = Reflect.get(target, key);
                return typeof value === 'function' ? value.bind(target) : value;
            },
        });
    }
    // Own context properties leave the original services and all other consumers untouched.
    const previous = Object.fromEntries(Object.keys(overrides).map(key => [key, Object.getOwnPropertyDescriptor(ctx, key)]));
    for (const [key, value] of Object.entries(overrides))
        Object.defineProperty(ctx, key, { value, configurable: true });
    const disposers = [];
    const dispose = () => {
        if (closed)
            return;
        closed = true;
        for (const off of disposers)
            off();
        for (const [definition, original] of definitions)
            Object.assign(definition, original);
        definitions.clear();
        for (const [key, descriptor] of Object.entries(previous)) {
            if (descriptor)
                Object.defineProperty(ctx, key, descriptor);
            else
                Reflect.deleteProperty(ctx, key);
        }
        ctx.emit('tools/change');
        onDispose();
    };
    ctx.effect(() => dispose, 'nativeCollab.toolContext()');
    if (guidance)
        disposers.push(ctx.systemPrompt.section({
            name: kind === 'delegation' ? 'native-collab:delegation' : 'native-collab:messages',
            order: ctx.systemPrompt.getSectionOrder('TOOL_SUBAGENT'),
            text: ({ scope, toolSet }) => {
                const settings = preferences();
                if (kind === 'control')
                    return registry.get('send_message', scope, toolSet) ? WAKE_GUIDANCE : '';
                const spawn = registry.get('subagent', scope, toolSet);
                // Native installs fresh and fork separately; contribute this policy only beside the fresh tool.
                if (!spawn)
                    return '';
                return [
                    DELEGATION_GUIDANCE,
                    settings.modelSource !== 'conversation'
                        ? `Subagent model choices use ${settings.modelSource === 'settings' ? 'the current configured child-model allowlist' : 'currently registered LLM providers'}. Query list_subagent_models when selecting an explicit route; model settings can change between calls.` : '',
                ].filter(Boolean).join('\n\n');
            },
        }));
    return dispose;
}
