/** Scoped model-facing tools for the opt-in Agent Teams runtime. */
import { inspect } from 'node:util';
import { brandString } from '@deepseek-ai/dsh-brand';
import z from '@deepseek-ai/schemastery';
import { assertTeamMessageIdentity, observeTeamMembership, TeamError, TeamTaskId } from '../agent-team/index.js';
import { isCollabHostDelivery } from '../subagent/index.js';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { listIndependentAgents, waitForAgents } from "./agent-directory.js";
/** Cordis plugin name. */
export const name = 'tool-agent-team';
/** Services required by the Team tool plugin. */
export const inject = ['agents', 'agentTeams', 'subagents', 'tools', 'systemPrompt'];
/** Loader schema for the opt-in Team tool plugin. */
export const Config = z.object({
    interrupt: z.boolean().default(true),
    freshProvider: z.string().default('spawn'),
    forkProvider: z.string().default('fork'),
});
/** Model switch. Absent on an older stub follows the historical selection flag. */
function modelEnhancementOn(ctx) {
    return ctx.agentTeams.selectionEnhanced === true;
}
/**
 * Communication switch. A real service always sets the field.
 * A stub that only has the historical flag keeps that coupling.
 */
function communicationEnhancementOn(ctx) {
    const teams = ctx.agentTeams;
    return typeof teams.communicationEnhanced === 'boolean'
        ? teams.communicationEnhanced
        : teams.selectionEnhanced === true;
}
/** Whether the mounted runtime currently allows the queue delivery parameter. */
function deliveryQueueAdvertised(ctx) {
    if (!communicationEnhancementOn(ctx))
        return false;
    const runtime = ctx.get('subagents');
    return isCollabHostDelivery(runtime) && runtime.modelDeliverySelection;
}
/** Model-facing collaboration guidance shared by Lead and teammates. */
function teamPolicy(interrupt, modelOn, communicationOn, queue) {
    const base = `Agent Teams is available in this session.

Delegation choice: prefer spawn_teammate when the work needs a long-lived collaborator with a standing role or division of labor in the project — a teammate shares the Team task board, stays addressable by name, and can take follow-up work later. Prefer subagent or subagent_fork for temporary or phase-scoped tasks that should return a result and end; a subagent keeps its own independent task scope instead of the shared Team board. These are different lifecycles and addresses: a Team teammate is found by its member name via list_agents and can receive later messages or shared-task assignments; a subagent is an independently managed delegation with its own subagent id/result flow. Do not treat Agent Teams as the default for every delegation; choose based on the work rather than a fixed rule.

Shared workspace & files: The Team Lead and all teammates share the same working directory and filesystem. Edits are immediately visible to every member. Split write work into disjoint scopes, record expected write scopes on shared tasks, and use task dependencies when work must be ordered. Write-scope overlap is advisory, not a lock. Prefer read/edit/write for file changes. If a file operation returns FS_STALE_VERSION, read the current file, rebase your intended change onto the new content, and retry. Bash, formatters, code generators, and scripts are not fully protected by the filesystem version guard; coordinate them explicitly and have the Lead review the final diff and run tests.

Target addressing & messaging: Use the target returned by spawn_teammate or list_agents for Team member operations${interrupt ? ' (including interrupt_agent)' : ''}, or as owner when assigning or filtering shared tasks. Team send_message first matches the target against the caller's Team roster by member name or id; a unique match uses Team messaging. Only when there is no Team match does it treat target as a subagent session id, and that send is still subject to subagent runtime authorization; do not confuse Team names, subagent ids, or their lifecycles, and do not assume arbitrary cross-agent delivery. A peer message starts with its sender name. A successful send confirms acceptance into the recipient's inbox, not that the recipient has processed or replied.

Delivery & states: Team send_message delivery defaults to "steer": a running target receives it at a safe step boundary, without aborting the current model request or tool call, while an inactive target starts or resumes a turn. If delivery selection is enabled, "queue" schedules an independent later turn instead of steering. "inactive" means no turn is currently executing; it does not indicate task completion, success, failure, or waiting for other agents. "provisioning" means member creation is in progress; "failed" means member creation failed.

Rate limits & reporting: Automatic messages are rate-limited; a limit error rejects only that send and does not stop your work. Do not repeatedly retry a rate-limited send; wait for user input before retrying. Use task_result: true only for a completed-task report on an authorized upward path: a teammate reporting to the Team Lead named "lead", or a resident continuable subagent reporting to its exact live direct parent. This exception cannot bypass limits for ordinary requests, peer or downward messages, or unauthorized targets.

Shared-task board: Workflow is list, get, claim with the current revision, perform the work, then complete. Task readiness never starts an owner automatically. list_agents defaults to "all": Team rows carry kind "team" and a target name; independent subagents carry kind "subagent" and a session id. Use scope "team" for shared-task owners, "children" for direct independent children, or "descendants" for the independent tree. Do not assign a subagent id as a Team task owner.

Observation & interrupts: wait_agent defaults to "all" and observes Team changes plus independent descendant activity, including preparing and external executions. Scope "team" or "subagents" narrows the wait. It never wakes an Agent and noProgress is not proof of task completion. Use send_message to resume required inactive continuable agents; one-shot/external entries do not accept follow-ups. Re-list after wakeup or timeout and verify actual results. Use interrupt_agent to request stopping a teammate when available; a successful call does not guarantee an immediate stop. The Lead must wait for required teammates before giving the final answer.

Execution rhythm: Ask each delegate to report progress at checkpoints and to send a result message when it finishes. Use wait_agent only when you specifically must pause all other activity until a teammate or subagent completes; otherwise keep working and let its report wake you.`;
    const selection = modelOn
        ? 'Model selection is enabled: spawn_teammate accepts optional provider and model together, and optional reasoning_effort. Omit them to inherit the caller route. A changed provider or model without reasoning_effort does not keep the parent effort.'
        : 'Model selection is disabled: spawn_teammate inherits the caller route; do not supply provider, model, or reasoning_effort.';
    const delivery = !communicationOn
        ? 'send_message delivers messages at step boundaries; the delivery argument is rejected, so omit it.'
        : queue
            ? 'send_message accepts optional delivery "steer" (default) or "queue"; other values are rejected.'
            : 'send_message does not accept the delivery argument in this session; omit it.';
    const interruptPolicy = interrupt
        ? ' interrupt_agent uses the same Team-roster-first address distinction: a Team match requires Lead authority, otherwise use a live descendant subagent session id under your ancestor authority. Do not retry a failed Team interrupt as a subagent interrupt. Acceptance is not confirmation that the target has stopped; await its actual outcome. A message asking the target to stop is not an interrupt signal.'
        : '';
    return `${base}

${selection} ${delivery}${interruptPolicy}`;
}
/**
 * One model-facing roster row. The Lead pseudo-row omits the
 * teammate-only provisioning fields, so only identity, role, status, and
 * diagnostics are required.
 */
const MEMBER_VIEW_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        target: { type: 'string', required: true },
        role: { type: 'string', required: true, enum: ['lead', 'teammate'] },
        status: { type: 'string', required: true, enum: ['running', 'inactive', 'provisioning', 'failed'] },
        description: { type: 'string' },
        provider: { type: 'string' },
        context: { type: 'string', enum: ['fresh', 'fork'] },
        model: { type: 'string' },
        llmProvider: { type: 'string' },
        modelSource: { type: 'string', enum: ['own-request', 'creation-default'] },
        diagnostics: { type: 'array', required: true, items: { type: 'string' } },
    },
};
/** Expose the member name as its model-facing target. */
function modelMember(member) {
    const { id: _id, name, ...details } = member;
    return { target: name, ...details };
}
/** One shared task, matching the public `TeamTaskView`. */
const TASK_VIEW_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        id: { type: 'string', required: true },
        revision: { type: 'integer', required: true },
        subject: { type: 'string', required: true },
        description: { type: 'string', required: true },
        status: { type: 'string', required: true, enum: ['pending', 'in_progress', 'completed', 'deleted'] },
        ownerName: { type: 'string' },
        blockedBy: { type: 'array', required: true, items: { type: 'string' } },
        writeScopes: { type: 'array', required: true, items: { type: 'string' } },
        ready: { type: 'boolean', required: true },
        writeScopeWarnings: { type: 'array', required: true, items: { type: 'string' } },
    },
};
const SPAWN_VALUE_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        member: { ...MEMBER_VIEW_SCHEMA, required: true },
    },
};
const MEMBER_LIST_VALUE_SCHEMA = {
    type: 'array',
    items: {
        oneOf: [
            { ...MEMBER_VIEW_SCHEMA, properties: { ...MEMBER_VIEW_SCHEMA.properties, kind: { type: 'string', required: true, enum: ['team'] } } },
            {
                type: 'object', additionalProperties: false,
                properties: {
                    kind: { type: 'string', required: true, enum: ['subagent'] },
                    id: { type: 'string', required: true },
                    mode: { type: 'string', required: true, enum: ['continuable', 'one-shot', 'external', 'unknown'] },
                    label: { type: 'string' },
                    status: { type: 'string', required: true, enum: ['running', 'inactive', 'unknown'] },
                    parent: { type: 'string' }, depth: { type: 'number' },
                },
            },
            {
                type: 'object', additionalProperties: false,
                properties: {
                    kind: { type: 'string', required: true, enum: ['diagnostic'] },
                    id: { type: 'string', required: true },
                    reason: { type: 'string', required: true, enum: ['corrupt', 'unsupported', 'unavailable'] },
                    parent: { type: 'string' }, depth: { type: 'number' },
                },
            },
        ],
    },
};
const SEND_VALUE_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        sent: { type: 'boolean', required: true, const: true },
    },
};
/** `noProgress` is present only on the model-only shortcut that skips the wait. */
const WAIT_VALUE_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        timedOut: { type: 'boolean', required: true },
        noProgress: {
            type: 'object',
            additionalProperties: false,
            properties: {
                reason: { type: 'string', required: true, const: 'no-active-agent' },
                message: { type: 'string', required: true },
            },
        },
    },
};
const INTERRUPT_VALUE_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        accepted: { type: 'boolean', required: true },
        previousStatus: { type: 'string', enum: ['running', 'inactive'] },
    },
};
const TASK_LIST_VALUE_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        tasks: { type: 'array', required: true, items: TASK_VIEW_SCHEMA },
        nextCursor: { type: 'integer' },
    },
};
/**
 * Declare one canonical output schema with compact model-facing JSON. Every
 * Team result is a fixed record, so the declared schema is what makes the
 * compiler check `execute` against the value the model is promised.
 * @param schema - canonical value schema for one tool.
 * @returns the `output` declaration accepted by {@link defineTool}.
 */
function jsonOutput(schema) {
    return {
        schema,
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    };
}
/** Recover the exact caller guaranteed by Agent-scoped tool discovery. */
function callingAgent(agent, toolName) {
    /* v8 ignore next 2 -- Team tools are registered only in an exact Agent scope, so discovery supplies this carrier. */
    if (agent === undefined)
        throw new Error(`${toolName} requires a calling Agent`);
    return agent;
}
/** Register the complete Team tool set in one exact Agent scope. */
function presentField(args, key) {
    return Object.hasOwn(args, key) && args[key] !== undefined;
}
function rejectDisabledFields(args, keys, toolName, message) {
    if (!keys.some(key => presentField(args, key)))
        return;
    throw new TeamError(message, 'TEAM_ENHANCEMENT_DISABLED');
}
/** Keep non-Error host rejections readable at the send_message/tool boundary. */
function normalizeSendFailure(error) {
    if (error instanceof Error)
        return error;
    let detail;
    try {
        detail = typeof error === 'object' && error !== null && 'message' in error
            && typeof error.message === 'string'
            ? error.message
            : inspect(error, { breakLength: Infinity, compact: true, depth: 4 });
    }
    catch {
        detail = '<unprintable rejection>';
    }
    return new TeamError(`send_message failed: ${detail}`, 'TEAM_SEND_FAILURE', { cause: error });
}
function install(agent, ctx, config) {
    const scoped = agent.ctx;
    const modelOn = modelEnhancementOn(ctx);
    const communicationOn = communicationEnhancementOn(ctx);
    const queue = deliveryQueueAdvertised(ctx);
    const disposers = [];
    const register = (disposer) => { disposers.push(disposer); };
    // LIFO teardown without mutating the array: a second call must not reverse it again.
    const disposeAll = () => {
        for (let index = disposers.length - 1; index >= 0; index -= 1)
            void disposers[index]?.();
    };
    try {
        register(scoped.systemPrompt.section({
            name: 'team:policy',
            order: scoped.systemPrompt.getSectionOrder('TEAM_POLICY'),
            text: teamPolicy(config.interrupt, modelOn, communicationOn, queue),
        }));
        register(scoped.systemPrompt.context({
            name: 'team:identity',
            order: scoped.systemPrompt.getContextOrder('TEAM_IDENTITY'),
            required: true,
            text: () => {
                const { role, name } = ctx.agentTeams.membership(agent);
                if (role === 'lead') {
                    return 'You are the Team Lead named "lead".\n'
                        + 'Use list_agents({}) to find teammates and their current status.\n'
                        + 'To message a teammate, call send_message({ target: "<teammate name>", message: "..." }).';
                }
                return `You are teammate "${name}". Your Team Lead is named "lead".\n`
                    + 'To report or message your Team Lead: send_message({ target: "lead", message: "..." }).\n'
                    + 'To message another teammate: send_message({ target: "<teammate name>", message: "..." }).\n'
                    + 'Use list_agents({}) to see current teammates and their names.';
            },
        }));
        register(scoped.tools.register(defineTool({
            name: 'spawn_teammate',
            description: 'Create a named Team member for ongoing coordination, direct messaging, or shared task participation. For one-off bounded tasks, prefer subagent. Only the Team Lead may call this tool.',
            parameters: {
                name: { type: 'string', required: true, description: 'Unique lower-kebab-case teammate name.' },
                description: { type: 'string', required: true, description: 'Short description of the delegated responsibility.' },
                prompt: { type: 'string', required: true, description: 'Initial task for the teammate.' },
                context: {
                    type: 'string',
                    enum: ['fresh', 'fork'],
                    description: '"fresh" (default) starts a clean session; "fork" inherits the completed conversation history from the Lead.',
                },
                ...modelOn ? {
                    provider: { type: 'string', description: 'LLM provider for the teammate (requires model). Omit both to inherit the caller route.' },
                    model: { type: 'string', description: 'Model ID for the teammate (requires provider).' },
                    reasoning_effort: { type: 'string', description: 'Child reasoning effort. Omit to use model default.' },
                } : {},
            },
            output: jsonOutput(SPAWN_VALUE_SCHEMA),
            async execute(args, exec) {
                if (!modelOn)
                    rejectDisabledFields(args, ['provider', 'model', 'reasoning_effort'], 'spawn_teammate', 'spawn_teammate enhancement fields are not accepted while selection enhancement is off');
                const agent = callingAgent(exec.agent, 'spawn_teammate');
                const context = args.context ?? 'fresh';
                const provider = 'provider' in args && typeof args.provider === 'string' ? args.provider : undefined;
                const model = 'model' in args && typeof args.model === 'string' ? args.model : undefined;
                const reasoningEffort = 'reasoning_effort' in args && typeof args.reasoning_effort === 'string'
                    ? args.reasoning_effort
                    : undefined;
                const result = await ctx.agentTeams.spawnTeammate(agent, {
                    name: args.name,
                    description: args.description,
                    prompt: [{ type: 'text', text: args.prompt }],
                    context,
                    provider: context === 'fork' ? config.forkProvider : config.freshProvider,
                    signal: exec.signal,
                    ...provider === undefined && model === undefined && reasoningEffort === undefined ? {} : {
                        agentOptions: {
                            ...provider === undefined ? {} : { provider },
                            ...model === undefined ? {} : { model },
                            ...reasoningEffort === undefined ? {} : { reasoningEffort },
                        },
                    },
                });
                return { member: modelMember(result.member) };
            },
        })));
        register(scoped.tools.register(defineTool({
            name: 'send_message',
            description: 'Send a message to a Team member (by name or id) or an authorized subagent session id. Steer delivery arrives at a safe step boundary; queue schedules a later turn. Success confirms acceptance into the inbox, not processing or a reply.',
            parameters: {
                target: { type: 'string', required: true, description: 'Recipient Team member name/ID, or an authorized subagent session ID.' },
                message: { type: 'string', required: true, description: 'Self-contained message for the target.' },
                task_result: {
                    type: 'boolean',
                    description: 'Set true only when reporting completed task results upward: a teammate to the Team Lead, or a child to its direct parent.'
                },
                ...queue ? {
                    delivery: {
                        type: 'string',
                        enum: ['queue', 'steer'],
                        description: 'Delivery mode: "steer" (default) delivers at a step boundary; "queue" schedules a later turn.'
                    },
                } : {},
            },
            output: jsonOutput(SEND_VALUE_SCHEMA),
            async execute(args, exec) {
                if (presentField(args, 'task_result') && typeof args.task_result !== 'boolean') {
                    throw new TeamError('task_result must be a boolean when provided', 'TEAM_TASK_RESULT_INVALID');
                }
                if (!communicationOn)
                    rejectDisabledFields(args, ['delivery'], 'send_message', 'send_message delivery is not accepted while communication enhancement is off');
                else if (!queue && presentField(args, 'delivery')) {
                    throw new TeamError('delivery selection is disabled; queue was rejected', 'TEAM_DELIVERY_DISABLED');
                }
                const delivery = 'delivery' in args ? args.delivery : undefined;
                if (delivery !== undefined && delivery !== 'queue' && delivery !== 'steer') {
                    throw new TeamError('delivery must be "queue" or "steer"', 'TEAM_DELIVERY_INVALID');
                }
                try {
                    const caller = callingAgent(exec.agent, 'send_message');
                    assertTeamMessageIdentity(ctx.agentTeams, caller, args.target);
                    const matches = ctx.agentTeams.listMembers(caller).filter(member => member.name === args.target || member.id === args.target);
                    if (matches.length > 1)
                        throw new TeamError('ambiguous Team target', 'TEAM_MEMBER_NOT_FOUND');
                    const content = [{ type: 'text', text: args.message }];
                    if (matches.length === 1) {
                        await ctx.agentTeams.sendMessage(caller, {
                            target: matches[0].name, content, signal: exec.signal,
                            taskResult: args.task_result,
                            ...delivery === undefined ? {} : { delivery },
                        });
                    }
                    else {
                        // Decide once before delivery. A failed Team send never falls through.
                        await ctx.subagents.sendMessage(caller, brandString(args.target), content, {
                            signal: exec.signal,
                            ...(typeof args.task_result === 'boolean' ? { result: args.task_result } : {}),
                            ...delivery === undefined ? {} : { delivery },
                        });
                    }
                }
                catch (error) {
                    throw normalizeSendFailure(error);
                }
                return { sent: true };
            },
        })));
        register(scoped.tools.register(defineTool({
            name: 'list_agents',
            description: 'List Team members and subagents with their status and IDs. Only active or continuable direct subagents accept send_message; deeper descendants accept interrupt_agent.',
            parameters: {
                scope: {
                    type: 'string', enum: ['all', 'team', 'children', 'descendants'],
                    description: 'all (default): Team members and direct subagents. team: Team roster only. children: direct subagents only. descendants: full subagent subtree.',
                },
            },
            output: jsonOutput(MEMBER_LIST_VALUE_SCHEMA),
            async execute(args, exec) {
                const caller = callingAgent(exec.agent, 'list_agents');
                const members = ctx.agentTeams.listMembers(caller);
                const scope = args.scope ?? 'all';
                const team = scope === 'all' || scope === 'team'
                    ? members.map(member => ({ ...modelMember(member), kind: 'team' })) : [];
                if (scope === 'team')
                    return team;
                return [...team, ...await listIndependentAgents(ctx, caller, scope, members, exec.signal)];
            },
        })));
        register(scoped.tools.register(defineTool({
            name: 'wait_agent',
            description: 'Wait for activity or status changes in Team members or subagents. Returns when activity occurs or timeout is reached; noProgress indicates no active work in scope. Do not poll.',
            parameters: {
                timeout_ms: {
                    type: 'integer',
                    description: 'Wait duration in milliseconds (10000 to 3600000). Defaults to 30000.',
                },
                scope: {
                    type: 'string', enum: ['all', 'team', 'subagents'],
                    description: 'all (default): observe Team and subagents; team: Team only; subagents: subagents only.',
                },
            },
            output: jsonOutput(WAIT_VALUE_SCHEMA),
            async execute(args, exec) {
                return await waitForAgents(ctx, callingAgent(exec.agent, 'wait_agent'), args.scope ?? 'all', args.timeout_ms ?? 30_000, exec.signal);
            },
        })));
        if (config.interrupt) {
            register(scoped.tools.register(defineTool({
                name: 'interrupt_agent',
                description: 'Request that a Team member or live descendant subagent stop its current work. Team members require Team Lead authority. Returns request acceptance, not proof that work has already stopped.',
                parameters: {
                    target: { type: 'string', required: true, description: 'Exact Team member name/id, or live descendant subagent session id under your ancestor authority (failed Team interrupt never falls through).' },
                },
                output: jsonOutput(INTERRUPT_VALUE_SCHEMA),
                execute(args, exec) {
                    const caller = callingAgent(exec.agent, 'interrupt_agent');
                    const matches = ctx.agentTeams.listMembers(caller).filter(member => member.name === args.target || member.id === args.target);
                    if (matches.length > 1)
                        throw new TeamError('ambiguous Team target', 'TEAM_MEMBER_NOT_FOUND');
                    if (matches.length === 1) {
                        const result = ctx.agentTeams.interrupt(caller, matches[0].name);
                        return Promise.resolve({ accepted: true, ...result });
                    }
                    ctx.subagents.interrupt(brandString(args.target), { kind: 'ancestor', agent: caller });
                    return Promise.resolve({ accepted: true });
                },
            })));
        }
        register(scoped.tools.register(defineTool({
            name: 'team_task_create',
            description: 'Create a new pending task on the shared Team task board.',
            parameters: {
                subject: { type: 'string', required: true, description: 'Concise task title.' },
                description: { type: 'string', required: true, description: 'Complete task details and acceptance criteria.' },
                blocked_by: { type: 'array', items: { type: 'string' }, description: 'Task ids that must complete first.' },
                write_scopes: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Advisory workspace-relative file or directory prefixes this task expects to modify.',
                },
            },
            output: jsonOutput(TASK_VIEW_SCHEMA),
            async execute(args, exec) {
                return await ctx.agentTeams.createTask(callingAgent(exec.agent, 'team_task_create'), {
                    subject: args.subject,
                    description: args.description,
                    ...args.blocked_by === undefined ? {} : { blockedBy: args.blocked_by.map(TeamTaskId) },
                    ...args.write_scopes === undefined ? {} : { writeScopes: args.write_scopes },
                });
            },
        })));
        register(scoped.tools.register(defineTool({
            name: 'team_task_list',
            description: 'List shared tasks with status, owner, revision, blockers, and write scopes.',
            parameters: {
                status: {
                    type: 'string',
                    enum: ['pending', 'in_progress', 'completed'],
                    description: 'Optional exact status filter.',
                },
                owner: { type: 'string', description: 'Optional member target from spawn_teammate or list_agents, matching ownerName; use unowned for tasks without an owner.' },
                ready: { type: 'boolean', description: 'Optional readiness filter.' },
                cursor: { type: 'integer', description: 'Zero-based result offset. Defaults to 0.' },
                limit: { type: 'integer', description: 'Number of rows, 1 through 100. Defaults to 50.' },
            },
            output: jsonOutput(TASK_LIST_VALUE_SCHEMA),
            execute(args, exec) {
                const status = args.status;
                const filtered = ctx.agentTeams.listTasks(callingAgent(exec.agent, 'team_task_list')).filter(task => (status === undefined || task.status === status)
                    && (args.owner === undefined || (args.owner === 'unowned' ? task.ownerName === undefined : task.ownerName === args.owner))
                    && (args.ready === undefined || task.ready === args.ready));
                const cursor = args.cursor ?? 0;
                const limit = args.limit ?? 50;
                if (!Number.isSafeInteger(cursor) || cursor < 0)
                    throw new Error('cursor must be a non-negative safe integer');
                if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
                    throw new Error('limit must be an integer from 1 through 100');
                return Promise.resolve({
                    tasks: filtered.slice(cursor, cursor + limit),
                    ...(cursor + limit < filtered.length ? { nextCursor: cursor + limit } : {}),
                });
            },
        })));
        register(scoped.tools.register(defineTool({
            name: 'team_task_get',
            description: 'Get details and latest revision of a shared task.',
            parameters: {
                task_id: { type: 'string', required: true, description: 'Shared task id.' },
            },
            output: jsonOutput(TASK_VIEW_SCHEMA),
            async execute(args, exec) {
                return ctx.agentTeams.getTask(callingAgent(exec.agent, 'team_task_get'), TeamTaskId(args.task_id));
            },
        })));
        register(scoped.tools.register(defineTool({
            name: 'team_task_update',
            description: 'Update a shared task using optimistic concurrency (requires expected_revision from team_task_get).',
            parameters: {
                task_id: { type: 'string', required: true, description: 'Shared task id.' },
                expected_revision: { type: 'integer', required: true, description: 'Expected task revision for optimistic locking (CAS). Must match the current revision from team_task_get.' },
                action: {
                    type: 'string',
                    required: true,
                    enum: ['claim', 'release', 'edit', 'set_dependencies', 'complete', 'reopen', 'reassign', 'delete'],
                    description: 'Task transition to apply.',
                },
                subject: { type: 'string', description: 'Replacement title for edit.' },
                description: { type: 'string', description: 'Replacement details for edit.' },
                blocked_by: { type: 'array', items: { type: 'string' }, description: 'Complete blocker list for set_dependencies.' },
                write_scopes: { type: 'array', items: { type: 'string' }, description: 'Replacement advisory write scopes for edit.' },
                owner: { type: 'string', description: 'Target teammate name for reassignment (Lead only). Omit to clear ownership.' },
            },
            output: jsonOutput(TASK_VIEW_SCHEMA),
            async execute(args, exec) {
                return await ctx.agentTeams.updateTask(callingAgent(exec.agent, 'team_task_update'), {
                    taskId: TeamTaskId(args.task_id),
                    expectedRevision: args.expected_revision,
                    action: args.action,
                    ...args.subject === undefined ? {} : { subject: args.subject },
                    ...args.description === undefined ? {} : { description: args.description },
                    ...args.blocked_by === undefined ? {} : { blockedBy: args.blocked_by.map(TeamTaskId) },
                    ...args.write_scopes === undefined ? {} : { writeScopes: args.write_scopes },
                    ...args.owner === undefined ? {} : { owner: args.owner },
                });
            },
        })));
    }
    catch (error) {
        disposeAll();
        throw error;
    }
    return disposeAll;
}
/** Install Team tools in every live or subsequently published Team member scope. */
export function apply(ctx, config = {}) {
    const resolved = {
        interrupt: config.interrupt ?? true,
        freshProvider: config.freshProvider ?? 'spawn',
        forkProvider: config.forkProvider ?? 'fork',
    };
    const installed = new Map();
    const maybeInstall = (agent) => {
        if (ctx.agentTeams.tryMembership(agent) === undefined) {
            installed.get(agent)?.();
            installed.delete(agent);
            return;
        }
        if (!installed.has(agent))
            installed.set(agent, install(agent, ctx, resolved));
    };
    // Identity changes must update existing scopes, not wait for agent/created.
    const stopObserving = observeTeamMembership(ctx.agentTeams, maybeInstall);
    for (const agent of ctx.agents.list())
        maybeInstall(agent);
    ctx.on('agent/created', ({ agent }) => { maybeInstall(agent); return undefined; });
    ctx.on('agent/disposed', ({ agent }) => {
        installed.get(agent)?.();
        installed.delete(agent);
    });
    ctx.effect(() => () => {
        stopObserving();
        for (const dispose of installed.values())
            dispose();
        installed.clear();
    }, 'tool-team.scopedTools()');
}
