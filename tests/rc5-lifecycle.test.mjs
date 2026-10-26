import { isolatedCollabService } from './isolated-collab-service.mjs'
import { clientRequire, clientContext } from './browser-fixture.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const clientPath = join(root, 'dist', 'client.js')
const PACKAGE = '@sieuno/dsh-native-collab'
const CORES = [
  { key: 'subagent', nativeId: 'subagent', derivedId: 'dsh-native-collab-subagent', moduleName: '@sieuno/dsh-native-collab/subagent' },
  { key: 'control', nativeId: 'tool-subagent-control', derivedId: 'dsh-native-collab-tool-subagent-control', moduleName: '@sieuno/dsh-native-collab/tool-subagent-control' },
  { key: 'listAgents', nativeId: 'tool-subagent-list-agents', derivedId: 'dsh-native-collab-tool-subagent-list-agents', moduleName: '@sieuno/dsh-native-collab/tool-subagent-control/list-agents' },
  { key: 'agentTeam', nativeId: 'agent-team', derivedId: 'dsh-native-collab-agent-team', moduleName: '@sieuno/dsh-native-collab/agent-team' },
  { key: 'teamTools', nativeId: 'tool-agent-team', derivedId: 'dsh-native-collab-tool-agent-team', moduleName: '@sieuno/dsh-native-collab/tool-agent-team' },
]
const DOC_MARKERS = [
  '先停该 Profile 相关的 Host 与 Agent',
  '备份当前配置，并对照启用前备份',
  '只撤本插件引入的各层启用覆盖',
  '原生服务不再被这些覆盖关闭',
  'dsh plugin --profile <p> remove @sieuno/dsh-native-collab',
  'S0 安装前会话',
]

function expand(node, acc = []) {
  if (node == null || node === false) return acc
  if (typeof node === 'string' || typeof node === 'number') { acc.push(String(node)); return acc }
  if (Array.isArray(node)) { for (const child of node) expand(child, acc); return acc }
  if (typeof node === 'object') {
    if (typeof node.type === 'function') { expand(node.type(node.props), acc); return acc }
    expand(node.children, acc)
  }
  return acc
}

function find(node, predicate, found = []) {
  if (Array.isArray(node)) { for (const child of node) find(child, predicate, found); return found }
  if (node && typeof node === 'object') {
    if (typeof node.type === 'function') { find(node.type(node.props), predicate, found); return found }
    if (predicate(node)) found.push(node)
    find(node.children, predicate, found)
  }
  return found
}

function translator(locale) {
  const table = locale.collabUi
  return (key, options) => Object.prototype.hasOwnProperty.call(table, key) ? table[key] : options?.defaultValue ?? key
}

function bundleSubject() {
  return { kind: 'bundle', pkg: { name: PACKAGE, version: '0.1.0-rc.5', installed: true, availability: 'available', official: false, enabled: true, rows: [] } }
}

function rowSubject(rowId, moduleName, pkgName = PACKAGE) {
  return { kind: 'row', pkg: { name: pkgName, installed: true, enabled: true }, row: { rowId, moduleName, enabled: false } }
}

async function loadPlugin() {
  let loaded
  let effect
  let hookIndex = 0
  const hooks = []
  const React = {
    createElement(type, props, ...children) { return { type, props: props ?? {}, children } },
    useState(initial) {
      const index = hookIndex++
      if (!(index in hooks)) hooks[index] = initial
      return [hooks[index], value => { hooks[index] = value }]
    },
    useEffect(callback) { effect = callback },
  }
  runInNewContext(await readFile(clientPath, 'utf8'), { window: { __ModuleLoader__: { load(spec) { loaded = spec } } } }, { filename: clientPath })
  const plugin = loaded.factory(clientRequire(React))
  const registrations = []
  const providers = []
  await plugin.apply(clientContext({
    remote: { collabUi: { status() { return Promise.resolve({ rows: [] }) }, preview() { return Promise.resolve({ accepted: false }) } } },
    slots: {
      inject(_name, register) { providers.push(register) },
      register(contract, component) { const value = { contract, component }; registrations.push(value); return value },
    },
  }))
  for (const register of providers) register()
  return {
    registrations,
    async renderPage(t) {
      hookIndex = 0
      hooks.length = 0
      const props = {
        t,
        view: 'page',
        readStatus: async () => ({ profileName: 'synthetic', hmrEnabled: false, rows: [], desired: 'unchanged', pendingRestart: 'unknown', operationError: 'transaction-unavailable', error: null }),
        preview: async () => ({ action: 'enable', accepted: false, error: 'transaction-unavailable', reasons: [] }),
      }
      return registrations[2].component({ t, subject: bundleSubject() })
    },
  }
}

test('client renderer shows zh and en lifecycle warnings for bundle and five cores only', async () => {
  const source = await readFile(clientPath, 'utf8')
  assert.equal(source.includes('plugins.detail.actions'), false)
  assert.equal(source.includes("register('plugins.row.config'"), true)
  assert.equal(source.includes('plugins.bundle.activation'), true)
  assert.equal(source.includes('ctx.dispose'), false)
  const en = JSON.parse(await readFile(join(root, 'locale', 'en.json'), 'utf8'))
  const zh = JSON.parse(await readFile(join(root, 'locale', 'zh.json'), 'utf8'))
  const plugin = await loadPlugin()
  assert.deepEqual(plugin.registrations.map(entry => entry.contract.name), [
    'plugins.bundle.config', 'plugins.detail.badge', 'plugins.detail.section',
    'plugins.row.config', 'plugins.bundle.activation',
  ])
  assert.equal(plugin.registrations[3].contract.key, '@sieuno/dsh-native-collab#dsh-native-collab-ui')
  assert.equal(plugin.registrations[4].contract.key, '@sieuno/dsh-native-collab')
  assert.equal(plugin.registrations.filter(entry => entry.contract.name === 'plugins.row.config').length, 1)
  const badge = plugin.registrations[1].component
  const section = plugin.registrations[2].component
  for (const locale of [en, zh]) {
    const t = translator(locale)
    const summary = plugin.registrations[0].component({ t, view: 'summary' })
    assert.equal(typeof summary, 'string')
    assert.match(summary, /settings|设置/)
    const page = await plugin.renderPage(t)
    const warnings = find(page, node => node.props?.['data-testid'] === 'lifecycle-warning')
    assert.equal(warnings.length, 1)
    assert.equal(warnings[0].props['data-lifecycle-scope'], 'bundle')
    const pageText = expand(page).join('\n')
    for (const core of CORES) assert.ok(pageText.includes(core.derivedId), core.derivedId)
    assert.match(pageText, /not loaded together|不会与原生同时加载/)
    assert.match(pageText, /configuration unavailability|配置不可用/)
    assert.match(pageText, /not log or data corruption|不是日志或数据损坏/)
    assert.match(pageText, /--patch/)
    assert.match(pageText, /master switch|总开关/)
    assert.match(pageText, /S0/)
    assert.match(pageText, /S1/)
    assert.match(pageText, /\bused\b/)
    assert.match(pageText, /Remove still does not close this switch|Remove 仍不会自动关闭总开关/)
    assert.match(pageText, /dispose is not an uninstall hook|dispose 不是卸载钩子/)
    const bundleElement = section({ t, subject: bundleSubject() })
    const bundleDetail = bundleElement.type(bundleElement.props)
    const bundleText = expand(bundleDetail).join('\n')
    assert.equal(bundleDetail.props['data-lifecycle-scope'], 'bundle')
    for (const core of CORES) assert.ok(bundleText.includes(core.derivedId), core.derivedId)
    assert.equal(find(bundleDetail, node => node.props?.role === 'alert').length, 1)
    const bundleBadge = badge({ t, subject: bundleSubject() })
    assert.equal(find(bundleBadge, node => node.props?.['data-testid'] === 'lifecycle-badge').length, 1)
    for (const core of CORES) {
      for (const subject of [
        rowSubject(core.derivedId, core.moduleName),
        rowSubject(core.nativeId, `@native/${core.nativeId}`, '@deepseek-ai/dsh-base'),
        rowSubject('alias-not-a-core-id', core.moduleName),
      ]) {
        const detailElement = section({ t, subject })
        const detail = detailElement.type(detailElement.props)
        const text = expand(detail).join('\n')
        assert.equal(detail.props['data-lifecycle-scope'], core.key)
        assert.ok(text.includes(core.derivedId), core.derivedId)
        for (const other of CORES) if (other.key !== core.key) assert.equal(text.includes(other.derivedId), false, other.derivedId)
        assert.equal(badge({ t, subject }).props['data-lifecycle-scope'], core.key)
      }
    }
    for (const subject of [
      null,
      { kind: 'item', id: 'unrelated' },
      { kind: 'bundle', pkg: { name: '@other/pkg' } },
      rowSubject('dsh-native-collab-tool-subagent', '@sieuno/dsh-native-collab/tool-subagent'),
      rowSubject('dsh-native-collab-tool-subagent-fork', '@sieuno/dsh-native-collab/tool-subagent/fork'),
      rowSubject('tool-subagent', '@deepseek-ai/dsh-tool-subagent', '@deepseek-ai/dsh-tool-subagent'),
      rowSubject('tool-subagent-fork', '@deepseek-ai/dsh-tool-subagent-fork', '@deepseek-ai/dsh-tool-subagent'),
      rowSubject('workflow', '@other/workflow', '@other/workflow'),
    ]) {
      assert.equal(section({ t, subject }), null)
      assert.equal(badge({ t, subject }), null)
    }
  }
})


test('status and preview fixtures stay read-only and do not delete the sidecar', async () => {
  const entry = process.env.DSH_TYPESCRIPT_ENTRY
  assert.ok(entry, 'DSH_TYPESCRIPT_ENTRY must point at an existing TypeScript module; this copy does not install peers')
  const ts = createRequire(import.meta.url)(entry)
  const sourcePath = join(root, 'packages', 'agent-team', 'src', 'collab-ui.ts')
  const source = await readFile(sourcePath, 'utf8')
  assert.equal(source.includes('unlink'), false)
  assert.equal(source.includes('rmSync'), false)
  assert.equal(source.includes('writeFile'), false)
  assert.equal(source.includes('dispose('), false)
  const stripped = isolatedCollabService(source)
    .replace("import { Context } from '@deepseek-ai/cordis'\n", '')
  const compiled = ts.transpileModule(stripped, {
    fileName: sourcePath,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: false },
  })
  const { CollabUiService } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`)
  const dir = await mkdtemp(join(tmpdir(), 'dsh-rc5-lifecycle-'))
  try {
    const patch = join(dir, 'cordis.patch.yml')
    const sidecar = join(dir, 'native_collab_team_budget.json')
    const original = 'synthetic profile; config: { token: SNAPSHOT-SHOULD-NOT-LEAK }\n'
    const sidecarOriginal = '{"used":3}\n'
    await writeFile(patch, original)
    await writeFile(sidecar, sidecarOriginal)
    const beforeFiles = (await readdir(dir)).sort()
    const called = []
    const manager = {
      async listPlugins() {
        called.push('listPlugins')
        return [
          { moduleName: '@sieuno/dsh-native-collab/subagent', enabled: false },
          { moduleName: '@sieuno/dsh-native-collab/tool-subagent-control', enabled: true },
          { moduleName: '@sieuno/dsh-native-collab/tool-subagent-control/list-agents', enabled: false },
          { moduleName: '@sieuno/dsh-native-collab/agent-team', enabled: false },
          { moduleName: '@sieuno/dsh-native-collab/tool-agent-team', enabled: true },
          { moduleName: '@sieuno/dsh-native-collab/tool-subagent', enabled: false },
          { moduleName: '@sieuno/dsh-native-collab/tool-subagent/fork', enabled: false },
        ]
      },
      setPluginEnabled() { called.push('setPluginEnabled'); throw new Error('setter') },
      enable() { called.push('enable'); throw new Error('setter') },
      disable() { called.push('disable'); throw new Error('setter') },
      remove() { called.push('remove'); throw new Error('setter') },
      uninstall() { called.push('uninstall'); throw new Error('setter') },
      write() { called.push('write'); throw new Error('setter') },
    }
    const gets = []
    const ctx = { get(name) {
      gets.push(name)
      if (name === 'profileContext') return { name: 'synthetic-profile', dir, patchPath: patch, deleteSidecar() { throw new Error('sidecar delete') } }
      if (name === 'pluginManager') return manager
      if (name === 'hmr') return undefined
      if (name === 'fs') throw new Error('fs requested')
      return undefined
    } }
    const service = Object.assign(Object.create(CollabUiService.prototype), { ctx })
    const status = await service.status()
    const enable = await service.preview('enable')
    const restore = await service.preview('restore')
    const bogus = await service.preview('bogus')
    assert.equal(enable.accepted, false)
    assert.equal(restore.accepted, false)
    assert.equal(bogus.accepted, false)
    assert.equal(bogus.action, 'bogus')
    assert.equal(status.writeSupport, 'unsupported')
    assert.equal(typeof CollabUiService.prototype.enable, 'undefined')
    assert.equal(typeof CollabUiService.prototype.restore, 'undefined')
    assert.equal(typeof CollabUiService.prototype.dispose, 'undefined')
    assert.deepEqual(called, ['listPlugins', 'listPlugins', 'listPlugins', 'listPlugins'])
    assert.deepEqual([...new Set(gets)].sort(), ['hmr', 'pluginManager', 'profileContext'])
    assert.equal(await readFile(patch, 'utf8'), original)
    assert.equal(await readFile(sidecar, 'utf8'), sidecarOriginal)
    assert.deepEqual((await readdir(dir)).sort(), beforeFiles)
    const payload = JSON.stringify({ status, enable, restore, bogus })
    assert.equal(payload.includes('SNAPSHOT-SHOULD-NOT-LEAK'), false)
    assert.equal(payload.includes(dir), false)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
