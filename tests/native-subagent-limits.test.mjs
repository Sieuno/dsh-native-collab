import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const yaml = require('yaml')
const source = resolve(dirname(fileURLToPath(import.meta.url)), '../packages/agent-team/src/native-subagent-limits.ts')

function loadAdapter() {
  const atomic = {
    async withFileLock(path, callback) { this.lockPaths.push(path); return callback() },
    async writeFileAtomic(path, content) { this.writes.push(path); await writeFile(path, content) },
    lockPaths: [],
    writes: [],
  }
  const compiled = ts.transpileModule(awaitlessRead(source), {
    fileName: source,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  const localRequire = specifier => specifier === '@deepseek-ai/dsh-atomic-write' ? atomic : require(specifier)
  new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports)
  return { api: module.exports, atomic }
}

// Read synchronously only to keep the CommonJS transpile fixture self-contained.
function awaitlessRead(path) {
  return require('node:fs').readFileSync(path, 'utf8')
}

async function fixture({ config = { maxDepth: 2, maxActiveSubagents: 4, deliverySelection: true }, inherited = {}, overlays = [], profileConfigPresent = true, emptyProfileConfig = false, profileRowPresent = true } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'native-subagent-limits-'))
  const patchPath = join(dir, 'cordis.patch.yml')
  const configYaml = emptyProfileConfig ? '  config: {}\n' : profileConfigPresent
    ? `  config:\n    maxDepth: ${config.maxDepth ?? 1} # keep this field comment\n    maxActiveSubagents: ${config.maxActiveSubagents ?? 8}\n    deliverySelection: ${config.deliverySelection ?? true}\n`
    : ''
  const nativeRow = profileRowPresent ? `- id: subagent\n  name: '@deepseek-ai/dsh-subagent'\n  disabled: true\n${configYaml}` : ''
  const sourceText = `# preserved profile header\n${nativeRow}- id: unrelated\n  name: example/other\n  config: { keep: true }\n`
  await writeFile(patchPath, sourceText)
  const entry = {
    options: { id: 'subagent', name: '@deepseek-ai/dsh-subagent', config: { ...config } },
    disabled: true,
    fiber: undefined,
    async update(options) {
      if (fixtureState.failNextUpdate) {
        fixtureState.failNextUpdate = false
        throw new Error('synthetic loader update failure with private path C:\\secret')
      }
      this.options.config = options.config
      layer.override = { ...options.config }
    },
  }
  const layer = { entry, inherited: { ...inherited }, override: profileRowPresent && profileConfigPresent && !emptyProfileConfig ? { ...config } : {} }
  const fixtureState = { failNextUpdate: false }
  const services = {
    loader: { entries: () => [entry] },
    configEditor: { documentPath: patchPath, configuration: () => [{ ...layer }] },
    profileContext: { dir, patchPath, overlays },
    hmr: { async runExclusive(callback) { fixtureState.exclusiveCalls++; return callback() } },
  }
  fixtureState.exclusiveCalls = 0
  const ctx = { get(name) { return services[name] } }
  const { api, atomic } = loadAdapter()
  const adapter = new api.NativeSubagentLimits(ctx, {
    async readFile(path, encoding) { return readFile(path, encoding) },
    async withFileLock(path, callback) { return atomic.withFileLock(path, callback) },
    async writeFileAtomic(path, content, options) { return atomic.writeFileAtomic(path, content, options) },
  })
  return {
    api, adapter, entry, layer, fixtureState, atomic, ctx, patchPath, dir,
    async close() { await rm(dir, { recursive: true, force: true }) },
  }
}

test('synchronous current limits reads only the unique native entry and applies native defaults', async t => {
  const f = await fixture({ config: { deliverySelection: true } })
  try {
    assert.deepEqual(f.api.currentNativeSubagentLimits(f.ctx), { maxDepth: 1, maxActiveSubagents: 8 })
    assert.deepEqual(f.api.currentSubagentLimits(f.ctx), { maxDepth: 1, maxActiveSubagents: 8 })
    assert.equal(f.api.currentNativeSubagentLimits({ get: () => undefined }), undefined)
    assert.equal(f.api.currentNativeSubagentLimits({ get: name => name === 'loader' ? { entries: () => [] } : undefined }), undefined)
    f.entry.options.config.maxDepth = { get: () => 3 }
    assert.equal(f.api.currentNativeSubagentLimits(f.ctx).maxDepth, 3)
    f.entry.options.config.maxDepth = -0
    assert.throws(() => f.api.currentNativeSubagentLimits(f.ctx), /maxDepth-invalid/)
    f.entry.options.config.maxDepth = null
    assert.throws(() => f.api.currentNativeSubagentLimits(f.ctx), /maxDepth-invalid/)
    f.entry.options.config.maxDepth = 2.5
    assert.throws(() => f.api.currentNativeSubagentLimits(f.ctx), /maxDepth-invalid/)
    f.entry.options.config.maxDepth = Number.MAX_SAFE_INTEGER + 1
    assert.throws(() => f.api.currentNativeSubagentLimits(f.ctx), /maxDepth-invalid/)
    f.entry.options.config.maxDepth = 1
    f.entry.options.config.maxActiveSubagents = 0
    assert.throws(() => f.api.currentNativeSubagentLimits(f.ctx), /maxActiveSubagents-invalid/)
    f.entry.options.config.maxActiveSubagents = 4
  } finally { await f.close() }
})

test('duplicate or malformed native loader entries fail closed', async t => {
  const f = await fixture()
  try {
    const loader = f.ctx.get('loader')
    loader.entries = () => [f.entry, { options: { id: 'subagent', name: '@deepseek-ai/dsh-subagent', config: {} } }]
    assert.throws(() => f.api.currentNativeSubagentLimits(f.ctx), /native-subagent-entry-ambiguous/)
    loader.entries = () => [{ options: { id: 'subagent', name: '@elsewhere/subagent', config: {} } }]
    assert.throws(() => f.api.currentNativeSubagentLimits(f.ctx), /native-subagent-entry-name-mismatch/)
    loader.entries = () => [null]
    assert.throws(() => f.api.currentNativeSubagentLimits(f.ctx), /native-subagent-inventory-invalid/)
  } finally { await f.close() }
})

test('read uses configuration layers and save atomically updates only native limits', async t => {
  const f = await fixture({ config: { maxDepth: 2, maxActiveSubagents: 4, deliverySelection: false }, inherited: { maxDepth: 1, maxActiveSubagents: 8 } })
  try {
    const before = await f.adapter.read()
    assert.deepEqual(before.values, { maxDepth: 2, maxActiveSubagents: 4 })
    assert.equal(before.writable, true)
    assert.match(before.revision, /^[a-f0-9]{64}$/)
    const after = await f.adapter.save({ revision: before.revision, maxDepth: 5, maxActiveSubagents: 11 })
    assert.deepEqual(after.values, { maxDepth: 5, maxActiveSubagents: 11 })
    assert.notEqual(after.revision, before.revision)
    assert.equal(f.entry.disabled, true)
    assert.equal(f.entry.fiber, undefined)
    assert.deepEqual(f.api.currentNativeSubagentLimits(f.ctx), { maxDepth: 5, maxActiveSubagents: 11 })
    const document = yaml.parseDocument(await readFile(f.patchPath, 'utf8'))
    const rows = document.toJS()
    assert.deepEqual(rows[0].config, { maxDepth: 5, maxActiveSubagents: 11, deliverySelection: false })
    assert.deepEqual(rows[1], { id: 'unrelated', name: 'example/other', config: { keep: true } })
    const text = await readFile(f.patchPath, 'utf8')
    assert.match(text, /# preserved profile header/)
    assert.match(text, /# keep this field comment/)
    assert.equal(f.atomic.lockPaths.length, 1)
    assert.match(f.atomic.lockPaths[0], /package\.json$/)
    assert.equal(f.fixtureState.exclusiveCalls, 1)
    t.diagnostic('Real yaml parser/document; temp Profile patch only; file-lock/atomic and inactive Loader entry are injected adapters, not Host reconciliation.')
  } finally { await f.close() }
})

test('explicit empty profile config replaces lower fields instead of merging them', async () => {
  const f = await fixture({ config: {}, inherited: { maxDepth: 12, maxActiveSubagents: 24, lowerOnly: 'retained-below' }, emptyProfileConfig: true })
  try {
    const initial = await f.adapter.read()
    assert.deepEqual(initial.values, { maxDepth: 1, maxActiveSubagents: 8 })
    const saved = await f.adapter.save({ revision: initial.revision, maxDepth: 3, maxActiveSubagents: 6 })
    assert.deepEqual(saved.values, { maxDepth: 3, maxActiveSubagents: 6 })
    const rows = yaml.parseDocument(await readFile(f.patchPath, 'utf8')).toJS()
    assert.deepEqual(rows[0].config, { maxDepth: 3, maxActiveSubagents: 6 })
  } finally { await f.close() }
})

test('missing profile config seeds effective siblings and serializes !!js expressions', async () => {
  const inherited = { maxDepth: 2, maxActiveSubagents: 4, deliverySelection: false, extension: { __jsExpr: 'process.env.NATIVE_TEST' } }
  for (const profileRowPresent of [true, false]) {
    const f = await fixture({ config: inherited, inherited, profileConfigPresent: false, profileRowPresent })
    try {
      const initial = await f.adapter.read()
      const saved = await f.adapter.save({ revision: initial.revision, maxDepth: 7, maxActiveSubagents: 9 })
      assert.deepEqual(saved.values, { maxDepth: 7, maxActiveSubagents: 9 })
      const text = await readFile(f.patchPath, 'utf8')
      assert.match(text, /deliverySelection: false/)
      assert.match(text, /!!js/)
      const parsed = yaml.parseDocument(text, { customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: value => value }] }).toJS()
      const row = parsed.find(item => item.id === 'subagent')
      assert.deepEqual(row.config, { ...inherited, maxDepth: 7, maxActiveSubagents: 9, extension: 'process.env.NATIVE_TEST' })
    } finally { await f.close() }
  }
})

test('seeding native config never promotes unrelated literal expression-marker maps into executable tags', async () => {
  for (const profileRowPresent of [true, false]) {
    const inherited = { maxDepth: 2, maxActiveSubagents: 4, deliverySelection: false }
    const f = await fixture({ config: inherited, inherited, profileConfigPresent: false, profileRowPresent })
    try {
      const text = await readFile(f.patchPath, 'utf8')
      await writeFile(f.patchPath, text.replace('  config: { keep: true }', "  config:\n    keep: true\n    literal: { __jsExpr: 'must remain ordinary data' }"))
      const view = await f.adapter.read()
      await f.adapter.save({ revision: view.revision, maxDepth: 3, maxActiveSubagents: 5 })
      const saved = await readFile(f.patchPath, 'utf8')
      const document = yaml.parseDocument(saved)
      assert.equal(document.warnings.length, 0)
      assert.deepEqual(document.toJS().find(row => row.id === 'unrelated').config,
        { keep: true, literal: { __jsExpr: 'must remain ordinary data' } })
    } finally { await f.close() }
  }
})

test('zero recursion and safe-integer capacity boundaries are accepted', async () => {
  const f = await fixture()
  try {
    const initial = await f.adapter.read()
    const saved = await f.adapter.save({ revision: initial.revision, maxDepth: 0, maxActiveSubagents: Number.MAX_SAFE_INTEGER })
    assert.deepEqual(saved.values, { maxDepth: 0, maxActiveSubagents: Number.MAX_SAFE_INTEGER })
  } finally { await f.close() }
})

test('stale revisions and invalid inputs do not write the profile', async () => {
  const f = await fixture()
  try {
    const view = await f.adapter.read()
    const original = await readFile(f.patchPath, 'utf8')
    await assert.rejects(f.adapter.save({ revision: 'stale', maxDepth: 3, maxActiveSubagents: 5 }), /native-limits-conflict/)
    for (const [maxDepth, maxActiveSubagents] of [[-0, 5], [null, 5], [1.25, 5], [Number.MAX_SAFE_INTEGER + 1, 5], [2, 0], [2, -0], [2, null]]) {
      await assert.rejects(f.adapter.save({ revision: view.revision, maxDepth, maxActiveSubagents }), /invalid/)
    }
    assert.equal(await readFile(f.patchPath, 'utf8'), original)
    assert.equal(f.atomic.writes.length, 0)
  } finally { await f.close() }
})

test('profile overlay and effective-layer mismatch reject saving', async () => {
  const f = await fixture({ overlays: [{ id: 'subagent', config: { maxDepth: 9 } }] })
  try {
    await assert.rejects(f.adapter.read(), /native-subagent-higher-priority-override/)
    assert.equal(f.atomic.writes.length, 0)
  } finally { await f.close() }
  const g = await fixture({ overlays: [{ id: 'subagent', config: { deliverySelection: true } }] })
  try {
    await assert.rejects(g.adapter.read(), /native-subagent-higher-priority-override/)
  } finally { await g.close() }
  const h = await fixture()
  try {
    h.entry.options.config.deliverySelection = false
    await assert.rejects(h.adapter.read(), /native-subagent-higher-priority-override/)
  } finally { await h.close() }
})

test('loader synchronization failure restores both patch bytes and entry config', async () => {
  const f = await fixture()
  try {
    const view = await f.adapter.read()
    const original = await readFile(f.patchPath, 'utf8')
    const oldConfig = structuredClone(f.entry.options.config)
    f.fixtureState.failNextUpdate = true
    await assert.rejects(f.adapter.save({ revision: view.revision, maxDepth: 6, maxActiveSubagents: 10 }), /native-subagent-unavailable/)
    assert.equal(await readFile(f.patchPath, 'utf8'), original)
    assert.deepEqual(f.entry.options.config, oldConfig)
  } finally { await f.close() }
})

test('read rejects inactive assumptions and never returns fabricated default values', async () => {
  const f = await fixture()
  try {
    f.entry.disabled = false
    await assert.rejects(f.adapter.read(), /native-subagent-entry-not-disabled/)
    f.entry.disabled = true
    f.entry.fiber = { state: 'active' }
    await assert.rejects(f.adapter.read(), /native-subagent-entry-not-disabled/)
  } finally { await f.close() }
})

for (const [name, rewrite] of [
  ['config anchor', text => text.replace('  config:\n', '  config: &shared\n').replace('  config: { keep: true }', '  config: *shared')],
  ['row anchor', text => text.replace('- id: subagent', '- &shared\n  id: subagent').replace('  config: { keep: true }', '  config: *shared')],
  ['depth scalar anchor', text => text.replace('maxDepth: 2', 'maxDepth: &shared 2').replace('keep: true', 'keep: *shared')],
  ['capacity scalar anchor', text => text.replace('maxActiveSubagents: 4', 'maxActiveSubagents: &shared 4').replace('keep: true', 'keep: *shared')],
  ['nested anchor', text => text.replace('deliverySelection: true', 'deliverySelection: &shared true').replace('keep: true', 'keep: *shared')],
  ['config alias', text => '- id: template\n  config: { flag: &shared true }\n' + text.replace('deliverySelection: true', 'deliverySelection: *shared')],
  ['root sequence anchor', text => '&shared\n' + text.replace('  config: { keep: true }', '  config: *shared')],
]) {
  test(`native limits with a ${name} are read-only and never change aliased configuration`, async () => {
    const f = await fixture()
    try {
      const original = rewrite(await readFile(f.patchPath, 'utf8'))
      await writeFile(f.patchPath, original)
      const config = yaml.parse(original).find(row => row.id === 'subagent').config
      f.entry.options.config = config
      f.layer.override = config
      const before = await f.adapter.read()
      assert.deepEqual(before.values, { maxDepth: 2, maxActiveSubagents: 4 })
      assert.equal(before.writable, false)
      assert.equal(before.error, 'native-subagent-profile-shared-config')
      await assert.rejects(f.adapter.save({ revision: before.revision, maxDepth: 5, maxActiveSubagents: 11 }), /native-subagent-profile-shared-config/)
      assert.equal(await readFile(f.patchPath, 'utf8'), original, 'all aliases and source bytes remain unchanged')
      assert.equal(f.atomic.writes.length, 0)
      assert.equal(f.entry.options.config, config)
    } finally { await f.close() }
  })
}

test('unrelated YAML anchors remain supported and untouched by native saves', async () => {
  const f = await fixture()
  try {
    const original = (await readFile(f.patchPath, 'utf8')).replace('keep: true', 'keep: &shared true, copy: *shared')
    await writeFile(f.patchPath, original)
    const before = await f.adapter.read()
    assert.equal(before.writable, true)
    await f.adapter.save({ revision: before.revision, maxDepth: 5, maxActiveSubagents: 11 })
    const saved = await readFile(f.patchPath, 'utf8')
    assert.match(saved, /&shared/)
    assert.match(saved, /\*shared/)
    assert.deepEqual(yaml.parse(saved).find(row => row.id === 'unrelated').config, { keep: true, copy: true })
  } finally { await f.close() }
})
