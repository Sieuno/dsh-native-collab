/**
 * The globally named `send_message` and `interrupt_agent` tools: thin
 * model-facing adapters over the derived subagent runtime. They perform no
 * lifecycle routing of their own. `interrupt_agent` stays fire-and-return.
 *
 * Derived from DeepSeek Harness dsh-v0.2.1-rc.2
 * (687f282e8625c6b8d11ff58211a90524be2e4317), MIT.
 * @module @dsh-native-collab/tool-subagent-control
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { brandString } from '@deepseek-ai/dsh-brand'
import { defineTool, type ToolRunContext } from '@deepseek-ai/dsh-tools'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-subagent'
import {
  assertModelDeliveryEnabled,
  isCollabHostDelivery,
  requireCollabSubagents,
  resolveModelDelivery,
} from '@dsh-native-collab/subagent'
import { markAdjacentAgentSendMessageTool } from '@dsh-native-collab/subagent/internal'

export const name = 'tool-subagent-control'
export const inject = ['tools', 'subagents']

/** Tool-plane switch for the model-facing `delivery` parameter. */
export interface Config {
  /**
   * When false, `send_message` keeps the original parameter schema and rejects
   * a present `delivery` value instead of ignoring it.
   */
  deliverySelection: boolean
}

export const Config: z<Config> = z.object({
  deliverySelection: z.boolean().default(true),
})

const officialSendDescription =
  'Send a message to an active subagent or report task completion to the parent agent. '
  + 'Steer delivery arrives at a safe step boundary and wakes an idle agent. '
  + 'Success confirms inbox acceptance, not processing or a reply.'

const selectableSendDescription =
  'Send a message to an active subagent or report task completion to the parent agent. '
  + '"steer" (default) delivers at a step boundary; "queue" schedules an independent later turn. '
  + 'Success confirms inbox acceptance, not processing or a reply.'

/**
 * Read an undeclared or optional `delivery` field without treating absence as a value.
 * @param args - tool arguments after schema validation, which may still carry an extra field.
 * @returns the raw field, or undefined when the caller omitted it.
 */
function ownDelivery(args: object): unknown {
  if (!Object.hasOwn(args, 'delivery')) return undefined
  return Reflect.get(args, 'delivery')
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
function selectionEnabled(ctx: Context, config: Config): boolean {
  if (!config.deliverySelection) return false
  const runtime = ctx.get('subagents')
  if (!isCollabHostDelivery(runtime)) return false
  return runtime.modelDeliverySelection
}

interface SendMessageArgs {
  readonly agent_id?: string
  readonly target?: string
  readonly message: string
  readonly task_result?: boolean
}

/**
 * Shared `send_message` body. Address narrowing stays here so both schemas
 * keep one runtime path.
 */
async function executeSend(
  ctx: Context,
  enabled: boolean,
  args: SendMessageArgs,
  exec: ToolRunContext,
): Promise<{ readonly messageId: string }> {
  const sender = exec.agent
  if (!sender) {
    throw new Error('send_message requires a calling agent (exec.agent was undefined)')
  }
  const addresses = [args.agent_id, args.target].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  if (addresses.length !== 1 || (Object.hasOwn(args, 'agent_id') && Object.hasOwn(args, 'target'))) {
    throw new Error('send_message requires exactly one nonempty agent_id or target')
  }
  const target = addresses[0]!
  const rawDelivery = ownDelivery(args)
  assertModelDeliveryEnabled(enabled, rawDelivery)
  if (Object.hasOwn(args, 'task_result') && typeof args.task_result !== 'boolean') {
    throw new Error('task_result must be a boolean when provided')
  }
  const runtime = requireCollabSubagents(ctx)
  const message: ContentBlock[] = [{ type: 'text', text: args.message }]
  const messageId = await runtime.sendMessage(
    sender,
    brandString<SessionId>(target),
    message,
    {
      signal: exec.signal,
      ...(rawDelivery === undefined ? {} : { delivery: resolveModelDelivery(rawDelivery) }),
      ...(typeof args.task_result === 'boolean' ? { result: args.task_result } : {}),
    },
  )
  return { messageId }
}

/**
 * Register the `send_message` and `interrupt_agent` tools.
 * @param ctx - context carrying the tool registry and subagent service.
 * @param config - whether the model may select delivery.
 */
export function apply(ctx: Context, config: Config): void {
  const enabled = selectionEnabled(ctx, config)
  if (enabled) {
    ctx.tools.register(markAdjacentAgentSendMessageTool(defineTool({
      name: 'send_message',
      description: selectableSendDescription,
      parameters: {
        target: { type: 'string', description: 'Subagent session ID, or parent session ID when reporting task completion.' },
        agent_id: {
          type: 'string',
          description: 'Subagent session ID, or parent session ID when reporting task completion.',
        },
        message: {
          type: 'string',
          required: true,
          description: 'The message to deliver to the agent.',
        },
        delivery: {
          type: 'string',
          enum: ['queue', 'steer'] as const,
          description: 'Delivery mode: "steer" (default) delivers at a step boundary; "queue" schedules a later turn.',
        },
        task_result: {
          type: 'boolean',
          description: 'Set true only when reporting completed task results back to the parent agent.',
        },
      },
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
          text: `message delivered to agent ${args.agent_id ?? args.target}`,
        }],
      },
      execute: (args, exec) => executeSend(ctx, enabled, args, exec),
    })))
  } else {
    ctx.tools.register(markAdjacentAgentSendMessageTool(defineTool({
      name: 'send_message',
      description: officialSendDescription,
      parameters: {
        target: { type: 'string', description: 'Subagent session ID, or parent session ID when reporting task completion.' },
        agent_id: {
          type: 'string',
          description: 'Subagent session ID, or parent session ID when reporting task completion.',
        },
        message: {
          type: 'string',
          required: true,
          description: 'The message to deliver to the agent.',
        },
        task_result: {
          type: 'boolean',
          description: 'Set true only when reporting completed task results back to the parent agent.',
        },
      },
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
          text: `message delivered to agent ${args.agent_id ?? args.target}`,
        }],
      },
      execute: (args, exec) => executeSend(ctx, enabled, args, exec),
    })))
  }

  ctx.tools.register(defineTool({
    name: 'interrupt_agent',
    description:
      'Request an active subagent to stop its work. Returns request acceptance without waiting for termination.',
    parameters: {
      agent_id: {
        type: 'string',
        required: true,
        description: 'Session ID of the subagent to interrupt.',
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
      const caller = exec.agent
      if (!caller) {
        throw new Error('interrupt_agent requires a calling agent (exec.agent was undefined)')
      }
      ctx.subagents.interrupt(brandString<SessionId>(args.agent_id), { kind: 'ancestor', agent: caller })
      return Promise.resolve({ accepted: true })
    },
  }))
}
