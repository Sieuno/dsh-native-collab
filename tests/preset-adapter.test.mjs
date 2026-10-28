// Pure-memory preset adapter. transpileModule plus a virtual require; no Cordis
// SDK, disk write, loader, Profile, or host. Native recovery is the absence of
// the hook, not a second code path inside the mapper.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const require = createRequire(import.meta.url)
const ts = require(process.env.DSH_TYPESCRIPT_ENTRY || 'typescript')
const sourcePath = join(root, 'packages/agent-team/src/preset-adapter.ts')
const source = await readFile(sourcePath, 'utf8')
const uiSource = await readFile(join(root, 'packages/agent-team/src/collab-ui.ts'), 'utf8')
function transpile(text, file) {
  return ts.transpileModule(text, { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
}
const compiled = transpile(source, sourcePath)
const loads = []
const loaded = { exports: {} }
new Function('require', 'module', 'exports', compiled)(name => {
  loads.push(name)
  throw new Error(`preset-adapter must not load ${name}`)
}, loaded, loaded.exports)
const { MANAGED_PRESET_IDS, adaptPresetConfig, installPresetAdapter } = loaded.exports
const PRESET = '@deepseek-ai/dsh-agent-preset'
const NAMES = {
  control: '@sieuno/dsh-native-collab/tool-subagent-control',
  list: '@sieuno/dsh-native-collab/tool-subagent-control/list-agents',
  spawn: '@sieuno/dsh-native-collab/tool-subagent',
  fork: '@sieuno/dsh-native-collab/tool-subagent/fork',
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) freeze(child)
  return Object.freeze(value)
}
function install(enhancements = () => ({ model: true, communication: true })) {
  const events = []
  let reads = 0
  installPresetAdapter({ on(name, listener, options) { events.push({ name, listener, options }) } }, () => {
    reads += 1
    return enhancements()
  })
  assert.equal(events.length, 1)
  return Object.assign(events[0], { reads: () => reads })
}
function fiber(entry, parent = {}) {
  return { entry, parent }
}

test('transpileModule loads preset-adapter without cordis, disk, or a loader', () => {
  const imports = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.ES2022, true).statements.filter(ts.isImportDeclaration)
  assert.deepEqual(imports.map(item => item.moduleSpecifier.text), ['@deepseek-ai/cordis', '@deepseek-ai/cordis-plugin-loader'])
  assert.ok(imports.every(item => item.importClause?.isTypeOnly), 'all SDK imports are erased types')
  assert.match(source, /import type \{ Context, Fiber \} from '@deepseek-ai\/cordis'/)
  assert.doesNotMatch(compiled, /['"]@deepseek-ai\/cordis['"]|require\s*\(|import\s*\(|node:fs|writeFile|createRequire|\.loader\b/i)
  assert.deepEqual(loads, [])
  assert.deepEqual([...MANAGED_PRESET_IDS], ['preset-standard', 'preset-minimal', 'preset-ptc', 'preset-cordis'])
  assert.equal(Object.isFrozen(MANAGED_PRESET_IDS), true)
  assert.equal(typeof adaptPresetConfig, 'function')
  assert.equal(typeof installPresetAdapter, 'function')
  assert.doesNotMatch(source, /^installPresetAdapter\(/m)
})

test('nested group rewrites four roles, preserves fields, and leaves unknown or custom providers unchanged', () => {
  const control = { id: 'tool-subagent-control', name: '@deepseek-ai/dsh-tool-subagent-control', disabled: false, metadata: { role: 'control' }, persona: 'control-persona' }
  const list = { id: 'tool-subagent-list-agents', name: '@deepseek-ai/dsh-tool-subagent-control/list-agents', disabled: true, metadata: { role: 'list' }, persona: { voice: 'list' } }
  const spawn = { id: 'tool-subagent', name: '@deepseek-ai/dsh-tool-subagent', disabled: false, metadata: { role: 'spawn' }, persona: { id: 'spawn' }, config: { provider: 'spawn', toolName: 'subagent', modelSelectionSettings: true } }
  const fork = { id: 'tool-subagent-fork', name: '@deepseek-ai/dsh-tool-subagent', metadata: { role: 'fork' }, persona: { id: 'fork' }, config: { provider: 'fork', toolName: 'subagent_fork' } }
  const custom = { id: 'tool-subagent', name: '@deepseek-ai/dsh-tool-subagent', metadata: { role: 'custom' }, config: { provider: 'custom', toolName: 'mine' } }
  const dynamic = { id: 'tool-subagent-fork', name: '@deepseek-ai/dsh-tool-subagent', metadata: { role: 'dynamic' }, config: { provider: 'dynamic' } }
  const nameOnly = { id: 'not-a-role', name: '@deepseek-ai/dsh-tool-subagent', config: { provider: 'spawn' } }
  const unknown = { id: 'unknown-plugin', name: '@example/completely-unknown', disabled: '!!js process.platform', metadata: { keep: true }, persona: { b: 2 }, etc: true }
  const otherProvider = { id: 'workflow-ptc', name: '@deepseek-ai/dsh-workflow-ptc', config: { provider: 'spawn' } }
  const quiet = { id: 'quiet', name: 'cordis:group', group: true, config: [{ id: 'persona-inner', name: '@deepseek-ai/dsh-persona' }] }
  const omitted = { id: 'tool-subagent', name: '@deepseek-ai/dsh-tool-subagent', disabled: false }
  const badConfig = { id: 'tool-subagent', name: '@deepseek-ai/dsh-tool-subagent', config: ['not-a-record'] }
  const input = freeze({
    id: 'preset-standard',
    order: 1,
    plugins: [
      { id: 'persona', name: '@deepseek-ai/dsh-persona', persona: 'outer', config: { prefix: 'kept' } },
      {
        id: 'outer', name: 'cordis:group', group: true, isolate: { planMode: true }, metadata: { layer: 'outer' }, persona: { voice: 'outer' },
        config: [{
          id: 'delegation', name: 'cordis:group', group: true, isolate: { workflowEngine: true }, metadata: { title: 'delegation' }, persona: { voice: 'group' },
          config: [control, list, spawn, fork, custom, dynamic, nameOnly, unknown, otherProvider, null],
        }, quiet],
      },
      omitted,
      badConfig,
    ],
  })
  const result = adaptPresetConfig(input)
  assert.notEqual(result, input)
  assert.equal(input.plugins[0].name, '@deepseek-ai/dsh-persona')
  assert.equal(result.plugins[0], input.plugins[0])
  const outer = result.plugins[1]
  assert.notEqual(outer, input.plugins[1])
  assert.equal(outer.isolate, input.plugins[1].isolate)
  assert.equal(outer.metadata, input.plugins[1].metadata)
  assert.equal(outer.persona, input.plugins[1].persona)
  const delegation = outer.config[0]
  assert.equal(delegation.isolate, input.plugins[1].config[0].isolate)
  assert.equal(delegation.metadata, input.plugins[1].config[0].metadata)
  assert.equal(delegation.persona, input.plugins[1].config[0].persona)
  const [nextControl, nextList, nextSpawn, nextFork, nextCustom, nextDynamic, nextNameOnly, nextUnknown, nextOther, nextNull] = delegation.config
  assert.equal(nextControl.name, NAMES.control)
  assert.equal(nextList.name, NAMES.list)
  assert.equal(nextSpawn.name, NAMES.spawn)
  assert.equal(nextFork.name, NAMES.fork)
  for (const [next, previous] of [[nextControl, control], [nextList, list], [nextSpawn, spawn], [nextFork, fork]]) {
    assert.notEqual(next, previous)
    assert.equal(next.disabled, previous.disabled)
    assert.equal(next.metadata, previous.metadata)
    assert.equal(next.persona, previous.persona)
    assert.equal(next.config, previous.config)
    assert.equal(previous.name.startsWith('@deepseek-ai/'), true)
  }
  assert.equal(nextCustom, custom)
  assert.equal(nextDynamic, dynamic)
  assert.equal(nextNameOnly, nameOnly)
  assert.equal(nextUnknown, unknown)
  assert.equal(nextOther, otherProvider)
  assert.equal(nextNull, null)
  assert.equal(outer.config[1], quiet)
  assert.equal(result.plugins[2].name, NAMES.spawn)
  assert.equal('config' in result.plugins[2], false)
  assert.equal(result.plugins[3], badConfig)
  assert.equal(adaptPresetConfig(result), result)
  const untouched = freeze({ plugins: [unknown, custom] })
  assert.equal(adaptPresetConfig(untouched), untouched)
  const notPlugins = { plugins: { no: true } }
  assert.equal(adaptPresetConfig(notPlugins), notPlugins)
  assert.equal(adaptPresetConfig(null), null)
})

test('hook is global prepend, handles only known preset entries, calls next once, and does not read raw config', () => {
  const hook = install()
  assert.equal(hook.name, 'internal/config')
  assert.deepEqual(hook.options, { global: true, prepend: true })
  const resolved = freeze({
    plugins: [
      { id: 'tool-subagent-fork', name: '@deepseek-ai/dsh-tool-subagent', config: { provider: 'fork', toolName: 'subagent_fork' }, metadata: { keep: true } },
      { id: 'tool-subagent', name: '@deepseek-ai/dsh-tool-subagent', config: { provider: 'custom' } },
    ],
  })
  const raw = new Proxy({}, { get() { throw new Error('raw config was read') } })
  for (const id of MANAGED_PRESET_IDS) {
    let calls = 0
    const result = hook.listener.call(fiber({ options: { name: PRESET, id } }), raw, (...args) => {
      calls += 1
      assert.deepEqual(args, [])
      return resolved
    })
    assert.equal(calls, 1)
    assert.notEqual(result, resolved)
    assert.equal(result.plugins[0].name, NAMES.fork)
    assert.equal(result.plugins[0].config, resolved.plugins[0].config)
    assert.equal(result.plugins[0].metadata, resolved.plugins[0].metadata)
    assert.equal(result.plugins[1], resolved.plugins[1])
    assert.equal(resolved.plugins[0].name, '@deepseek-ai/dsh-tool-subagent')
  }
  assert.equal(hook.reads(), MANAGED_PRESET_IDS.length)
  const same = { options: { name: PRESET, id: 'preset-standard' } }
  const passthrough = [
    fiber({ options: { name: PRESET, id: 'preset-user' } }),
    fiber({ options: { name: PRESET } }),
    fiber({ options: { name: '@deepseek-ai/dsh-subagent', id: 'subagent' } }),
    fiber({ options: { name: '@sieuno/dsh-native-collab', id: 'dsh-native-collab-ui' } }),
    fiber(same, { fiber: { entry: same } }),
    {},
    { entry: null },
  ]
  for (const current of passthrough) {
    let calls = 0
    const value = { plugins: [{ id: 'tool-subagent', name: '@deepseek-ai/dsh-tool-subagent', config: { provider: 'spawn' } }] }
    const result = hook.listener.call(current, raw, () => { calls += 1; return value })
    assert.equal(calls, 1)
    assert.equal(result, value)
    assert.equal(value.plugins[0].name, '@deepseek-ai/dsh-tool-subagent')
  }
  assert.equal(hook.reads(), MANAGED_PRESET_IDS.length)
})

test('native recovery has no hook, so original tool names stay unchanged', () => {
  assert.equal(uiSource.match(/installPresetAdapter\(/g).length, 1)
  assert.match(uiSource, /installPresetAdapter\(ctx, \(\) => \(\{ model: this\.assembly\?\.modelEnhancement === true, communication: this\.assembly\?\.communicationEnhancement === true \}\)\)\r?\n\s*this\.managedRuntime = new ManagedRuntime\(ctx, 'managed'\)/)
  assert.equal(uiSource.slice(0, uiSource.indexOf('constructor(')).includes('installPresetAdapter('), false)
  assert.equal(loads.length, 0)
  const original = {
    plugins: [
      { id: 'tool-subagent-control', name: '@deepseek-ai/dsh-tool-subagent-control' },
      { id: 'tool-subagent-list-agents', name: '@deepseek-ai/dsh-tool-subagent-control/list-agents' },
      { id: 'tool-subagent', name: '@deepseek-ai/dsh-tool-subagent', config: { provider: 'spawn' } },
      { id: 'tool-subagent-fork', name: '@deepseek-ai/dsh-tool-subagent', config: { provider: 'fork' } },
    ],
  }
  assert.deepEqual(original.plugins.map(plugin => plugin.name), [
    '@deepseek-ai/dsh-tool-subagent-control',
    '@deepseek-ai/dsh-tool-subagent-control/list-agents',
    '@deepseek-ai/dsh-tool-subagent',
    '@deepseek-ai/dsh-tool-subagent',
  ])
  const rewritten = adaptPresetConfig(original)
  assert.notEqual(rewritten, original)
  assert.deepEqual(rewritten.plugins.map(plugin => plugin.name), [NAMES.control, NAMES.list, NAMES.spawn, NAMES.fork])
  assert.deepEqual(original.plugins.map(plugin => plugin.name), [
    '@deepseek-ai/dsh-tool-subagent-control',
    '@deepseek-ai/dsh-tool-subagent-control/list-agents',
    '@deepseek-ai/dsh-tool-subagent',
    '@deepseek-ai/dsh-tool-subagent',
  ])
})

test('enhancement flags select roles on each call and are not pinned', () => {
  const plugins = [
    { id: 'tool-subagent-control', name: '@deepseek-ai/dsh-tool-subagent-control', metadata: { role: 'control' } },
    { id: 'tool-subagent-list-agents', name: '@deepseek-ai/dsh-tool-subagent-control/list-agents', metadata: { role: 'list' } },
    { id: 'tool-subagent', name: '@deepseek-ai/dsh-tool-subagent', config: { provider: 'spawn' }, metadata: { role: 'spawn' } },
    { id: 'tool-subagent-fork', name: '@deepseek-ai/dsh-tool-subagent', config: { provider: 'fork' }, metadata: { role: 'fork' } },
  ]
  const input = freeze({ plugins })
  assert.equal(adaptPresetConfig(input, { model: false, communication: false }), input)
  const communicationOnly = adaptPresetConfig(input, { model: false, communication: true })
  assert.deepEqual(communicationOnly.plugins.map(plugin => plugin.name), [NAMES.control, NAMES.list, plugins[2].name, plugins[3].name])
  assert.equal(communicationOnly.plugins[2], plugins[2])
  assert.equal(communicationOnly.plugins[3], plugins[3])
  assert.equal(communicationOnly.plugins[0].metadata, plugins[0].metadata)
  const modelOnly = adaptPresetConfig(input, { model: true, communication: false })
  assert.deepEqual(modelOnly.plugins.map(plugin => plugin.name), [plugins[0].name, plugins[1].name, NAMES.spawn, NAMES.fork])
  assert.equal(modelOnly.plugins[0], plugins[0])
  assert.equal(modelOnly.plugins[1], plugins[1])
  let flags = { model: false, communication: false }
  const hook = install(() => flags)
  const raw = new Proxy({}, { get() { throw new Error('raw config was read') } })
  const entry = fiber({ options: { name: PRESET, id: 'preset-standard' } })
  let calls = 0
  const next = () => { calls += 1; return input }
  assert.equal(hook.listener.call(entry, raw, next), input)
  assert.equal(calls, 1)
  assert.equal(hook.reads(), 1)
  flags = { model: true, communication: true }
  const rewritten = hook.listener.call(entry, raw, next)
  assert.equal(calls, 2)
  assert.equal(hook.reads(), 2)
  assert.notEqual(rewritten, input)
  assert.deepEqual(rewritten.plugins.map(plugin => plugin.name), [NAMES.control, NAMES.list, NAMES.spawn, NAMES.fork])
  assert.deepEqual(input.plugins.map(plugin => plugin.name), plugins.map(plugin => plugin.name))
})
