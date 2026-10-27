import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const readSource = (relativePath) => readFile(new URL(relativePath, root), 'utf8');
const parseSource = (text, fileName) => ts.createSourceFile(
  fileName,
  text,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

function requireNode(node, description) {
  assert.ok(node, `AST定位失败：${description}`);
  return node;
}

function classDeclaration(sourceFile, className) {
  return requireNode(sourceFile.statements.find(
    (node) => ts.isClassDeclaration(node) && node.name?.text === className,
  ), `class ${className}`);
}

function methodDeclaration(classNode, methodName) {
  return requireNode(classNode.members.find(
    (node) => ts.isMethodDeclaration(node) && node.name.getText() === methodName,
  ), `method ${methodName}`);
}

const indexSource = await readSource('packages/subagent/src/index.ts');
const indexAst = parseSource(indexSource, 'packages/subagent/src/index.ts');
const runtimeClass = classDeclaration(indexAst, 'SubagentRuntime');
const familyMethod = methodDeclaration(runtimeClass, 'collaborationFamily');
const reserveMethod = methodDeclaration(runtimeClass, 'reserveAutomaticInteraction');

let sessionEventArrow;
function findSessionEventArrow(node) {
  if (
    ts.isCallExpression(node)
    && ts.isPropertyAccessExpression(node.expression)
    && node.expression.expression.getText() === 'childCtx'
    && node.expression.name.text === 'on'
    && node.arguments[0]?.getText().replaceAll("'", '').replaceAll('"', '') === 'session/event'
  ) {
    sessionEventArrow = requireNode(
      node.arguments.find(ts.isArrowFunction),
      "childCtx.on('session/event', arrow)",
    );
  }
  ts.forEachChild(node, findSessionEventArrow);
}
findSessionEventArrow(runtimeClass);
requireNode(sessionEventArrow, "childCtx.on('session/event', arrow)");
assert.doesNotMatch(
  `${familyMethod.getText(indexAst)}\\n${reserveMethod.getText(indexAst)}\\n${sessionEventArrow.getText(indexAst)}`,
  /\b(?:cancel|interrupt|emit)\b|requesthook/i,
  'routing guard must not expose agent-control or request-hook behavior',
);

const managerSource = await readSource('packages/subagent/src/manager.ts');
const managerAst = parseSource(managerSource, 'packages/subagent/src/manager.ts');
const managerClass = classDeclaration(managerAst, 'SubagentManager');
const settlementMethod = methodDeclaration(managerClass, 'notifySettlement');
assert.doesNotMatch(settlementMethod.getText(managerAst), /reserveAutomatic/,
  'notifySettlement must not reserve automatic interaction capacity');
const startLocalMethod = methodDeclaration(managerClass, 'startLocal');
const initialCreate = requireNode(
  startLocalMethod.getText(managerAst).match(/createAgentMessage\(parent,\s*\[\]\)\.source/)?.[0],
  'startLocal initial source createAgentMessage(parent, []).source',
);
assert.equal(initialCreate, 'createAgentMessage(parent, []).source');

const guardSource = await readSource('packages/subagent/src/auto-wake-guard.ts');
const guardOutput = ts.transpileModule(guardSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { AutoWakeGuard, AutoWakeLimitError } = await import(
  `data:text/javascript;base64,${Buffer.from(guardOutput).toString('base64')}`
);

// Execute the exact production method/handler bodies in an isolated class.
// Only descriptor folding is stubbed; all identity/routing decisions stay real.
const isolatedSource = `
function foldSubagentDescriptor(events) {
  return events.some((event) => event?.type === 'subagent/descriptor')
    ? { recognized: true }
    : undefined;
}
class IsolatedRuntime {
  constructor(ctx, automaticWakeLimit, Guard) {
    this.ctx = ctx;
    this.automaticWakeLimit = automaticWakeLimit;
    this.automaticWakeGuard = new Guard();
  }
  ${familyMethod.getText(indexAst)}
  ${reserveMethod.getText(indexAst)}
  createEventHandler(childCtx) { return ${sessionEventArrow.getText(indexAst)}; }
}
export { IsolatedRuntime };
`;
const isolatedOutput = ts.transpileModule(isolatedSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { IsolatedRuntime } = await import(
  `data:text/javascript;base64,${Buffer.from(isolatedOutput).toString('base64')}`
);

function makeAgent(id, parentSession, descriptor = true) {
  const events = descriptor ? [{ type: 'subagent/descriptor' }] : [];
  return {
    id,
    session: {
      header: { parentSession },
      snapshotEvents: () => events,
      inheritedEventCount: 0,
    },
  };
}

function fixture(limit = 2) {
  const live = new Map();
  const membership = new Map();
  const agents = { get: (id) => live.get(id) };
  const teams = { tryMembership: (agent) => membership.get(agent.id) };
  const ctx = { get: (key) => key === 'agents' ? agents : key === 'agentTeams' ? teams : undefined };
  const runtime = new IsolatedRuntime(ctx, limit, AutoWakeGuard);
  return { runtime, live, membership, agents };
}

function add(f, agent) {
  f.live.set(agent.id, agent);
  return agent;
}

test('trusted Team membership and recursive subagents share the verified root family', () => {
  const f = fixture(2);
  const rootAgent = add(f, makeAgent('root'));
  const teammate = add(f, makeAgent('teammate'));
  const child = add(f, makeAgent('child', 'teammate'));
  const grandchild = add(f, makeAgent('grandchild', 'child'));
  f.membership.set('teammate', { root: rootAgent });

  for (const sender of [teammate, child]) {
    f.runtime.reserveAutomaticInteraction(sender, rootAgent.id).commit();
  }
  assert.throws(
    () => f.runtime.reserveAutomaticInteraction(grandchild, teammate.id),
    AutoWakeLimitError,
  );
  const unrelatedRoot = add(f, makeAgent('unrelated-root'));
  const unrelatedChild = add(f, makeAgent('unrelated-child', unrelatedRoot.id));
  f.runtime.reserveAutomaticInteraction(unrelatedChild, unrelatedRoot.id).commit();
  assert.deepEqual(f.runtime.automaticWakeGuard.view('unrelated-root'), { used: 1, generation: 0 });
  assert.deepEqual(f.runtime.automaticWakeGuard.view('root'), { used: 2, generation: 0 });
});

test('a trusted fork TeamLead remains a family root without a subagent descriptor', () => {
  const f = fixture(1);
  const hostParent = add(f, makeAgent('host-parent'));
  const forkRoot = add(f, makeAgent('fork-root', hostParent.id, false));
  const forkChild = add(f, makeAgent('fork-child', forkRoot.id));
  f.membership.set('fork-root', { root: forkRoot });

  f.runtime.reserveAutomaticInteraction(forkChild, forkRoot.id).commit();
  assert.throws(
    () => f.runtime.reserveAutomaticInteraction(forkChild, forkRoot.id),
    AutoWakeLimitError,
  );
  assert.deepEqual(f.runtime.automaticWakeGuard.view('fork-root'), { used: 1, generation: 0 });
});

test('unrelated roots remain isolated and unknown routing identities are exempt', () => {
  const f = fixture(1);
  const first = add(f, makeAgent('first-root'));
  const second = add(f, makeAgent('second-root'));
  const child = add(f, makeAgent('first-child', first.id));
  const secondChild = add(f, makeAgent('second-child', second.id));
  const staleSender = makeAgent('stale');
  const missingParent = add(f, makeAgent('orphan-child', 'not-live'));
  const missingDescriptor = add(f, makeAgent('no-descriptor-child', first.id, false));

  f.runtime.reserveAutomaticInteraction(child, first.id).commit();
  f.runtime.reserveAutomaticInteraction(secondChild, second.id).commit();
  f.runtime.reserveAutomaticInteraction(second, first.id).commit(); // cross-family target => exempt
  f.runtime.reserveAutomaticInteraction(staleSender, first.id).commit();
  f.runtime.reserveAutomaticInteraction(missingParent, first.id).commit();
  f.runtime.reserveAutomaticInteraction(missingDescriptor, first.id).commit();
  assert.deepEqual(f.runtime.automaticWakeGuard.view('first-root'), { used: 1, generation: 0 });
  assert.deepEqual(f.runtime.automaticWakeGuard.view('second-root'), { used: 1, generation: 0 });
});

test('cycles, unclassified cross-family edges, and same-session messages do not limit', () => {
  const f = fixture(1);
  const rootAgent = add(f, makeAgent('root'));
  const other = add(f, makeAgent('other'));
  const cycleA = add(f, makeAgent('cycle-a', 'cycle-b'));
  const cycleB = add(f, makeAgent('cycle-b', 'cycle-a'));

  f.runtime.reserveAutomaticInteraction(cycleA, cycleB.id).commit();
  f.runtime.reserveAutomaticInteraction(rootAgent, other.id).commit();
  f.runtime.reserveAutomaticInteraction(rootAgent, rootAgent.id).commit();
  assert.deepEqual(f.runtime.automaticWakeGuard.view('root'), { used: 0, generation: 0 });
  assert.deepEqual(f.runtime.automaticWakeGuard.view('other'), { used: 0, generation: 0 });
});

test('limit throws only to the sender path and does not invoke agent-control hooks', () => {
  const f = fixture(1);
  const rootAgent = add(f, makeAgent('root'));
  const child = add(f, makeAgent('child', rootAgent.id));
  f.runtime.reserveAutomaticInteraction(child, rootAgent.id).commit();
  assert.throws(
    () => f.runtime.reserveAutomaticInteraction(child, rootAgent.id),
    (error) => {
      assert.ok(error instanceof AutoWakeLimitError);
      assert.equal(error.message.split('\n')[0], 'Automatic wake limit reached; message send failed.');
      return true;
    },
  );
  assert.deepEqual(f.runtime.automaticWakeGuard.view('root'), { used: 1, generation: 0 });
});

test('session/event resets only for trusted user and user-question-reply sources', () => {
  const f = fixture(5);
  const rootAgent = add(f, makeAgent('root'));
  const recipient = add(f, makeAgent('child', rootAgent.id));
  const childCtx = { agents: f.agents };
  const handler = f.runtime.createEventHandler(childCtx);
  const session = { id: recipient.id };
  const reserve = () => f.runtime.reserveAutomaticInteraction(recipient, rootAgent.id).commit();
  const used = () => f.runtime.automaticWakeGuard.view('root');

  reserve();
  handler(session, { type: 'session/event', data: {} });
  assert.deepEqual(used(), { used: 1, generation: 0 });
  handler(session, { type: 'agent/inbox/spliced', data: { inserted: [{ source: { kind: 'agent-message' } }] } });
  handler(session, { type: 'agent/inbox/spliced', data: { inserted: [{ source: { kind: 'goal' } }] } });
  handler(session, { type: 'agent/inbox/spliced', data: { inserted: [] } });
  assert.deepEqual(used(), { used: 1, generation: 0 });

  handler(session, { type: 'agent/inbox/spliced', data: { inserted: [{ id: 'human-message-1', source: { kind: 'user' } }] } });
  assert.deepEqual(used(), { used: 0, generation: 1 });
  reserve();
  handler(session, { type: 'user/message', data: { id: 'human-message-1', source: { kind: 'user' } } });
  assert.deepEqual(used(), { used: 1, generation: 1 }, 'a replayed message id must not reset twice');
  handler(session, { type: 'user/message', data: { id: 'human-message-2', source: { kind: 'user-question-reply' } } });
  assert.deepEqual(used(), { used: 0, generation: 2 }, 'a distinct human message resets the family');
});

test('Team request-limit compatibility does not intercept model requests or cancel agents', async () => {
  const [types, index, roster] = await Promise.all([
    readSource('packages/agent-team/src/types.ts'),
    readSource('packages/agent-team/src/index.ts'),
    readSource('packages/agent-team/src/roster.ts'),
  ]);
  assert.match(types, /@deprecated Compatibility-only option; no request counting or cancellation is performed\./u);
  assert.match(index, /maxLogicalRequests: z\.number\(\)[^\n]*Deprecated compatibility option/u);
  assert.doesNotMatch(index, /snapshot\.teamRequestLimit|this\.config\.maxLogicalRequests|agent\/request|admitRequest|\.reserve\(|getBudget\(|\.cancel\(|stopForBudget/u);
  assert.match(index, /async sendAdmitted\(/u);
  assert.match(index, /reserveAutomaticInteraction\?\.call\(this\.ctx\.subagents, caller, target\.id\)/u);
  assert.match(roster, /membership\(agent: Agent\): TeamMembership/u);
  assert.match(roster, /tryMembership\(agent: Agent\): TeamMembership \| undefined/u);
  assert.match(roster, /recoverFor\(agent: Agent, signal: AbortSignal\)/u);
  assert.doesNotMatch(roster, /resolveBudgetRoot|startedBudgetRoot|stopForBudget|requestMembership|TeamBudget|ensureStarted/u);
});

test('task storage and member authority remain independent of removed request budgets', async () => {
  const board = await readSource('packages/agent-team/src/task-board.ts');
  assert.match(board, /async create\(membership: TeamMembership, request: CreateTeamTaskRequest\)/u);
  assert.match(board, /this\.journal\.transact\(root\.id/u);
  assert.match(board, /this\.journal\.appendAndFlush\(root, 'team\/task'/u);
  assert.doesNotMatch(board, /TeamBudget|ensureStarted/u);
  assert.match(board, /const lead = membership\.role === 'lead'/u);
  assert.match(board, /if \(!lead && !owner\) throw new TeamError/u);
  assert.match(board, /if \(!lead\) throw new TeamError\('only the Team Lead can reassign tasks'/u);
});

test('Host prompts and completion reports are exempt from explicit automatic model-wake accounting (source contract)', () => {
  for (const [name, delivery] of [['queuePrompt', 'queue'], ['steerPrompt', 'steer']]) {
    const method = methodDeclaration(managerClass, name).getText(managerAst);
    assert.ok(method.includes(`deliverToChild(parent, childId, content, { source, signal, delivery: '${delivery}' })`));
    assert.doesNotMatch(method, /automatic:\s*true/u, 'Host-authored prompts are not automatic model wakes');
  }
  assert.match(managerSource, /automatic:\s*true/u);
  assert.match(managerSource, /options\.automatic === true/u);
  assert.match(managerSource, /result \? undefined : this\.host\.reserveAutomatic/u);
  assert.match(indexSource, /reserveAutomaticInteraction\(sender: Agent, targetId: SessionId\)/u);
  assert.match(guardSource, /throw new AutoWakeLimitError\(\)/u);
  assert.doesNotMatch(indexSource, /\.cancel\(/u);
});
