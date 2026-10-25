import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, realpathSync } from 'node:fs'
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { createHash } from 'node:crypto'

// Executes unmodified official SettingsForms, ConfigEditor and schema helpers,
// with installed Cordis/Schemastery and real temporary YAML files. Profile layer
// composition, reconciliation and locking are explicit single-entry adapters.
// This is not a running Host, settings RPC, or complete Loader/preset assembly.
const root = resolve(import.meta.dirname, '..')
const official = process.env.DSH_SOURCE_ROOT || resolve(root, '../../plugins/deepseek-harness-dsh-v0.2.1-rc.2')
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
const { Config, default: CollabUiService } = pluginLoader(join(root, 'packages/agent-team/src/bootstrap.ts'))
const NS = 'dsh-native-collab-ui'
const MODULE = '@dsh-native-collab/derived'

async function fixture(initial = {}, inherited = {}) {
  const directory = await mkdtemp(join(root, '../../reviews/rc7-fixes/lead/settings-'))
  const patchPath = join(directory, 'cordis.patch.yml')
  const sidecar = join(directory, 'budget.json')
  await writeFile(patchPath, yaml.stringify([{ id: NS, name: MODULE, config: initial }]))
  await writeFile(sidecar, JSON.stringify({ ledgerVersion: 1, epoch: 1, limit: 3, used: 3 }))
  await writeFile(join(directory, 'package.json'), '{}\n')
  const ctx = new Context()
  const profile = { name: 'isolated-contract', home: directory, dir: directory, patchPath, installAnchor: directory }
  ctx.provide('profileContext', profile)
  let entry
  ctx.provide('loader', { await: () => Promise.resolve(), entries: () => entry ? [entry] : [] })
  const fiber = ctx.plugin(CollabUiService, { ...inherited, ...initial })
  await fiber.await()
  assert.equal(fiber.state, FiberState.ACTIVE)
  entry = {
    id: NS, options: { id: NS, name: MODULE, config: { ...inherited, ...initial } }, fiber,
    parent: { tree: { ctx: { fiber: { entry: { id: 'include' } } } } },
  }
  const layer = [{ id: NS, name: MODULE, config: inherited }]
  const compose = layers => {
    let config = {}
    for (const patches of layers) for (const patch of patches) {
      if (patch.id === NS && patch.config !== undefined) config = { ...config, ...patch.config }
    }
    return [{ id: NS, name: MODULE, config }]
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
  const snapshot = () => settings.describe().find(item => item.ns === NS)
  assert.ok(snapshot())
  return { ctx, fiber, entry, settings, snapshot, patchPath, sidecar, directory,
    readConfig: async () => yaml.parse(await readFile(patchPath, 'utf8')).find(item => item.id === NS)?.config ?? {},
    async close() { await ctx.fiber.dispose() },
  }
}

await mkdir(resolve(root, '../../reviews/rc7-fixes/lead'), { recursive: true })
test('RC7 actual SettingsForms + ConfigEditor reject null/invalid quota before YAML write with fresh revisions', async t => {
  const f = await fixture({ modelEnhancement: true, teamRequestLimit: 3 })
  try {
    const original = await readFile(f.patchPath)
    const ledger = await readFile(f.sidecar)
    assert.throws(() => f.fiber.ctx.waterfall(f.fiber, 'internal/config', { teamRequestLimit: null }, () => ({ teamRequestLimit: null })), /positive safe integer/)
    for (const value of [null, 0, -1, 1.5, '3', Number.MAX_SAFE_INTEGER + 1, NaN, Infinity]) {
      const before = f.snapshot()
      await assert.rejects(f.settings.mutate(NS, [{ op: 'set', path: ['teamRequestLimit'], value }], before.revision), undefined, `Invalid quota must reject: ${String(value)}`)
      assert.deepEqual(await readFile(f.patchPath), original, `invalid value persisted: ${String(value)}`)
      assert.equal(f.snapshot().revision, before.revision, 'Rejected writes must not consume revisions')
    }
    assert.deepEqual(await readFile(f.sidecar), ledger)
    assert.equal(f.fiber.state, FiberState.ACTIVE)
    t.diagnostic('Official source SettingsForms.mutate/write -> ConfigEditor.edit -> Cordis internal/config; no RPC or full Host.')
  } finally { await f.close() }
})

test('RC7 real settings persistence/unset/restart preserve other preferences and old ledger', async () => {
  const f = await fixture({ modelEnhancement: true, communicationEnhancement: false, teamRequestLimit: 3 })
  try {
    const ledger = await readFile(f.sidecar)
    const stale = f.snapshot().revision
    await f.settings.mutate(NS, [{ op: 'set', path: ['teamRequestLimit'], value: 7 }], stale)
    assert.deepEqual(await f.readConfig(), { modelEnhancement: true, communicationEnhancement: false, teamRequestLimit: 7 })
    assert.equal(f.ctx.get('collabUi').assemblySnapshot().teamRequestLimit, 3, 'No live snapshot switch on save')
    await assert.rejects(f.settings.mutate(NS, [{ op: 'set', path: ['teamRequestLimit'], value: 9 }], stale), error => error.code === 'SETTINGS_CONFLICT')
    const saved = await f.readConfig()
    const restarted = new Context()
    const restartFiber = restarted.plugin(CollabUiService, saved)
    await restartFiber.await()
    assert.equal(restartFiber.state, FiberState.ACTIVE)
    assert.equal(restarted.get('collabUi').assemblySnapshot().teamRequestLimit, 7)
    await restarted.fiber.dispose()
    await f.settings.mutate(NS, [{ op: 'unset', path: ['teamRequestLimit'] }], f.snapshot().revision)
    assert.deepEqual(await f.readConfig(), { modelEnhancement: true, communicationEnhancement: false })
    assert.deepEqual(await readFile(f.sidecar), ledger)
  } finally { await f.close() }
})

test('RC7 legacy RC6 YAML null restarts as unset, never rewrites profile/ledger, and can be cleared', async () => {
  const f = await fixture({ teamRequestLimit: null, modelEnhancement: false })
  try {
    assert.equal(f.ctx.get('collabUi').assemblySnapshot().teamRequestLimit, undefined)
    assert.equal((await f.readConfig()).teamRequestLimit, null, 'Recovery does not silently rewrite an existing profile')
    const ledger = await readFile(f.sidecar)
    await f.settings.mutate(NS, [{ op: 'unset', path: ['teamRequestLimit'] }], f.snapshot().revision)
    assert.deepEqual(await f.readConfig(), { modelEnhancement: false })
    assert.deepEqual(await readFile(f.sidecar), ledger)
  } finally { await f.close() }
})

test('RC7 unset inherits Team-row policy; validation hook is scoped to its exact Cordis fiber', async () => {
  const f = await fixture({ teamRequestLimit: 7 }, { teamRequestLimit: 11 })
  try {
    await f.settings.mutate(NS, [{ op: 'unset', path: ['teamRequestLimit'] }], f.snapshot().revision)
    assert.equal(Object.hasOwn(await f.readConfig(), 'teamRequestLimit'), false)
    assert.equal(f.entry.options.config.teamRequestLimit, 11)
    const raw = { teamRequestLimit: null }
    assert.equal(f.ctx.waterfall(f.ctx.fiber, 'internal/config', raw, () => raw), raw)
  } finally { await f.close() }
})

test('RC7 records exact official source hashes for this source-contract test', t => {
  for (const [path, digest] of sourceHashes) {
    if (path.startsWith(official)) t.diagnostic(`${path.slice(official.length + 1).replaceAll('\\', '/')} sha256 ${digest}`)
  }
  assert.ok(sourceHashes.has(join(official, 'packages/boot/config-editor/src/index.ts')))
})
