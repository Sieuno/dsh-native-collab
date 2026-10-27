import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const readSource = (relativePath) => readFile(new URL(relativePath, root), 'utf8');
const parseSource = (text, fileName) => ts.createSourceFile(
  fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS,
);
function requireNode(node, description) {
  assert.ok(node, `AST定位失败：${description}`);
  return node;
}
function classDeclaration(ast, name) {
  return requireNode(ast.statements.find((node) => ts.isClassDeclaration(node) && node.name?.text === name), `class ${name}`);
}
function methodDeclaration(owner, name) {
  return requireNode(owner.members.find((node) => ts.isMethodDeclaration(node) && node.name.getText() === name), `method ${name}`);
}

const managerSource = await readSource('packages/subagent/src/manager.ts');
const managerAst = parseSource(managerSource, 'packages/subagent/src/manager.ts');
const managerClass = classDeclaration(managerAst, 'SubagentManager');
const managerMethods = ['sendMessage', 'sendToParent', 'submitAdmitted', 'notifySettlement']
  .map((name) => methodDeclaration(managerClass, name).getText(managerAst));
const teamSource = await readSource('packages/agent-team/src/index.ts');
const teamAst = parseSource(teamSource, 'packages/agent-team/src/index.ts');
const teamClass = classDeclaration(teamAst, 'TeamService');
const sendAdmitted = methodDeclaration(teamClass, 'sendAdmitted').getText(teamAst);

const guardSource = await readSource('packages/subagent/src/auto-wake-guard.ts');
const guardOutput = ts.transpileModule(guardSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { AutoWakeGuard, AutoWakeLimitError } = await import(
  `data:text/javascript;base64,${Buffer.from(guardOutput).toString('base64')}`
);

// These are exact production method bodies. Stubs isolate integrations; no AgentLoop is simulated.
const isolatedSource = `
class IsolatedManager {
  constructor(Guard) {
    this.live = new Map(); this.resident = new Map(); this.inbox = new Map();
    this.guard = new Guard(); this.deliveryOptions = []; this.cancelCalls = 0;
    this.host = { reserveAutomatic: (sender, target) => this.guard.reserve('family', 1) };
    this.ctx = { agents: { get: (id) => this.live.get(id) }, logger: { warn() {} } };
  }
  assertAdmitting() {}
  resolveModelDelivery(value) { return value ?? 'steer'; }
  deliverToChild(sender, target, content, options) { this.deliveryOptions.push(options); return Promise.resolve(this.submitAdmitted(this.resident.get(target), content, options, sender)); }
  authorizeLineage() {}
  assertChildMessagePolicy() {}
  acquireOwnership() {}
  deliver(activation, message, delivery) { this.inbox.get(activation.childId).push({ message, delivery }); }
  wake() {}
  sendAgentMessage(parent, message, delivery) { this.inbox.get(parent.id).push({ message, delivery }); }
  sendWaking(parent, message, delivery) { this.inbox.get(parent.id).push({ message, delivery }); }
  createSettlementMessage(childId, terminal) { return { childId, terminal }; }
  closingTeardownFor() { return undefined; }
  ${managerMethods.join('\n')}
}
export { IsolatedManager };
`;
function agent(id, parentSession) {
  return { id, status: 'idle', session: { header: { parentSession }, id }, followup() { throw Error('unexpected followup'); }, steer() { throw Error('unexpected steer'); } };
}
const signal = new AbortController().signal;

// Production methods refer to these imported constructors; expose only their minimal contracts.
const methodPreamble = `
function createAgentMessage(sender, content) { return { id: 'agent-message', source: { kind: 'agent-message', senderSessionId: sender.id }, content }; }
function createUserMessage({ content, source }) { return { id: 'user-message', source, content }; }
function contentHasImage() { return false; }
function requireLocalActivation(activation) { return activation; }
function resolveModelDelivery(value) { return value ?? 'steer'; }
function createSettlementMessage(childId, terminal) { return ({ childId, terminal }); }
function activationAgent(activation) { return activation.handle?.agent; }
class SubagentError extends Error { constructor(message, code) { super(message); this.code = code; } }
`;
// Recompile with the import-boundary stubs in lexical scope.
const boundOutput = ts.transpileModule(`${methodPreamble}${isolatedSource}`, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { IsolatedManager: BoundManager } = await import(`data:text/javascript;base64,${Buffer.from(boundOutput).toString('base64')}`);

function boundFixture() {
  const m = new BoundManager(AutoWakeGuard);
  const parent = agent('parent'); const child = agent('child', parent.id);
  m.live.set(parent.id, parent); m.live.set(child.id, child);
  const messages = []; m.inbox.set(parent.id, messages); m.inbox.set(child.id, messages);
  const activation = { kind: 'local', childId: child.id, parent, closing: undefined, handle: { agent: child } };
  m.resident.set(child.id, activation);
  return { m, parent, child, activation, messages };
}

test('manager automatic inbox admission counts once, rejects before delivery, and leaves human inputs exempt', async () => {
  const { m, parent, child, activation, messages } = boundFixture();
  const accepted = await m.sendMessage(parent, child.id, [{ type: 'text', text: 'model' }], { signal });
  assert.equal(accepted, 'agent-message');
  assert.equal(m.deliveryOptions[0].automatic, true);
  assert.equal(messages.length, 1);
  assert.deepEqual(m.guard.view('family'), { used: 1, generation: 0 });
  assert.throws(() => m.submitAdmitted(activation, [{ type: 'text', text: 'over limit' }], { signal, delivery: 'queue', automatic: true }, parent),
    (error) => error instanceof AutoWakeLimitError && error.message.startsWith('Automatic wake limit reached; message send failed.'));
  assert.equal(messages.length, 1, 'limit rejection must precede target inbox delivery');
  assert.equal(m.cancelCalls, 0);
  m.submitAdmitted(activation, [{ type: 'text', text: 'human queue' }], { signal, delivery: 'queue' }, parent);
  m.submitAdmitted(activation, [{ type: 'text', text: 'human steer' }], { signal, delivery: 'steer' }, parent);
  assert.deepEqual(m.guard.view('family'), { used: 1, generation: 0 });
});

test('parent reports are exempt only on exact live parent; settlement notices never reserve', async () => {
  const { m, parent, child, messages } = boundFixture();
  m.guard.reserve('family', 1).commit();
  const activation = m.resident.get(child.id);
  const id = m.sendToParent(activation, child, [{ type: 'text', text: 'done' }], 'steer', true);
  assert.ok(id);
  assert.equal(messages.length, 1);
  assert.throws(() => m.sendToParent(activation, child, [], 'steer', false), AutoWakeLimitError);
  assert.equal(messages.length, 1, 'ordinary child-to-parent message at the limit is not delivered');
  await assert.rejects(m.sendMessage(child, child.id, [], { signal, result: true }), /task result may only be sent to the exact live direct parent/);
  for (const terminal of [{ stopReason: 'stop' }, { stopReason: 'error' }, { stopReason: 'completed' }]) {
    m.notifySettlement({ ...activation, announced: true, delivery: 'parent', parent }, terminal);
  }
  assert.equal(messages.length, 4);
  assert.deepEqual(m.guard.view('family'), { used: 1, generation: 0 });
});

test('manager failed synchronous delivery refunds its reservation', () => {
  const { m, parent, child, activation } = boundFixture();
  const original = m.deliver;
  m.deliver = () => { throw new Error('delivery failed'); };
  assert.throws(() => m.submitAdmitted(activation, [], { signal, delivery: 'queue', automatic: true }, parent), /delivery failed/);
  assert.deepEqual(m.guard.view('family'), { used: 0, generation: 0 });
  m.deliver = original;
});

const teamSourceBody = `
class IsolatedTeam {
  constructor(ctx) { this.ctx = ctx; this.activity = { notify() {} }; this.config = { maxMessageBytes: 100000 }; }
  ${sendAdmitted}
}
export { IsolatedTeam };
`;
const teamPreamble = `
const Buffer = globalThis.Buffer;
function resolveActiveMember(root, _state, target) { return root.roster.get(target); }
function structuredClone(value) { return globalThis.structuredClone(value); }
function createUserMessage({ content, source }) { return { id: 'team-message', content, source }; }
function brandString(value) { return value; }
function hostDeliverPrompt(api) { return api.deliverHostPrompt; }
class TeamError extends Error { constructor(message, code) { super(message); this.code = code; } }
`;
const teamOutput = ts.transpileModule(`${teamPreamble}${teamSourceBody}`, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { IsolatedTeam } = await import(`data:text/javascript;base64,${Buffer.from(teamOutput).toString('base64')}`);
function teamFixture() {
  const guard = new AutoWakeGuard(); const lead = agent('lead'); const peer = agent('peer');
  const roster = new Map([['lead', lead], ['peer', peer], ['other', agent('other')]]); const messages = [];
  let failDelivery = false;
  const subagents = {
    reserveAutomaticInteraction: () => guard.reserve('team-family', 1),
    deliverHostPrompt: async (_root, target, _content, _source) => {
      if (failDelivery) throw Error('delivery failed');
      if (target !== peer.id) throw Error('bad target');
      messages.push('peer'); return 'peer-msg';
    },
  };
  const team = new IsolatedTeam({ subagents });
  team.roster = { membership: (caller) => ({ id: 'team-family', root: lead, role: caller === lead ? 'lead' : 'teammate', name: caller.id }) };
  team.journal = { state: () => ({ roster }) };
  lead.roster = roster;
  lead.followup = (message) => messages.push(message);
  lead.steer = (message) => messages.push(message);
  const request = (target, extra = {}) => ({ signal, target, content: [{ type: 'text', text: 'hello' }], ...extra });
  return { team, guard, lead, peer, messages, request, fail: (value) => { failDelivery = value; } };
}

test('Team Lead->peer commits, peer->Lead taskResult is exempt, and misuse is rejected', async () => {
  const f = teamFixture();
  assert.deepEqual(await f.team.sendAdmitted(f.lead, f.request('peer')), { messageId: 'peer-msg' });
  assert.deepEqual(f.guard.view('team-family'), { used: 1, generation: 0 });
  const report = await f.team.sendAdmitted(f.peer, f.request('lead', { taskResult: true }));
  assert.equal(report.messageId, 'team-message');
  assert.equal(f.messages.length, 2);
  await assert.rejects(f.team.sendAdmitted(f.lead, f.request('peer', { taskResult: true })), /taskResult/);
  await assert.rejects(f.team.sendAdmitted(f.peer, f.request('other', { taskResult: true })), /taskResult/);
  await assert.rejects(f.team.sendAdmitted(f.peer, f.request('peer')), /cannot message itself/);
  assert.deepEqual(f.guard.view('team-family'), { used: 1, generation: 0 });
});

test('Team reservation failure reaches the sender; failed host delivery refunds', async () => {
  const f = teamFixture();
  f.fail(true);
  await assert.rejects(f.team.sendAdmitted(f.lead, f.request('peer')), /delivery failed/);
  assert.deepEqual(f.guard.view('team-family'), { used: 0, generation: 0 });
  f.fail(false);
  await f.team.sendAdmitted(f.lead, f.request('peer'));
  await assert.rejects(f.team.sendAdmitted(f.lead, f.request('peer')), AutoWakeLimitError);
  assert.equal(f.messages.length, 1);
});

