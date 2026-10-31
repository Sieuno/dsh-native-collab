import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, realpathSync } from 'node:fs'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { sourceContract } from './source-contract-fixture.mjs'

// Executes unmodified official SettingsForms, ConfigEditor and schema helpers,
// with installed Cordis/Schemastery and real temporary YAML files. Profile layer
// composition, reconciliation and locking are explicit single-entry adapters.
// This is not a running Host, settings RPC, or complete Loader/preset assembly.
const root = resolve(import.meta.dirname, '..')
const official = process.env.DSH_SOURCE_ROOT
assert.ok(official, 'Set DSH_SOURCE_ROOT to matching official DSH source before running this test')
await sourceContract(official)
const require = createRequire(import.meta.url)
const ts = require(process.env.DSH_TYPESCRIPT_ENTRY || 'typescript')
// FiberState is a const enum erased from the installed runtime exports.
// The official source's ACTIVE member is 2; provide that compile-time constant
// when transpileModule loads the official TypeScript without a typechecker.
const cordis = { ...require('@deepseek-ai/cordis'), FiberState: { ACTIVE: 2 } }
const { Context, FiberState } = cordis
const cordisRequire = createRequire(require.resolve('@deepseek-ai/cordis'))
const cosmo = cordisRequire('@deepseek-ai/cosmokit')
const store = resolve(realpathSync(join(root, 'node_modules')), '.pnpm')
function installed(name) {
  try { return require(name) } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error
    const packages = readdirSync(store).filter(item => item.startsWith(`${name}@`))
    assert.equal(packages.length, 1, `Need exactly one installed ${name}, or expose it in node_modules`)
    return require(join(store, packages[0], 'node_modules', name))
  }
}
const yaml = installed('yaml')
const jsYaml = installed('js-yaml')
const sourceHashes = new Map()
function sourceLoader(overrides) {
  const cache = new Map()
  function load(file) {
    file = resolve(file)
    if (cache.has(file)) return cache.get(file).exports
    const module = { exports: {} }
    cache.set(file, module)
    const source = readFileSync(file, 'utf8')
    sourceHashes.set(file, createHash('sha256').update(source).digest('hex'))
    const output = ts.transpileModule(source, { fileName: file, compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: false, esModuleInterop: true,
    } }).outputText
    const localRequire = spec => {
      if (Object.hasOwn(overrides, spec)) return overrides[spec]
      if (spec.startsWith('.')) return load(resolve(dirname(file), spec))
      return require(spec)
    }
    new Function('require', 'module', 'exports', output)(localRequire, module, module.exports)
    return module.exports
  }
  return load
}
const pluginLoader = sourceLoader({})
const { default: CollabUiService } = pluginLoader(join(root, 'packages/agent-team/src/bootstrap.ts'))
const NS = 'dsh-native-collab-ui'
const MODULE = '@sieuno/dsh-native-collab'

async function fixture(initial = {}, inherited = {}, { native = false, profileConfig = true } = {}) {
  const namespace = native ? 'subagent' : NS
  const moduleName = native ? '@deepseek-ai/dsh-subagent' : MODULE
  const directory = await mkdtemp(join(tmpdir(), 'dsh-collab-settings-'))
  const patchPath = join(directory, 'cordis.patch.yml')
  const sidecar = join(directory, 'unrelated.json')
  await writeFile(patchPath, yaml.stringify([{ id: namespace, name: moduleName, ...(profileConfig ? { config: initial } : {}) }]))
  await writeFile(sidecar, JSON.stringify({ sentinel: 'unchanged' }))
  await writeFile(join(directory, 'package.json'), '{}\n')
  const ctx = new Context()
  const profile = { name: 'isolated-contract', home: directory, dir: directory, patchPath, installAnchor: directory, overlays: [] }
  ctx.provide('profileContext', profile)
  let entry
  ctx.provide('loader', { await: () => Promise.resolve(), entries: () => entry ? [entry] : [] })
  ctx.provide('pluginManager', { listPlugins: async () => [] })
  const fiber = native ? undefined : ctx.plugin(CollabUiService, { ...inherited, ...initial })
  if (fiber) { await fiber.await(); assert.equal(fiber.state, FiberState.ACTIVE) }
  entry = {
    id: namespace, options: { id: namespace, name: moduleName, config: native ? (profileConfig ? { ...initial } : { ...inherited }) : { ...inherited, ...initial } }, fiber,
    ...(native ? { disabled: true, async update({ config }) { this.options.config = structuredClone(config) } } : {}),
    parent: { tree: { ctx: { fiber: { entry: { id: 'include' } } } } },
  }
  const layer = [{ id: namespace, name: moduleName, config: inherited }]
  const compose = layers => {
    let config = {}
    for (const patches of layers) for (const patch of patches) {
      if (patch.id === namespace && patch.config !== undefined) config = native ? structuredClone(patch.config) : { ...config, ...patch.config }
    }
    return [{ id: namespace, name: moduleName, config }]
  }
  const appBoot = {
    loadProfileDirectory() { return { layers: [{ patches: layer }], patches: yaml.parse(readFileSync(patchPath, 'utf8')) } },
    readProfilePatches(_name, _profile, loaded) {
      const patches = loaded?.patches ?? yaml.parse(readFileSync(patchPath, 'utf8'))
      return compose([layer, patches])
    },
    composeEntries: compose,
    async reconcileProfilePatches(_root, patches) {
      entry.options.config = structuredClone(compose([patches])[0].config)
    },
  }
  const load = sourceLoader({
    '@deepseek-ai/cordis': cordis,
    '@deepseek-ai/cosmokit': cosmo,
    '@deepseek-ai/cordis-plugin-loader': { interpolate: (_ctx, value) => value },
    '@deepseek-ai/cordis-plugin-include': { entryListSchema: jsYaml.DEFAULT_SCHEMA },
    '@deepseek-ai/dsh-app-boot': appBoot,
    '@deepseek-ai/dsh-atomic-write': { withFileLock: async (_path, callback) => callback(), writeFileAtomic: writeFile },
    yaml, 'js-yaml': jsYaml,
  })
  const { ConfigEditor } = load(join(official, 'packages/boot/config-editor/src/index.ts'))
  const { SettingsForms } = load(join(official, 'packages/settings/settings/src/index.ts'))
  const editorFiber = ctx.plugin(ConfigEditor)
  await editorFiber.await()
  const settingsFiber = ctx.plugin(SettingsForms)
  await settingsFiber.await()
  assert.equal(settingsFiber.state, FiberState.ACTIVE)
  const settings = ctx.get('settings')
  const snapshot = () => settings.describe().find(item => item.ns === namespace)
  if (native) assert.equal(snapshot(), undefined, 'the official form excludes a disabled native entry')
  else assert.ok(snapshot())
  return { ctx, fiber, entry, settings, snapshot, patchPath, sidecar, directory,
    readConfig: async () => yaml.parse(await readFile(patchPath, 'utf8')).find(item => item.id === namespace)?.config ?? {},
    async close() { await ctx.fiber.dispose() },
  }
}

test('native limits use official ConfigEditor layers while the original SettingsForms namespace is unavailable', async t => {
  const { NativeSubagentLimits } = pluginLoader(join(root, 'packages/agent-team/src/native-subagent-limits.ts'))
  const f = await fixture({ maxDepth: 2, otherNativeFlag: false }, { maxDepth: 3, maxActiveSubagents: 4 }, { native: true })
  try {
    const layer = f.ctx.get('configEditor').configuration().find(row => row.entry === f.entry)
    assert.equal(layer.inherited.maxActiveSubagents, 4)
    assert.deepEqual(layer.override, { maxDepth: 2, otherNativeFlag: false })
    assert.equal(f.snapshot(), undefined)
    const adapter = new NativeSubagentLimits(f.ctx)
    const initial = await adapter.read()
    assert.deepEqual(initial.values, { maxDepth: 2, maxActiveSubagents: 8 }, 'profile config replaces the inherited object, rather than merging individual fields')
    const unrelated = await readFile(f.sidecar)
    const saved = await adapter.save({ revision: initial.revision, maxDepth: 0, maxActiveSubagents: 3 })
    assert.deepEqual(saved.values, { maxDepth: 0, maxActiveSubagents: 3 })
    assert.deepEqual(await f.readConfig(), { maxDepth: 0, otherNativeFlag: false, maxActiveSubagents: 3 })
    assert.deepEqual(await readFile(f.sidecar), unrelated)
    assert.equal(f.entry.fiber, undefined, 'saving never activates the original provider')
    assert.equal(f.snapshot(), undefined, 'this does not claim to restore the native page')
    t.diagnostic('Official ConfigEditor.configuration with a disabled native entry, real temporary YAML and plugin atomic/lock helpers; profile composition and entry update remain explicit adapters, not a full Host.')
  } finally { await f.close() }
})

test('inherited native values and unrelated fields survive the first explicit save and native schema rehydration', async () => {
  const { NativeSubagentLimits } = pluginLoader(join(root, 'packages/agent-team/src/native-subagent-limits.ts'))
  const inherited = { maxDepth: 3, maxActiveSubagents: 4, otherNativeFlag: false }
  const f = await fixture({}, inherited, { native: true, profileConfig: false })
  try {
    const adapter = new NativeSubagentLimits(f.ctx)
    const initial = await adapter.read()
    assert.deepEqual(initial.values, { maxDepth: 3, maxActiveSubagents: 4 })
    await adapter.save({ revision: initial.revision, maxDepth: 2, maxActiveSubagents: 5 })
    const persisted = await f.readConfig()
    assert.deepEqual(persisted, { maxDepth: 2, maxActiveSubagents: 5, otherNativeFlag: false })
    const nativeRuntime = require('@deepseek-ai/dsh-subagent').SubagentRuntime
    const config = cordis.resolveConfig(nativeRuntime, persisted)
    assert.equal(config.maxDepth.get(), 2)
    assert.equal(config.maxActiveSubagents.get(), 5)
  } finally { await f.close() }
})

test('actual SettingsForms + ConfigEditor reject invalid consecutive wake limits before YAML write', async t => {
  const f = await fixture({ modelEnhancement: true, teamRequestLimit: 3 })
  try {
    const original = await readFile(f.patchPath)
    const unrelated = await readFile(f.sidecar)
    assert.throws(() => f.fiber.ctx.waterfall(f.fiber, 'internal/config', { teamRequestLimit: null }, () => ({ teamRequestLimit: null })), /positive safe integer/)
    for (const value of [null, 0, -1, 1.5, '3', Number.MAX_SAFE_INTEGER + 1, NaN, Infinity]) {
      const before = f.snapshot()
      await assert.rejects(f.settings.mutate(NS, [{ op: 'set', path: ['teamRequestLimit'], value }], before.revision), undefined, `Invalid quota must reject: ${String(value)}`)
      assert.deepEqual(await readFile(f.patchPath), original, `invalid value persisted: ${String(value)}`)
      assert.equal(f.snapshot().revision, before.revision, 'Rejected writes must not consume revisions')
    }
    assert.deepEqual(await readFile(f.sidecar), unrelated)
    assert.equal(f.fiber.state, FiberState.ACTIVE)
    t.diagnostic('Official source SettingsForms.mutate/write -> ConfigEditor.edit -> Cordis internal/config; no RPC or full Host.')
  } finally { await f.close() }
})

test('official settings descriptors read the running fiber value and distinguish inherited and profile layers', async () => {
  const f = await fixture({ teamRequestLimit: 7, modelEnhancement: true }, { teamRequestLimit: 11, modelEnhancement: false })
  try {
    const descriptor = f.snapshot()
    assert.equal(descriptor.value.teamRequestLimit, 7)
    assert.equal(descriptor.value.modelEnhancement, true)
    assert.equal(descriptor.base.teamRequestLimit, 11)
    assert.equal(descriptor.base.modelEnhancement, false)
    assert.equal(descriptor.user.teamRequestLimit, 7)
    assert.equal(descriptor.user.modelEnhancement, true)
  } finally { await f.close() }
})

test('wake limit accepts positive safe integer boundaries', async () => {
  const f = await fixture()
  try {
    for (const value of [1, Number.MAX_SAFE_INTEGER]) {
      await f.settings.mutate(NS, [{ op: 'set', path: ['teamRequestLimit'], value }], f.snapshot().revision)
      assert.equal((await f.readConfig()).teamRequestLimit, value)
    }
  } finally { await f.close() }
})

test('individual settings saves preserve siblings, reject stale revisions, and apply startup snapshot on restart', async () => {
  const initial = { modelEnhancement: false, communicationEnhancement: false, teamRequestLimit: 3 }
  const f = await fixture(initial)
  try {
    const unrelated = await readFile(f.sidecar)
    const stale = f.snapshot().revision
    const expected = { ...initial }
    const edits = [
      ['modelEnhancement', true], ['communicationEnhancement', true],
      ['runningChildGuidance', false], ['completedChildContinuation', true],
      ['nativeModelSelectionCompatibility', false], ['modelSource', 'all'],
      ['teamRequestLimit', 7], ['runtimeMode', 'native'],
    ]
    for (const [key, value] of edits) {
      const revision = f.snapshot().revision
      await f.settings.mutate(NS, [{ op: 'set', path: [key], value }], revision)
      expected[key] = value
      assert.deepEqual(await f.readConfig(), expected, `single-field save preserves siblings: ${key}`)
      assert.ok(f.snapshot().revision > revision)
    }
    const snapshot = f.ctx.get('collabUi').assemblySnapshot()
    assert.equal(snapshot.teamRequestLimit, 3)
    assert.equal(snapshot.modelEnhancement, false)
    await assert.rejects(f.settings.mutate(NS, [{ op: 'set', path: ['teamRequestLimit'], value: 9 }], stale), error => error.code === 'SETTINGS_CONFLICT')
    assert.deepEqual(await f.readConfig(), expected)
    const restarted = new Context()
    try {
      restarted.provide('loader', { await: () => Promise.resolve(), entries: () => [] })
      restarted.provide('pluginManager', { listPlugins: async () => [] })
      const restartFiber = restarted.plugin(CollabUiService, expected)
      await restartFiber.await()
      assert.equal(restartFiber.state, FiberState.ACTIVE)
      const next = restarted.get('collabUi').assemblySnapshot()
      for (const [key, value] of edits.filter(([key]) => key !== 'runtimeMode')) assert.equal(next[key], value, key)
    } finally { await restarted.fiber.dispose() }
    await f.settings.mutate(NS, [{ op: 'unset', path: ['teamRequestLimit'] }], f.snapshot().revision)
    delete expected.teamRequestLimit
    assert.deepEqual(await f.readConfig(), expected)
    assert.deepEqual(await readFile(f.sidecar), unrelated)
  } finally { await f.close() }
})

test('legacy YAML null is read as unset without rewriting and can be cleared', async () => {
  const f = await fixture({ teamRequestLimit: null, modelEnhancement: false })
  try {
    assert.equal(f.ctx.get('collabUi').assemblySnapshot().teamRequestLimit, undefined)
    assert.equal((await f.readConfig()).teamRequestLimit, null, 'Recovery does not silently rewrite an existing profile')
    const unrelated = await readFile(f.sidecar)
    await f.settings.mutate(NS, [{ op: 'unset', path: ['teamRequestLimit'] }], f.snapshot().revision)
    assert.deepEqual(await f.readConfig(), { modelEnhancement: false })
    assert.deepEqual(await readFile(f.sidecar), unrelated)
  } finally { await f.close() }
})

test('unset inherits the lower-layer wake limit; validation is scoped to its exact Cordis fiber', async () => {
  const f = await fixture({ teamRequestLimit: 7 }, { teamRequestLimit: 11 })
  try {
    await f.settings.mutate(NS, [{ op: 'unset', path: ['teamRequestLimit'] }], f.snapshot().revision)
    assert.equal(Object.hasOwn(await f.readConfig(), 'teamRequestLimit'), false)
    assert.equal(f.entry.options.config.teamRequestLimit, 11)
    const raw = { teamRequestLimit: null }
    assert.equal(f.ctx.waterfall(f.ctx.fiber, 'internal/config', raw, () => raw), raw)
  } finally { await f.close() }
})

test('records exact official source hashes for this source-contract test', t => {
  for (const [path, digest] of sourceHashes) {
    if (path.startsWith(official)) t.diagnostic(`${path.slice(official.length + 1).replaceAll('\\', '/')} sha256 ${digest}`)
  }
  assert.ok(sourceHashes.has(join(official, 'packages/boot/config-editor/src/index.ts')))
})
