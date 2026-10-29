// Actual Manager method bodies + actual lock/fence; Agent, query and lifecycle doubles.
// This is isolated offline concurrency coverage, not a Host/Agent-loop E2E test.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const read = name => readFileSync(new URL('../packages/subagent/src/' + name + '.ts', import.meta.url), 'utf8')
function nodeSource(source, name) {
  const file = ts.createSourceFile('fixture.ts', source, ts.ScriptTarget.Latest, true)
  let result
  function walk(node) { if ((ts.isMethodDeclaration(node) || ts.isClassDeclaration(node) || ts.isFunctionDeclaration(node)) && node.name?.getText(file) === name) result = node.getText(file); ts.forEachChild(node, walk) }
  walk(file); assert.ok(result, name + ' exists in production source'); return result
}
function evaluate(source, dependencies, expression) {
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  return new Function(...Object.keys(dependencies), 'exports', js + '\nreturn ' + expression)(...Object.values(dependencies), {})
}
class SubagentError extends Error { constructor(message, code) { super(message); this.code = code } }
const { IdentityTransitionFence } = evaluate(read('identity-transition-fence'), {}, 'exports')
const ChildLock = evaluate(nodeSource(read('activation'), 'ChildLock'), {}, 'ChildLock')
const methods = ['withIdleContinuable', 'materializeForIdentityTransition', 'assertIdentityTransitionCandidate', 'assertActivityCaller']
const body = nodeSource(read('manager'), 'persistedInboxIsEmpty') + '\nclass Manager {\n' + methods.map(name => nodeSource(read('manager'), name)).join('\n') + '\n}'
const Manager = evaluate(body, {
  SubagentError,
  requireLocalActivation(value) { if (value.kind !== 'local') throw new SubagentError('not local', 'NOT_RESUMABLE'); return value },
  async listChildren(ctx, parentId, signal) { signal.throwIfAborted(); return ctx.children.get(parentId) ?? [] },
  foldSubagentDescriptor: events => events.find(event => event.type === 'subagent/descriptor')?.data,
  hasIndependentPresetSelection: () => false,
  ReasoningEffortId: value => value,
}, 'Manager')
function fixture({ cold = false } = {}) {
  const manager = new Manager(), events = new Map(), calls = []
  const signal = new AbortController().signal
  const parent = { id: 'root' }
  const child = { id: 'child', status: 'idle', session: { header: { parentSession: 'root' } }, inbox: { nextTurn: [], nextStep: [] },
    ctx: { on(name, fn) { const group = events.get(name) ?? new Set(); events.set(name, group); group.add(fn); return () => group.delete(fn) } },
    async runMaintenance(operation) { calls.push('maintenance'); return operation(signal) } }
  const activation = { kind: 'local', childId: 'child', parent, handle: { agent: child }, announced: !cold, ancestry: new Set([parent]), ownedChildren: new Set() }
  const agents = new Map([['root', parent], ...cold ? [] : [['child', child]]])
  manager.ctx = { agents, children: new Map() }
  manager.identityTransitions = new IdentityTransitionFence()
  manager.identityTransitionControllers = new Map()
  manager.locks = new ChildLock()
  manager.resident = new Map(cold ? [] : [['child', activation]])
  manager.materializations = new Set()
  manager.assertAdmitting = () => {}
  manager.holdOwnership = () => { calls.push('hold'); return () => calls.push('release-hold') }
  manager.beginChildPreparation = () => ({ signal, finish: () => calls.push('finish-preparation') })
  manager.observeChildActivity = (_child, _excluded, fn) => { manager.childActivity = fn; return () => { manager.childActivity = undefined } }
  manager.wake = () => calls.push('wake')
  manager.announce = value => { value.announced = true; calls.push('announce') }
  manager.authorizeLineage = (p, id, parentId) => { if (p !== parent || id !== 'child' || parentId !== parent.id) throw new SubagentError('wrong parent', 'UNAUTHORIZED') }
  const source = { header: { parentSession: 'root' }, inheritedEventCount: 0,
    projections: { values: { inbox: { 'next-turn': [], 'next-step': [] }, turnBoundary: { openTurnStartSeq: null } } },
    events: [{ type: 'subagent/descriptor', data: { mode: 'continuable', provider: 'local', agentModel: 'kept-model', label: 'worker' } }],
    [Symbol.dispose]() { calls.push('dispose-observation') } }
  manager.requireSessionQuery = () => ({ async observeSession() { return source } })
  manager.materialize = async options => { calls.push(options); agents.set('child', child); manager.resident.set('child', activation); return activation }
  return { manager, parent, child, activation, source, calls,
    emit(name, ...args) { for (const fn of events.get(name) ?? []) fn(...args) },
    clean() { assert.equal(manager.identityTransitions.has('child'), false); assert.equal(manager.identityTransitionControllers.size, 0); assert.ok(calls.includes('release-hold')); assert.ok(calls.includes('finish-preparation')); for (const group of events.values()) assert.equal(group.size, 0) } }
}
test('actual Manager lease raises fence before waiting on the existing child lock and releases all ownership', async () => {
  const h = fixture(); let release
  const gate = new Promise(resolve => { release = resolve })
  const held = h.manager.locks.run('child', () => gate)
  const lease = h.manager.withIdleContinuable(h.parent, 'child', async child => { assert.equal(child, h.child); return 42 })
  assert.equal(h.manager.identityTransitions.has('child'), true)
  assert.throws(() => h.manager.identityTransitions.capture('child'), { code: 'IDENTITY_TRANSITION_IN_PROGRESS' })
  release(); await held
  assert.equal(await lease, 42); h.clean()
})
test('actual Manager rejects running, pending inbox and descendants without dropping accepted input', async () => {
  for (const mode of ['running', 'inbox', 'descendant']) {
    const h = fixture()
    if (mode === 'running') h.child.status = 'running'
    if (mode === 'inbox') h.child.inbox.nextTurn.push({ id: 'accepted' })
    if (mode === 'descendant') h.manager.resident.set('grandchild', { ancestry: new Set([h.child]) })
    await assert.rejects(h.manager.withIdleContinuable(h.parent, 'child', async () => assert.fail('must not mutate')), { code: 'IDENTITY_TRANSITION_UNSAFE' })
    if (mode === 'inbox') assert.equal(h.child.inbox.nextTurn[0].id, 'accepted')
    h.clean()
  }
})
test('actual Manager aborts on concurrent input/turn/descendant activity and keeps input intact', async () => {
  for (const mode of ['input', 'turn', 'descendant']) {
    const h = fixture()
    await assert.rejects(h.manager.withIdleContinuable(h.parent, 'child', async (_child, signal) => {
      if (mode === 'input') { h.child.inbox.nextTurn.push({ id: 'accepted' }); h.emit('agent/inbox/inserted', { agent: h.child }) }
      if (mode === 'turn') h.emit('session/event', h.child.session, { type: 'turn/start' })
      if (mode === 'descendant') h.manager.childActivity()
      assert.equal(signal.aborted, true)
    }), { code: 'IDENTITY_TRANSITION_STALE' })
    if (mode === 'input') assert.equal(h.child.inbox.nextTurn[0].id, 'accepted')
    h.clean()
  }
})
test('actual Manager cold lease preserves ID/composition, never sends a prompt, and announces residency', async () => {
  const h = fixture({ cold: true })
  h.manager.ctx.children.set('child', [{ id: 'historical-unloaded-descendant' }])
  assert.equal(await h.manager.withIdleContinuable(h.parent, 'child', async child => { assert.equal(child, h.child); return 'converted' }), 'converted')
  const materialization = h.calls.find(value => typeof value === 'object')
  assert.equal(materialization.childId, 'child'); assert.equal(materialization.agentOptions.model, 'kept-model')
  assert.equal(Object.hasOwn(materialization, 'prompt'), false)
  assert.equal(Object.hasOwn(materialization, 'descriptor'), false)
  assert.ok(h.calls.includes('announce')); assert.ok(h.calls.includes('dispose-observation')); h.clean()
})
test('actual Manager cold lease fails closed on pending persisted input or unclosed turn', async () => {
  for (const mode of ['inbox', 'turn', 'descriptor']) {
    const h = fixture({ cold: true })
    if (mode === 'inbox') h.source.projections.values.inbox['next-step'].push({ id: 'accepted' })
    if (mode === 'turn') h.source.events.push({ type: 'turn/start', data: { turn: 3 } })
    if (mode === 'descriptor') h.source.events = []
    await assert.rejects(h.manager.withIdleContinuable(h.parent, 'child', async () => assert.fail('must not mutate')))
    assert.equal(h.calls.some(value => typeof value === 'object'), false); h.clean()
  }
})
