import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const require = createRequire(import.meta.url)
const ts = require(process.env.DSH_TYPESCRIPT_ENTRY || 'typescript')
const sourcePath = join(root, 'packages/agent-team/src/managed-runtime.ts')
const source = await readFile(sourcePath, 'utf8')
const layoutSource = await readFile(join(root, 'packages/agent-team/src/assembly-layout.ts'), 'utf8')
function transpile(source, file) { return ts.transpileModule(source, { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText }
const layoutModule = { exports: {} }
new Function('require', 'module', 'exports', transpile(layoutSource, 'assembly-layout.ts'))(require, layoutModule, layoutModule.exports)
const roles = layoutModule.exports.ASSEMBLY_ROLES.filter(role => role.placement === 'runtime')
// Match Cordis 4.0.5 declarations; this is fixture data, NOT a Cordis export.
const FiberState = { PENDING: 0, LOADING: 1, ACTIVE: 2, FAILED: 3, DISPOSED: 4, UNLOADING: 5 }
function runtimeClass({ inventory, existing = {}, pluginFactory } = {}) {
  const modules = new Map()
  for (const role of roles) modules.set(role.moduleName, { default: function RuntimePlugin() {} })
  const runtimeModule = { exports: {} }
  const compiled = transpile(source, sourcePath)
  new Function('require', 'module', 'exports', compiled)(name => {
    if (name === '@deepseek-ai/cordis') throw new Error('ManagedRuntime must not import a runtime FiberState export')
    if (name === './assembly-layout.ts') return layoutModule.exports
    if (modules.has(name)) return modules.get(name)
    return require(name)
  }, runtimeModule, runtimeModule.exports)
  const events = new Map(), disposals = []
  const ctx = {
    get(name) {
      if (name === 'pluginManager') return inventory === undefined ? undefined : { async listPlugins() { return inventory } }
      return existing[name]
    },
    on(name, listener) { const list = events.get(name) ?? []; list.push(listener); events.set(name, list) },
    logger: { error() {} },
  }
  const host = Object.assign(ctx, { plugin(plugin) {
    const fiber = pluginFactory ? pluginFactory(plugin) : {
      state: FiberState.LOADING,
      then(resolve) { this.state = FiberState.ACTIVE; resolve(); return Promise.resolve() },
      async dispose() { disposals.push([...modules].find(([, module]) => module.default === plugin)?.[0] ?? plugin); this.state = FiberState.DISPOSED },
    }
    return fiber
  } })
  return { ManagedRuntime: runtimeModule.exports.ManagedRuntime, ctx, host, disposals, events }
}
function releasedInventory() { return roles.map(role => ({ moduleName: role.nativeModuleName, enabled: false })) }
const tick = () => new Promise(resolve => setImmediate(resolve))
const { classifyAssembly } = layoutModule.exports

test('native diagnosis identifies ownership without claiming managed service readiness', () => {
  const count = roles.length
  assert.equal(count, 3)
  assert.equal(classifyAssembly('native', count, 0, true, Array(count).fill('not-requested')), 'native')
  assert.equal(classifyAssembly('native', count, 0, true, Array(count).fill('ready')), 'legacy-mixed')
  assert.equal(classifyAssembly('native', count - 1, 0, true, Array(count).fill('not-requested')), 'unknown')
  assert.equal(classifyAssembly('native', count, 1, true, Array(count).fill('not-requested')), 'legacy-mixed')
  assert.equal(classifyAssembly('native', count, 0, false, Array(count).fill('not-requested')), 'unknown')
})

test('managed diagnosis requires all runtime siblings ready with native providers off', () => {
  const count = roles.length
  assert.equal(classifyAssembly('managed', 0, 0, true, Array(count).fill('ready')), 'managed')
  assert.equal(classifyAssembly('managed', 0, 0, true, ['ready', 'ready', 'loading']), 'unknown')
  assert.equal(classifyAssembly('managed', 0, 0, true, Array(count - 1).fill('ready')), 'unknown')
  assert.equal(classifyAssembly('managed', 1, 0, true, Array(count).fill('ready')), 'legacy-mixed')
  assert.equal(classifyAssembly('managed', 0, 1, true, Array(count).fill('ready')), 'legacy-mixed')
})

test('single-file output never requires a runtime Cordis FiberState export, even in native mode', () => {
  assert.doesNotMatch(transpile(source, sourcePath), /require\(["']@deepseek-ai\/cordis["']\)/)
  const esm = ts.transpileModule(source, { fileName: sourcePath, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  assert.doesNotMatch(esm, /from\s*["']@deepseek-ai\/cordis["']/)
  const f = runtimeClass()
  const runtime = new f.ManagedRuntime(f.host, 'native')
  assert.equal(runtime.status().phase, 'not-requested')
})

test('managed ownership inventory fails closed before creating any child', async () => {
  const invalidInventories = [
    undefined,
    [],
    [...releasedInventory(), { moduleName: roles[0].nativeModuleName, enabled: false }],
    releasedInventory().map((row, index) => index === 0 ? { ...row, enabled: true } : row),
    [...releasedInventory(), { moduleName: roles[0].moduleName, enabled: true }],
  ]
  for (const inventory of invalidInventories) {
    let created = 0
    const f = runtimeClass({ inventory, pluginFactory: () => { created++; throw new Error('must not start') } })
    const runtime = new f.ManagedRuntime(f.host, 'managed')
    await tick()
    assert.equal(created, 0)
    assert.equal(runtime.status().phase, 'failed')
    assert.ok(runtime.status().services.every(service => service.phase === 'failed' && service.failure === 'ownership-unverified'))
    await runtime.dispose()
  }
  for (const name of ['subagents', 'agentTeams']) {
    const f = runtimeClass({ inventory: releasedInventory(), existing: { [name]: {} }, pluginFactory: () => { throw new Error('must not start') } })
    const runtime = new f.ManagedRuntime(f.host, 'managed')
    await tick()
    assert.equal(runtime.status().phase, 'failed')
    assert.ok(runtime.status().services.every(service => service.failure === 'ownership-unverified'))
    await runtime.dispose()
  }
})

test('managed status is ready only after all runtime-role sibling fibers become ACTIVE; cleanup reverses creation order', async () => {
  const f = runtimeClass({ inventory: releasedInventory() })
  const runtime = new f.ManagedRuntime(f.host, 'managed')
  await tick()
  const ready = runtime.status()
  assert.equal(ready.mode, 'managed')
  assert.equal(ready.phase, 'ready')
  assert.equal(ready.services.length, roles.length)
  assert.deepEqual(ready.services.map(service => service.role), roles.map(role => role.role))
  assert.ok(ready.services.every(service => service.phase === 'ready'))
  const started = roles.map(role => role.moduleName)
  await runtime.dispose()
  assert.deepEqual(f.disposals, started.reverse())
  assert.equal(runtime.status().phase, 'disposed')
  assert.ok(runtime.status().services.every(service => service.phase === 'disposed'))
})

test('cancellation during child load waits for that child disposer and does not continue assembly', async () => {
  let finishLoad
  let disposeFinished = false
  let imports = 0
  const f = runtimeClass({ inventory: releasedInventory(), pluginFactory: () => {
    imports++
    return {
      state: FiberState.LOADING,
      then(resolve) { finishLoad = () => { this.state = FiberState.DISPOSED; resolve() }; return new Promise(() => {}) },
      async dispose() { await new Promise(resolve => setTimeout(resolve, 0)); disposeFinished = true; finishLoad?.() },
    }
  } })
  const runtime = new f.ManagedRuntime(f.host, 'managed')
  await tick()
  const closing = runtime.dispose()
  await closing
  assert.equal(disposeFinished, true)
  assert.equal(imports, 1)
  assert.equal(runtime.status().phase, 'disposed')
})

test('a failed later child cleans already-created siblings in reverse order and retains failure', async () => {
  let index = 0
  const disposed = []
  const f = runtimeClass({ inventory: releasedInventory(), pluginFactory: () => {
    const current = index++
    return {
      state: current === 1 ? FiberState.FAILED : FiberState.LOADING,
      then(resolve) { resolve() },
      async dispose() { disposed.push(current); this.state = FiberState.DISPOSED },
    }
  } })
  const runtime = new f.ManagedRuntime(f.host, 'managed')
  await tick()
  await tick()
  assert.deepEqual(disposed, [1, 0])
  assert.equal(runtime.status().phase, 'failed')
  assert.ok(runtime.status().services.some(service => service.phase === 'failed' && service.failure === 'plugin-start-failed'))
})
