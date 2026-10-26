import { isolatedCollabService } from './isolated-collab-service.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const ts = require(process.env.DSH_TYPESCRIPT_ENTRY || 'typescript')
const sourcePath = join(import.meta.dirname, '..', 'packages', 'agent-team', 'src', 'collab-ui.ts')
const source = isolatedCollabService(await readFile(sourcePath, 'utf8'))
  .replace("import { Context } from '@deepseek-ai/cordis'\n", '')
const compiled = ts.transpileModule(source, {
  fileName: sourcePath,
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: false },
})
const { CollabUiService } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`)

const ids = [
  'dsh-native-collab-subagent',
  'dsh-native-collab-tool-subagent-control',
  'dsh-native-collab-tool-subagent-list-agents',
  'dsh-native-collab-agent-team',
  'dsh-native-collab-tool-agent-team',
  'dsh-native-collab-tool-subagent',
  'dsh-native-collab-tool-subagent-fork',
]
const moduleNames = [
  '@sieuno/dsh-native-collab/subagent',
  '@sieuno/dsh-native-collab/tool-subagent-control',
  '@sieuno/dsh-native-collab/tool-subagent-control/list-agents',
  '@sieuno/dsh-native-collab/agent-team',
  '@sieuno/dsh-native-collab/tool-agent-team',
  '@sieuno/dsh-native-collab/tool-subagent',
  '@sieuno/dsh-native-collab/tool-subagent/fork',
]
function service(ctx) { return Object.assign(Object.create(CollabUiService.prototype), { ctx }) }

test('RC9 public RemoteError rejects invalid action and malformed tokens before profile access', async () => {
  const instance=service({ get(){ throw Error('Invalid input must not touch the profile') } })
  for(const value of ['invalid',null,{},42]) await assert.rejects(instance.bootPlan(value), error => error.isDSHRemoteError===true && error.code==='collab-ui/input-invalid' && error.details.endpoint==='collabUi/bootPlan' && error.details.field==='action')
  for(const value of ['bad-token','------------------------------------','a'.repeat(36),null,{}]) await assert.rejects(instance.bootApply(value), error => error.isDSHRemoteError===true && error.code==='collab-ui/input-invalid' && error.details.endpoint==='collabUi/bootApply' && error.details.field==='planId')
})

test('Host status reads synthetic current profile inventory and writes nothing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-collab-status-'))
  try {
    const patch = join(dir, 'cordis.patch.yml')
    await writeFile(patch, 'synthetic profile; config: { token: SNAPSHOT-SHOULD-NOT-LEAK }\n')
    const before = await readFile(patch)
    const beforeFiles = (await readdir(dir)).sort()
    const profileContext = { name: 'synthetic-profile', dir, patchPath: patch }
    const inventory = moduleNames.map((moduleName, index) => ({
      moduleName,
      enabled: index % 2 === 0,
      fiberPhase: index === 0 ? 'active' : null,
    }))
    const ctx = { get(name) {
      if (name === 'profileContext') return profileContext
      if (name === 'pluginManager') return { async listPlugins() { return inventory } }
      if (name === 'hmr') return undefined
      return undefined
    } }

    const result = await service(ctx).status()
    assert.equal(result.profileName, 'synthetic-profile')
    assert.equal(result.hmrEnabled, false)
    assert.equal(result.writeSupport, 'unsupported')
    assert.equal(result.desired, 'unchanged')
    assert.equal(result.pendingRestart, 'unknown')
    assert.equal(result.operationError, 'transaction-unavailable')
    assert.equal(result.error, null)
    assert.deepEqual(result.rows.map(row => row.id), ids)
    assert.deepEqual(result.rows.map(row => row.current), ['enabled', 'disabled', 'enabled', 'disabled', 'enabled', 'disabled', 'enabled'])
    assert.ok(result.rows.every(row => row.sourceLayer === 'unknown'))
    assert.equal(result.rows[0].runtimePhase, 'active')
    const enablePreview = await service(ctx).preview('enable')
    const restorePreview = await service(ctx).preview('restore')
    assert.equal(enablePreview.accepted, false)
    assert.equal(restorePreview.accepted, false)
    assert.deepEqual(enablePreview.desired.map(row => row.state), ['enabled', 'enabled', 'enabled', 'enabled', 'enabled', 'unknown', 'unknown'])
    const bogus = await service(ctx).preview('bogus')
    assert.equal(bogus.action, 'bogus')
    assert.equal(bogus.accepted, false)
    assert.ok(bogus.reasons.includes('invalid-action'))
    assert.ok(bogus.desired.every(row => row.state === 'unknown'))
    assert.deepEqual(restorePreview.desired.map(row => row.state), ['unknown', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown'])
    assert.ok(enablePreview.reasons.includes('transaction-unavailable'))
    assert.ok(enablePreview.reasons.includes('higher-priority-overrides-unverified'))
    const payload = JSON.stringify({ result, enablePreview, restorePreview })
    assert.equal(payload.includes('SNAPSHOT-SHOULD-NOT-LEAK'), false)
    assert.equal(payload.includes(patch), false)
    assert.equal(payload.includes(dir), false)
    assert.equal(await readFile(patch, 'utf8'), before.toString('utf8'))
    assert.deepEqual((await readdir(dir)).sort(), beforeFiles)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('Host status and preview fail closed on malformed inventory without exposing writers', async () => {
  const ctx = { get(name) {
    if (name === 'profileContext') return { name: 'synthetic-profile' }
    if (name === 'pluginManager') return { async listPlugins() { return [{ moduleName: moduleNames[0], enabled: 'yes' }] } }
    return undefined
  } }
  const result = await service(ctx).status()
  const preview = await service(ctx).preview('enable')
  assert.equal(result.error, 'inventory-unavailable')
  assert.ok(result.rows.every(row => row.current === 'unknown'))
  assert.equal(preview.accepted, false)
  assert.ok(preview.reasons.includes('inventory-unavailable'))
  assert.equal(typeof CollabUiService.prototype.enable, 'undefined')
  assert.equal(typeof CollabUiService.prototype.restore, 'undefined')
})

test('HMR and high-layer configuration remain write-free preview refusals', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-collab-conflict-'))
  try {
    const patch = join(dir, 'cordis.patch.yml')
    const homePatch = join(dir, 'home.patch.yml')
    const original = Buffer.from('- id: dsh-native-collab-agent-team\n  config: !!js/function "() => process.env.SECRET"\n')
    const homeOriginal = Buffer.from('- id: dsh-native-collab-agent-team\n  disabled: true\n')
    await writeFile(patch, original)
    await writeFile(homePatch, homeOriginal)
    const manager = {
      async listPlugins() { return moduleNames.map((moduleName, index) => ({ moduleName, enabled: index !== 3 })) },
      async setPluginEnabled() { throw new Error('mutator must not be called') },
    }
    const ctx = { get(name) {
      if (name === 'profileContext') return { name: 'synthetic-profile', dir, patchPath: patch, home, overlays: [{ id: 'dsh-native-collab-agent-team', disabled: false }] }
      if (name === 'pluginManager') return manager
      if (name === 'hmr') return {}
      return undefined
    } }
    const beforeFiles = (await readdir(dir)).sort()
    const status = await service(ctx).status()
    const preview = await service(ctx).preview('enable')
    assert.equal(status.hmrEnabled, true)
    assert.equal(preview.accepted, false)
    assert.ok(preview.reasons.includes('hmr-active'))
    assert.ok(preview.reasons.includes('higher-priority-overrides-unverified'))
    assert.ok(preview.reasons.includes('dynamic-config-unverified'))
    assert.deepEqual(await readFile(patch), original)
    assert.deepEqual(await readFile(homePatch), homeOriginal)
    assert.deepEqual((await readdir(dir)).sort(), beforeFiles)
    assert.equal(JSON.stringify(preview).includes('SECRET'), false)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('a concurrent Profile edit after preview cannot be overwritten by restore', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-collab-cas-noop-'))
  try {
    const patch = join(dir, 'cordis.patch.yml')
    await writeFile(patch, '- id: synthetic\n  disabled: true\n')
    const profileContext = { name: 'synthetic-profile', dir, patchPath: patch }
    const ctx = { get(name) {
      if (name === 'profileContext') return profileContext
      if (name === 'pluginManager') return { async listPlugins() { return moduleNames.map(moduleName => ({ moduleName, enabled: false })) } }
      return undefined
    } }
    const before = await service(ctx).preview('enable')
    assert.equal(before.accepted, false)
    const concurrent = Buffer.from('# concurrent human edit\n- id: synthetic\n  disabled: false\n')
    await writeFile(patch, concurrent)
    const after = await service(ctx).preview('restore')
    assert.equal(after.accepted, false)
    assert.deepEqual(await readFile(patch), concurrent)
    assert.equal((await readdir(dir)).length, 1, 'preview creates no snapshot, journal, or lock file')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('inventory read failure remains structured and attempts no Profile mutation', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-collab-failure-noop-'))
  try {
    const patch = join(dir, 'cordis.patch.yml')
    const original = Buffer.from('# original private contents\n')
    await writeFile(patch, original)
    const ctx = { get(name) {
      if (name === 'profileContext') return { name: 'synthetic-profile', dir, patchPath: patch }
      if (name === 'pluginManager') return { async listPlugins() { throw new Error('synthetic read failure') } }
      return undefined
    } }
    const preview = await service(ctx).preview('restore')
    assert.equal(preview.accepted, false)
    assert.ok(preview.reasons.includes('inventory-unavailable'))
    assert.deepEqual(await readFile(patch), original)
    assert.deepEqual((await readdir(dir)).sort(), ['cordis.patch.yml'])
    assert.equal(JSON.stringify(preview).includes('original private contents'), false)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
