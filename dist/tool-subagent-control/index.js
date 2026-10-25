/**
 * The globally named `send_message` and `interrupt_agent` tools: thin
 * model-facing adapters over the derived subagent runtime. They perform no
 * lifecycle routing of their own. `interrupt_agent` stays fire-and-return.
 *
 * Derived from DeepSeek Harness dsh-v0.2.1-rc.2
 * (687f282e8625c6b8d11ff58211a90524be2e4317), MIT.
 * @module @dsh-native-collab/tool-subagent-control
 */
import z from '@deepseek-ai/schemastery';
import { brandString } from '@deepseek-ai/dsh-brand';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { assertModelDeliveryEnabled, isCollabHostDelivery, requireCollabSubagents, resolveModelDelivery, } from '../subagent/index.js';
import { markAdjacentAgentSendMessageTool } from '../subagent/internal.js';
export const name = 'tool-subagent-control';
export const inject = ['tools', 'subagents'];
export const Config = z.object({
    deliverySelection: z.boolean().default(true),
});
const officialSendDescription = 'Send a message to an agent. A working agent receives it at its next step; an idle agent starts a new turn with it. '
    + 'Returns delivery confirmation, not the agent\'s answer.';
const selectableSendDescription = 'Send a message to an agent. delivery "steer", the default, is received at the nearest step boundary and wakes an idle agent. '
    + 'delivery "queue" schedules an independent later turn. Neither interrupts the current model request or tool call. '
    + 'Returns the accepted messageId, not proof the agent has processed the message.';
/**
 * Read an undeclared or optional `delivery` field without treating absence as a value.
 * @param args - tool arguments after schema validation, which may still carry an extra field.
 * @returns the raw field, or undefined when the caller omitted it.
 */
function ownDelivery(args) {
    if (!Object.hasOwn(args, 'delivery'))
        return undefined;
    return Reflect.get(args, 'delivery');
}
/**
 * Model delivery is offered only when both the tool config and the mounted
 * runtime allow it. A runtime that reports false, or a non-derived runtime,
 * keeps the official parameter list instead of advertising a call that the
 * service will reject.
 * @param ctx - context carrying the mounted `subagents` service.
 * @param config - tool-plane switch, which can only tighten the runtime flag.
 * @returns whether `send_message` may expose and accept `delivery`.
 */
function selectionEnabled(ctx, config) {
    if (!config.deliverySelection)
        return false;
    const runtime = ctx.get('subagents');
    if (!isCollabHostDelivery(runtime))
        return false;
    return runtime.modelDeliverySelection;
}
/**
 * Register the `send_message` and `interrupt_agent` tools.
 * @param ctx - context carrying the tool registry and subagent service.
 * @param config - whether the model may select delivery.
 */
export function apply(ctx, config) {
    const enabled = selectionEnabled(ctx, config);
    const parameters = enabled
        ? {
            target: { type: 'string', description: 'Exact direct-child session id; alias for agent_id. Supply exactly one address.' },
            agent_id: {
                type: 'string',
                description: 'The agent id of your direct continuable child, or your direct parent when you are a resident continuable child.',
            },
            message: {
                type: 'string',
                required: true,
                description: 'The message to deliver to the agent.',
            },
            delivery: {
                type: 'string',
                enum: ['queue', 'steer'],
                description: 'queue schedules an independent later turn. steer, the default, is received at the nearest step boundary and wakes an idle agent. Omit to steer. The returned messageId is inbox acceptance, not processing.',
            },
        }
        : {
            target: { type: 'string', description: 'Exact direct-child session id; alias for agent_id. Supply exactly one address.' },
            agent_id: {
                type: 'string',
                description: 'The agent id of your direct continuable child, or your direct parent when you are a resident continuable child.',
            },
            message: {
                type: 'string',
                required: true,
                description: 'The message to deliver to the agent.',
            },
        };
    ctx.tools.register(markAdjacentAgentSendMessageTool(defineTool({
        name: 'send_message',
        description: enabled ? selectableSendDescription : officialSendDescription,
        parameters,
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    messageId: { type: 'string', required: true },
                },
            },
            render: (args, _value) => [{
                    type: 'text',
                    text: `message delivered to agent ${args.agent_id}`,
                }],
        },
        async execute(args, exec) {
            const sender = exec.agent;
            if (!sender) {
                throw new Error('send_message requires a calling agent (exec.agent was undefined)');
            }
            const addresses = [args.agent_id, args.target].filter(value => typeof value === 'string' && value.trim().length > 0);
            if (addresses.length !== 1 || (Object.hasOwn(args, 'agent_id') && Object.hasOwn(args, 'target'))) {
                throw new Error('send_message requires exactly one nonempty agent_id or target');
            }
            const target = addresses[0];
            const rawDelivery = ownDelivery(args);
            assertModelDeliveryEnabled(enabled, rawDelivery);
            const runtime = requireCollabSubagents(ctx);
            const message = [{ type: 'text', text: args.message }];
            const messageId = await runtime.sendMessage(sender, brandString(target), message, rawDelivery === undefined
                ? { signal: exec.signal }
                : { signal: exec.signal, delivery: resolveModelDelivery(rawDelivery) });
            return { messageId };
        },
    })));
    ctx.tools.register(defineTool({
        name: 'interrupt_agent',
        description: 'Ask a subagent to stop its current work. This call returns without waiting for it to stop. '
            + 'You can continue a local direct child\'s conversation later with send_message. '
            + 'External executions stop permanently and cannot receive follow-ups. Subagents it started will keep running.',
        parameters: {
            agent_id: {
                type: 'string',
                required: true,
                description: 'The id of an agent created under you: your direct child or a deeper descendant.',
            },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    accepted: { type: 'boolean', required: true },
                },
            },
            render: (args, _value) => [{
                    type: 'text',
                    text: `interrupt requested for agent ${args.agent_id}`,
                }],
        },
        execute(args, exec) {
            const caller = exec.agent;
            if (!caller) {
                throw new Error('interrupt_agent requires a calling agent (exec.agent was undefined)');
            }
            ctx.subagents.interrupt(brandString(args.agent_id), { kind: 'ancestor', agent: caller });
            return Promise.resolve({ accepted: true });
        },
    }));
}
