import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, realpathSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import * as paths from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'

// Source-contract/real filesystem regression, NOT a running Host, GUI, RPC or Loader assembly.
// Uses unmodified official patch algorithm, Profile composition and atomic writer.
// Loader classes, compatibility admission and Context services are explicit test adapters.
const root = resolve(import.meta.dirname, '..')
const official = process.env.DSH_SOURCE_ROOT || resolve(root, '../../plugins/deepseek-harness-dsh-v0.2.1-rc.2')
const require = createRequire(import.meta.url)
const ts = require(process.env.DSH_TYPESCRIPT_ENTRY || 'typescript')
const store = resolve(realpathSync(join(root, 'node_modules')), '.pnpm')
function installed(name) {
  try { return require(name) } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error
    const versions = readdirSync(store).filter(item => item.startsWith(`${name}@`))
    assert.equal(versions.length, 1, `Need one installed ${name}`)
    return require(join(store, versions[0], 'node_modules', name))
  }
}
const yaml = installed('yaml'), jsYaml = installed('js-yaml')
const hashes = new Map()
function compile(source, file, overrides = {}) {
  const module = { exports: {} }
  const output = ts.transpileModule(source, { fileName: file, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText
  new Function('require', 'module', 'exports', output)(name => Object.hasOwn(overrides, name) ? overrides[name] : require(name), module, module.exports)
  return module.exports
}
function load(file, overrides = {}) {
  const source = readFileSync(file, 'utf8')
  hashes.set(file, createHash('sha256').update(source).digest('hex'))
  return compile(source, file, overrides)
}
const cordis = require('@deepseek-ai/cordis')
const include = load(join(official, 'vendor/include/src/index.ts'), {
  '@deepseek-ai/cordis': cordis, 'js-yaml': jsYaml,
  '@deepseek-ai/cordis-plugin-loader': { EntryGroup: class {}, EntryTree: class {}, isJsExpr: value => value !== null && typeof value === 'object' && typeof value.__jsExpr === 'string' },
})
const indexFile = join(official, 'packages/boot/app-boot/src/index.ts')
const indexText = readFileSync(indexFile, 'utf8')
hashes.set(indexFile, createHash('sha256').update(indexText).digest('hex'))
const syntax = ts.createSourceFile(indexFile, indexText, ts.ScriptTarget.Latest, true)
const names = new Set(['loadOptionalPatches', 'loadOverlayPatches', 'anchorInsertedPluginNames', 'parsePatchList'])
const selected = syntax.statements.filter(node => ts.isFunctionDeclaration(node) && names.has(node.name?.text))
assert.equal(selected.length, names.size)
const patches = compile(`const {readFileSync}=require('node:fs'); const {dirname,resolve,isAbsolute}=require('node:path'); const {pathToFileURL}=require('node:url'); const yaml=require('js-yaml'); const userPatchesSchema=require('include').entryListSchema;\n${selected.map(node => node.getText(syntax)).join('\n')}`, indexFile, { 'js-yaml': jsYaml, include })
const compatibility = { evaluatePluginCompatibility() { return undefined }, pluginCompatibilityWarning() { return 'unsupported' } }
const profile = load(join(official, 'packages/boot/app-boot/src/profile.ts'), {
  '@deepseek-ai/cordis-plugin-include': include,
  '@deepseek-ai/dsh-home-paths': { resolveDshHome() { throw new Error('No real home access in this test') } },
  './plugin-compatibility.ts': compatibility,
  './profile-compatibility.ts': { readProfileVersionExemptions() { return {} } },
  './index.ts': patches,
  './profile-resolution/legacy-links.ts': { realModuleDirectory: realpathSync },
})
const profileContext = load(join(official, 'packages/boot/app-boot/src/profile-context.ts'), { './profile.ts': profile, './index.ts': patches })
const atomic = load(join(official, 'packages/util/atomic-write/src/index.ts'))
const bootFile = join(root, 'packages/agent-team/src/boot-switch.ts')
function managerClass(atomicOverride = atomic) {
  return load(bootFile, { yaml, '@deepseek-ai/dsh-app-boot': { ...profile, ...profileContext, ...patches, ...compatibility, readProfileVersionExemptions() { return {} } }, '@deepseek-ai/dsh-atomic-write': atomicOverride }).BootSwitchManager
}
const BootSwitchManager = managerClass()
const PACKAGE = '@dsh-native-collab/derived'
const evidence = resolve(root, '../../reviews/rc9-fixes/lead/fixtures')
const contract = JSON.parse(readFileSync(join(root, 'tests/fixtures/rc8-real-native-contract.json'), 'utf8'))
const inserted = yaml.parse(readFileSync(join(root, 'cordis.patch.yml'), 'utf8'))[0].insert
const placeholderIds = new Set(['dsh-native-collab-tool-subagent', 'dsh-native-collab-tool-subagent-fork'])
async function fixture({ content = '# user comment must survive\n[]\n', overlays = [], hmr = false, Class = BootSwitchManager, omitRootId = null } = {}) {
  await mkdir(evidence, { recursive: true })
  const home = await mkdtemp(join(evidence, 'boot-'))
  const dir = join(home, 'profiles', 'test')
  await mkdir(dir, { recursive: true })
  const roots = structuredClone(contract.nativeRoots).filter(row => row.id !== omitRootId)
  const presets = structuredClone(contract.presets).map(preset => {
    if (preset.id !== 'preset-standard') return preset
    const plugins = preset.config.plugins.map(plugin => ({ ...plugin, config: { ...plugin.config, user: 'retain' } }))
    return { ...preset, config: { custom: 'retain', plugins: [
      { id: 'delegation', group: true, config: plugins },
      { id: 'other-tool', name: 'other-tool', config: { keep: 7 } },
    ] } }
  })
  const baseRows = [...roots, ...presets,
    { id: 'unrelated', name: 'unrelated', config: { keep: { __jsExpr: 'process.env.NEVER_EVALUATE' } } }]
  for (const [name, body] of [['@fixture/base', yaml.stringify([{ insert: baseRows }])], [PACKAGE, await readFile(join(root, 'cordis.patch.yml'), 'utf8')]]) {
    const packageDir = join(dir, 'node_modules', name)
    await mkdir(packageDir, { recursive: true })
    await writeFile(join(packageDir, 'package.json'), JSON.stringify({ name, version: '0.1.0', main: './index.js', dsh: { bundle: { patch: './cordis.patch.yml' } } }))
    await writeFile(join(packageDir, 'index.js'), '// not executed')
    await writeFile(join(packageDir, 'cordis.patch.yml'), body)
  }
  const manifestPath = join(dir, 'package.json')
  await writeFile(manifestPath, JSON.stringify({ dsh: { profile: { bundles: ['@fixture/base', PACKAGE] } } }))
  const patchPath = join(dir, 'cordis.patch.yml')
  await writeFile(patchPath, content)
  const context = { name: 'test', dir, patchPath, home, installAnchor: manifestPath, overlays, telemetryDisabledEnv: undefined }
  const disposers = []
  const ctx = { get(name) { if (name === 'profileContext') return context; if (name === 'hmr' && hmr) return {}; return undefined }, on(event, callback) { assert.equal(event, 'dispose'); disposers.push(callback) } }
  const component = new Class(ctx)
  const text = () => readFile(patchPath, 'utf8')
  const compose = () => profile.composeEntries([profileContext.readProfilePatches('dsh', context)])
  return { context, component, text, compose, manifestPath, dispose() { disposers.forEach(callback => callback()) } }
}
function all(rows) { return rows.flatMap(row => [row, ...(row.group && Array.isArray(row.config) ? all(row.config) : [])]) }

test('own master switch: concrete seven-root and preset preview is read-only; confirmed enable/off are fixed targets; remove bundle after off composes', async () => {
  const f = await fixture()
  const before = await f.text(), manifestBefore = await readFile(f.manifestPath, 'utf8')
  const initial = await f.component.status()
  assert.equal(initial.configured, 'disabled')
  assert.equal(initial.writeSupport, 'available')
  assert.equal(initial.error, null)
  const preview = await f.component.plan('enable')
  assert.equal(preview.error, null)
  assert.equal(preview.targets.filter(target => target.scope === 'root' && target.id.startsWith('dsh-native-collab-')).length, 7)
  assert.equal(preview.targets.filter(target => target.scope.startsWith('preset:')).length, 6)
  assert.equal(preview.targets.filter(target => target.scope === 'preset:preset-minimal').length, 0)
  assert.ok(preview.targets.every(target => typeof target.moduleName === 'string' && target.moduleName.length > 0))
  assert.equal(await f.text(), before)
  assert.equal(await readFile(f.manifestPath, 'utf8'), manifestBefore)
  assert.deepEqual(await f.component.apply(preview.planId), { action: 'enable', accepted: true, pendingRestart: 'required', error: null, configured: 'enabled' })
  const enabled = f.compose()
  for (const root of contract.nativeRoots) assert.equal(enabled.find(row => row.id === root.id).disabled, true)
  for (const row of inserted) {
    const disabled = enabled.find(item => item.id === row.id).disabled
    assert.equal(disabled, row.id === 'dsh-native-collab-ui' || placeholderIds.has(row.id) ? row.disabled : false)
  }
  const preset = enabled.find(row => row.id === 'preset-standard')
  const spawn = all(preset.config.plugins).find(row => row.id === 'tool-subagent')
  assert.equal(spawn.name, inserted.find(row => row.id === 'dsh-native-collab-tool-subagent').name)
  assert.equal(spawn.config.provider, 'spawn')
  assert.equal(spawn.config.toolName, 'subagent')
  assert.equal(spawn.config.modelSelectionSettings, true)
  assert.equal(spawn.config.user, 'retain')
  assert.equal(all(preset.config.plugins).find(row => row.id === 'other-tool').config.keep, 7)
  assert.equal(preset.config.custom, 'retain')
  assert.deepEqual(enabled.find(row => row.id === 'preset-minimal').config.plugins, [])
  assert.equal((await f.component.apply(preview.planId)).error, 'plan-expired-or-used')
  const off = await f.component.plan('restore')
  assert.equal(off.error, null)
  assert.ok(off.warnings.includes('native-features-will-be-enabled'))
  assert.equal((await f.component.apply(off.planId)).accepted, true)
  const restored = f.compose()
  for (const root of contract.nativeRoots) {
    const row = restored.find(item => item.id === root.id)
    assert.equal(row.name, root.name)
    assert.notEqual(row.disabled, true, `fixed native state must enable ${root.id}`)
    if (root.config) assert.deepEqual(row.config, root.config)
  }
  for (const row of inserted) {
    if (row.id === 'dsh-native-collab-ui') continue
    assert.equal(restored.find(item => item.id === row.id).disabled, true)
  }
  const offText = await f.text()
  assert.match(offText, /user comment must survive/)
  assert.ok(!offText.includes(PACKAGE))
  assert.ok(!yaml.parse(offText).some(row => row.id?.startsWith('dsh-native-collab-')))
  assert.deepEqual(restored.find(row => row.id === 'unrelated').config, { keep: { __jsExpr: 'process.env.NEVER_EVALUATE' } })
  assert.equal((await f.component.status()).pendingRestart, 'required')
  // Model next-start composition after removal, NOT an actual plugin uninstall or running Host.
  await writeFile(f.manifestPath, JSON.stringify({ dsh: { profile: { bundles: ['@fixture/base'] } } }))
  const afterRemoval = f.compose()
  assert.equal(afterRemoval.filter(row => row.id?.startsWith('dsh-native-collab-')).length, 0)
  assert.ok(!JSON.stringify(afterRemoval).includes(PACKAGE))
})

test('own master switch: stale previews, unknown tokens, disposal and HMR fail closed without writes', async () => {
  const f = await fixture()
  const plan = await f.component.plan('enable')
  await writeFile(f.context.patchPath, '# concurrent user edit\n[]\n')
  const changed = await f.text()
  assert.equal((await f.component.apply(plan.planId)).error, 'configuration-changed-review-again')
  assert.equal(await f.text(), changed)
  assert.equal((await f.component.apply('client-invented-token')).accepted, false)
  f.dispose()
  assert.equal((await f.component.plan('enable')).error, 'component-disposed')
  const blocked = await fixture({ hmr: true })
  const original = await blocked.text()
  assert.equal((await blocked.component.plan('enable')).error, 'hmr-active')
  assert.equal((await blocked.component.status()).writeSupport, 'blocked')
  assert.equal(await blocked.text(), original)
})

test('own master switch: home and --patch conflicts are not overwritten or misreported as successful', async () => {
  const commandLine = await fixture({ overlays: [{ id: 'subagent', disabled: false }] })
  assert.equal((await commandLine.component.plan('enable')).error, 'higher-priority-override')
  const home = await fixture()
  await writeFile(join(home.context.home, 'cordis.patch.yml'), yaml.stringify([{ id: 'agent-team', disabled: true }]))
  assert.equal((await home.component.plan('restore')).error, 'higher-priority-override')
  const external = await fixture({ overlays: [{ id: 'dsh-native-collab-agent-team', name: `${PACKAGE}/agent-team`, disabled: true }] })
  assert.equal((await external.component.plan('restore')).error, 'external-derived-reference')
})

test('own master switch: dynamic target, ambiguous preset and atomic writer failure preserve the original bytes', async () => {
  const dynamic = await fixture({ content: '- id: subagent\n  disabled: !!js "process.env.FEATURE_OFF"\n' })
  const dynamicBefore = await dynamic.text()
  assert.equal((await dynamic.component.plan('enable')).error, 'dynamic-target')
  assert.equal(await dynamic.text(), dynamicBefore)
  const Failure = managerClass({ ...atomic, async writeFileAtomic() { throw new Error('injected writer failure') } })
  const failure = await fixture({ Class: Failure })
  const before = await failure.text()
  const plan = await failure.component.plan('enable')
  assert.equal(plan.error, null)
  assert.equal((await failure.component.apply(plan.planId)).accepted, false)
  assert.equal(await failure.text(), before)
  const ambiguous = await fixture({ content: '- id: preset-standard\n  config:\n    plugins:\n      - {id: a, name: "@deepseek-ai/dsh-tool-subagent"}\n      - {id: b, name: "@deepseek-ai/dsh-tool-subagent"}\n      - {id: c, name: "@deepseek-ai/dsh-tool-subagent/fork"}\n' })
  assert.equal((await ambiguous.component.plan('enable')).error, 'ambiguous-preset-target')
})

test('official source-contract provenance', t => { for (const [file, hash] of hashes) t.diagnostic(`${paths.relative(official, file)} sha256:${hash}`) })

export { fixture, contract, inserted, all, PACKAGE, BootSwitchManager, managerClass, placeholderIds, evidence }
