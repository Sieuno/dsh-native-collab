import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
function parse(source, name) {
  const ast = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true)
  assert.equal(ast.parseDiagnostics.length, 0, `${name} must parse before production extraction`)
  return ast
}
function named(ast, name) {
  const node = ast.statements.find(item => item.name?.text === name)
  assert.ok(node, `production declaration ${name}`)
  return node.getText(ast)
}
const managerAst = parse(await read('packages/subagent/src/manager.ts'), 'manager.ts')
const activationAst = parse(await read('packages/subagent/src/activation.ts'), 'activation.ts')
const runtimeAst = parse(await read('packages/subagent/src/index.ts'), 'index.ts')
const runtimeClass = runtimeAst.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'SubagentRuntime')
const runtimeMethods = ['childActivity', 'observeChildActivity'].map(name => {
  const method = runtimeClass.members.find(node => ts.isMethodDeclaration(node) && node.name.getText(runtimeAst) === name)
  assert.ok(method, `actual runtime method ${name}`)
  return method.getText(runtimeAst)
})
// Execute the complete production manager, including publication/rollback and event wiring.
// Only SDK/host integration boundaries are substituted; no real Host or model is started.
const isolated = `
import { randomUUID } from 'node:crypto';
import { isAbsolute, resolve } from 'node:path';
class SubagentError extends Error { constructor(message, code, options) { super(message, options); this.code = code } }
const brandString = value => value;
const assertSubagentMaxDepth = () => {};
const resolveChildDepth = () => 1;
const resolveChildAgentOptions = () => ({});
const snapshotSubagentDescriptor = value => value;
const captureDelegatedPolicyOverrides = () => ({});
const applyChildComposition = async () => {};
const captureLocalResult = () => ({ output: [], stopReason: 'completed' });
${named(activationAst, 'activationAgent')}
${named(activationAst, 'observeLocalFailure')}
${named(activationAst, 'ActivationPool')}
${named(activationAst, 'ChildLock')}
${named(managerAst, 'failureMessage')}
${named(managerAst, 'SubagentManager')}
export class Runtime { ${runtimeMethods.join('\n')} }
`
const output = ts.transpileModule(isolated, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { SubagentManager: Manager, Runtime } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)
const empty = () => ({ runningIds: [], preparing: false })
const result = { output: [], stopReason: 'completed' }
const signal = () => new AbortController().signal
const tick = () => new Promise(resolve => setImmediate(resolve))

function events() {
  const listeners = new Map()
  return {
    on(name, callback) {
      const callbacks = listeners.get(name) ?? new Set()
      callbacks.add(callback); listeners.set(name, callbacks)
      return () => callbacks.delete(callback)
    },
    emit(name, ...args) { for (const callback of [...(listeners.get(name) ?? [])]) callback(...args) },
  }
}
function fixture() {
  const live = new Map(), handles = new Map(), lifecycle = [], logs = []
  const ctx = {
    ...events(),
    agents: {
      get: id => live.get(id),
      resume: async options => {
        const handle = handles.get(options.resumeSessionId)
        assert.ok(handle, 'test supplies only a fake SDK handle')
        await options.setup(handle.agent.ctx, handle.agent)
        return handle
      },
    },
    plugin() { return { ctx, dispose() {} } },
    effect() {},
    get(name) { return name === 'sessionPersistence' ? {} : undefined },
    workingDirectory: { ensure: async () => 'D:/work' },
    logger: { warn: value => logs.push(value) },
  }
  const host = {
    observeActivation: (_provider, id) => ({ start() { lifecycle.push(['start', id]) }, settle() { lifecycle.push(['settle', id]) } }),
    prepareContinuable: async () => ({}),
    startExternal: async () => { throw Error('test must supply external backend') },
  }
  const manager = new Manager(ctx, host, () => 32)
  function agent(id, parentSession) {
    const agent = {
      id, status: 'idle', inbox: { nextTurn: [], nextStep: [] },
      session: { id, seq: 0, header: { parentSession } }, ctx: { ...events() },
      whenIdle: async () => {}, cancel() {},
    }
    agent.ctx.sessions = { flush: async () => {} }
    live.set(id, agent)
    handles.set(id, { agent, dispose: async () => { live.delete(id) } })
    return agent
  }
  const parent = agent('caller')
  const activity = (excluded = new Set(), caller = parent) => manager.childActivity(caller, excluded)
  async function local(id, owner = parent) {
    const child = agent(id, 'untrusted-header-must-not-decide-ancestry')
    const activation = await manager.materialize({ kind: 'local', childId: id, provider: 'fake', parent: owner, signal: signal(), agentOptions: {}, composition: {} })
    return { child, activation }
  }
  async function external(id, owner = parent, dispose = async () => {}) {
    const done = Promise.withResolvers()
    const activation = await manager.materialize({ kind: 'external', childId: `pending-${id}`, provider: 'fake', parent: owner, signal: signal(), start: async () => ({ id, result: done.promise, dispose }) })
    return { activation, done }
  }
  return { manager, host, ctx, live, handles, lifecycle, logs, parent, agent, activity, local, external }
}

test('empty manager and unassembled runtime return detached empty snapshots and cleanable subscriptions', () => {
  const f = fixture(), runtime = new Runtime()
  runtime.ctx = { get: name => name === 'agents' ? f.ctx.agents : undefined }
  const forged = { ...f.parent }
  assert.throws(() => runtime.childActivity(forged, new Set()), error => error.code === 'UNAUTHORIZED')
  assert.throws(() => runtime.observeChildActivity(forged, new Set(), () => {}), error => error.code === 'UNAUTHORIZED')
  assert.deepEqual(f.activity(), empty())
  let changes = 0
  const dispose = f.manager.observeChildActivity(f.parent, new Set(), () => changes++)
  assert.equal(changes, 0, 'registration must not synthesize an edge')
  dispose(); dispose()
  assert.equal(f.manager.childActivityWatchers.size, 0)
  assert.deepEqual(runtime.childActivity(f.parent, new Set()), empty())
  runtime.observeChildActivity(f.parent, new Set(), () => changes++)()
  assert.equal(changes, 0)
  runtime.manager = f.manager
  assert.deepEqual(runtime.childActivity(f.parent, new Set()), empty())
})

test('exact live caller is mandatory, including same-id replacements and unrelated trees', async () => {
  const f = fixture(), forged = { ...f.parent }
  assert.throws(() => f.manager.childActivity(forged, new Set()), error => error.code === 'UNAUTHORIZED')
  assert.throws(() => f.manager.observeChildActivity(forged, new Set(), () => {}), error => error.code === 'UNAUTHORIZED')
  const foreign = f.agent('foreign'), { activation } = await f.external('other-child', foreign)
  assert.deepEqual(f.activity(), empty())
  f.live.set(f.parent.id, forged)
  assert.throws(() => f.activity(), error => error.code === 'UNAUTHORIZED')
  // Remove the deliberately unsettled fixture run without starting any real execution.
  f.manager.resident.delete(activation.childId)
})

test('external residency remains running through result settlement and async teardown; both edges notify', async () => {
  const f = fixture(), teardown = Promise.withResolvers(), views = []
  const dispose = f.manager.observeChildActivity(f.parent, new Set(), () => views.push(f.activity()))
  const { activation, done } = await f.external('external', f.parent, () => teardown.promise)
  assert.deepEqual(f.activity(), { runningIds: ['external'], preparing: false })
  assert.ok(views.some(view => view.preparing), 'materializations.add is observable')
  assert.ok(views.some(view => view.runningIds.includes('external')), 'resident.set is observable')
  activation.delivery = 'caller'
  f.manager.announce(activation)
  done.resolve(result)
  await tick()
  assert.deepEqual(f.activity(), { runningIds: ['external'], preparing: false }, 'settled backend still owns teardown')
  teardown.resolve()
  await activation.result.promise
  assert.deepEqual(f.activity(), empty())
  assert.deepEqual(views.at(-1), empty(), 'resident.delete is observable')
  assert.deepEqual(f.lifecycle, [['start', 'external'], ['settle', 'external']])
  dispose()
})

test('local status, inbox insertion/claim/discard, and failure recovery use actual production event hooks', async () => {
  const f = fixture(), { child, activation } = await f.local('local')
  const snapshots = []
  const dispose = f.manager.observeChildActivity(f.parent, new Set(), () => snapshots.push(f.activity()))
  child.status = 'running'; child.ctx.emit('agent/status', { agent: child })
  assert.deepEqual(f.activity().runningIds, ['local'])
  child.status = 'idle'; child.ctx.emit('agent/status', { agent: child })
  assert.deepEqual(f.activity(), empty())
  child.inbox.nextTurn.push('message'); child.ctx.emit('agent/inbox/inserted', { agent: child })
  assert.deepEqual(f.activity().runningIds, ['local'])
  child.ctx.emit('agent/error', { agent: child })
  assert.deepEqual(f.activity(), empty(), 'failed parked input does not claim progress')
  child.ctx.emit('session/event', child.session, { type: 'turn/end', seq: 0 })
  assert.equal(activation.failureAt, undefined)
  assert.deepEqual(f.activity().runningIds, ['local'])
  assert.deepEqual(snapshots.at(-1).runningIds, ['local'], 'failure reset notifies after clearing state')
  child.inbox.nextTurn.length = 0; child.ctx.emit('agent/inbox/claimed', { agent: child })
  child.inbox.nextStep.push('steer'); child.ctx.emit('agent/inbox/inserted', { agent: child })
  child.inbox.nextStep.length = 0; child.ctx.emit('agent/inbox/discarded', { agent: child })
  assert.deepEqual(snapshots.at(-1), empty())
  assert.ok(snapshots.length >= 8)
  dispose()
})

test('recursive activity uses manager lineage and excludes whole Team branches even after their node leaves the live registry', async () => {
  const f = fixture(), team = await f.local('team'), standalone = await f.local('standalone')
  const teamChild = await f.external('team-descendant', team.child)
  const independent = await f.external('independent-descendant', standalone.child)
  const excluded = new Set(['team']), views = []
  const dispose = f.manager.observeChildActivity(f.parent, excluded, () => views.push(f.activity(excluded)))
  assert.deepEqual(f.activity(excluded).runningIds, ['independent-descendant'])
  f.live.delete(team.child.id)
  f.manager.resident.delete(team.child.id)
  assert.deepEqual(f.activity(excluded).runningIds, ['independent-descendant'])
  const preparation = f.manager.beginChildPreparation(standalone.child, 'independent-pending', signal())
  assert.equal(f.activity(excluded).preparing, true)
  preparation.finish()
  const count = views.length
  f.manager.wake(teamChild.activation)
  assert.equal(views.length, count, 'excluded descendant edges do not wake caller')
  f.manager.wake(independent.activation)
  assert.equal(views.length, count + 1)
  assert.deepEqual(f.activity(new Set(['standalone', 'team'])), empty())
  dispose()
})

test('teammate caller keeps its independent descendants when excluded roster IDs contain the Team Lead ancestor', async () => {
  const f = fixture(), teammate = await f.local('teammate')
  const standalone = await f.local('teammate-independent', teammate.child)
  const { activation } = await f.external('teammate-grandchild', standalone.child)
  const excluded = new Set([f.parent.id, 'other-teammate'])
  const activity = () => f.manager.childActivity(teammate.child, excluded)
  const views = []
  const cleanup = f.manager.observeChildActivity(teammate.child, excluded, () => views.push(activity()))
  assert.deepEqual(activity(), { runningIds: ['teammate-grandchild'], preparing: false })
  f.manager.wake(activation)
  assert.equal(views.length, 1, 'ancestor Lead exclusion must not suppress child edges')
  const preparation = f.manager.beginChildPreparation(standalone.child, 'teammate-pending', signal())
  assert.equal(activity().preparing, true)
  assert.equal(views.at(-1).preparing, true)
  preparation.finish()
  assert.equal(views.at(-1).preparing, false)
  assert.deepEqual(f.manager.childActivity(teammate.child, new Set([...excluded, standalone.child.id])), empty(), 'descendant exclusion still suppresses its whole branch')
  cleanup()
})

test('Team preparation is excluded, subscriptions are isolated, reentrant cleanup and repeated disposal are safe', () => {
  const f = fixture(), seen = []
  let cleanupSecond
  const cleanupFirst = f.manager.observeChildActivity(f.parent, new Set(['team']), () => { seen.push('first'); cleanupSecond(); throw Error('consumer failure') })
  cleanupSecond = f.manager.observeChildActivity(f.parent, new Set(['team']), () => seen.push('second'))
  const cleanupThird = f.manager.observeChildActivity(f.parent, new Set(['team']), () => seen.push('third'))
  const team = f.manager.beginChildPreparation(f.parent, 'team', signal())
  assert.deepEqual(f.activity(new Set(['team'])), empty())
  assert.deepEqual(seen, [])
  team.finish()
  const pending = f.manager.beginChildPreparation(f.parent, 'normal', signal())
  assert.deepEqual(seen, ['first', 'third'])
  assert.equal(f.activity().preparing, true)
  pending.finish(); pending.finish()
  assert.deepEqual(seen, ['first', 'third', 'first', 'third'])
  cleanupFirst(); cleanupFirst(); cleanupThird()
  assert.equal(f.manager.childActivityWatchers.size, 0)
  const after = f.manager.beginChildPreparation(f.parent, 'later', signal())
  after.finish()
  assert.equal(seen.length, 4)
})

test('provider preparation before materialize and startup rejection both notify without stranded activity', async () => {
  const f = fixture(), prepared = Promise.withResolvers(), entered = Promise.withResolvers(), views = []
  f.host.prepareContinuable = async () => { entered.resolve(); return prepared.promise }
  const dispose = f.manager.observeChildActivity(f.parent, new Set(), () => views.push(f.activity()))
  const starting = f.manager.startLocal({ provider: 'fake', childId: 'new-child', label: 'prepare', request: { parent: f.parent, prompt: [] }, signal: signal(), delivery: 'caller' })
  await entered.promise
  assert.deepEqual(f.activity(), { runningIds: [], preparing: true })
  assert.equal(f.manager.resident.size, 0)
  prepared.reject(Error('prepare failed'))
  await assert.rejects(starting, /prepare failed/)
  assert.deepEqual(views.at(-1), empty())
  assert.equal(f.manager.materializations.size, 0)
  dispose()
})

test('scoped drain cancels an admitted provider preparation and waits for its rollback edge', async () => {
  const f = fixture(), entered = Promise.withResolvers(), views = []
  f.host.prepareContinuable = (_name, request) => new Promise((_resolve, reject) => {
    request.signal.addEventListener('abort', () => reject(request.signal.reason), { once: true })
    entered.resolve()
  })
  const cleanup = f.manager.observeChildActivity(f.parent, new Set(), () => views.push(f.activity()))
  const starting = f.manager.startLocal({ provider: 'fake', childId: 'cancelled-preparation', label: 'prepare', request: { parent: f.parent, prompt: [] }, signal: signal(), delivery: 'caller' })
  const rejected = assert.rejects(starting, error => error.name === 'AbortError')
  await entered.promise
  const draining = f.manager.drainDescendants([f.parent])
  await Promise.all([rejected, draining])
  assert.equal(f.manager.materializations.size, 0)
  assert.deepEqual(views.at(-1), empty())
  cleanup()
})

test('subscribe then snapshot cannot lose a synchronous activity transition or invent a first edge', () => {
  const f = fixture(), views = []
  const cleanup = f.manager.observeChildActivity(f.parent, new Set(), () => views.push(f.activity()))
  assert.equal(views.length, 0)
  const preparing = f.manager.beginChildPreparation(f.parent, 'between-observe-and-read', signal())
  assert.equal(views.length, 1)
  assert.equal(f.activity().preparing, true)
  preparing.finish()
  assert.deepEqual(views.at(-1), empty())
  cleanup()
})

test('materialize failure and published-admission rollback both delete authoritative state and notify', async () => {
  const f = fixture(), views = []
  const dispose = f.manager.observeChildActivity(f.parent, new Set(), () => views.push(f.activity()))
  await assert.rejects(f.manager.materialize({ kind: 'external', childId: 'pending', provider: 'fake', parent: f.parent, signal: signal(), start: async () => { throw Error('backend failed') } }), /backend failed/)
  assert.deepEqual(views.at(-1), empty())
  let disposed = 0
  f.host.observeActivation = () => ({ start() { throw Error('start observer failed') }, settle() {} })
  await assert.rejects(f.manager.materialize({ kind: 'external', childId: 'pending', provider: 'fake', parent: f.parent, signal: signal(), start: async () => ({ id: 'rollback', result: Promise.resolve(result), dispose: async () => { disposed++ } }) }), /start observer failed/)
  assert.equal(disposed, 1)
  assert.equal(f.manager.resident.size, 0)
  assert.equal(f.manager.materializations.size, 0)
  assert.ok(views.some(view => view.runningIds.includes('rollback')))
  assert.deepEqual(views.at(-1), empty())
  dispose()
})

test('external start and cold-resume preflight remain preparing before their first await and clean failure paths', async () => {
  const f = fixture(), cwd = Promise.withResolvers()
  f.ctx.workingDirectory.ensure = () => cwd.promise
  const starting = f.manager.startExternal({ provider: 'fake', label: 'external', request: { parent: f.parent, prompt: [] }, signal: signal(), delivery: 'caller' })
  assert.equal(f.activity().preparing, true)
  cwd.reject(Error('directory unavailable'))
  await assert.rejects(starting, /directory unavailable/)
  assert.deepEqual(f.activity(), empty())
  const query = Promise.withResolvers()
  f.manager.deliverFollowup = () => query.promise // Isolate the SDK session-query boundary.
  const delivering = f.manager.deliverToChild(f.parent, 'cold-child', [], { signal: signal(), delivery: 'queue' })
  assert.equal(f.activity().preparing, true)
  query.reject(Error('query unavailable'))
  await assert.rejects(delivering, /query unavailable/)
  assert.deepEqual(f.activity(), empty())
})
