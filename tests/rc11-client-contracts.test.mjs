import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { actualLocale } from './official-locale-fixture.mjs'
import { clientContext, clientRequire } from './browser-fixture.mjs'
import { elementRenderer } from './element-renderer.mjs'

const root = new URL('..', import.meta.url)
const ids = [
  'dsh-native-collab-subagent',
  'dsh-native-collab-tool-subagent-control',
  'dsh-native-collab-tool-subagent-list-agents',
  'dsh-native-collab-agent-team',
  'dsh-native-collab-tool-agent-team',
  'dsh-native-collab-tool-subagent',
  'dsh-native-collab-tool-subagent-fork',
]
const placeholders = new Set(['dsh-native-collab-tool-subagent', 'dsh-native-collab-tool-subagent-fork'])
const obsoleteLocaleKeys = ['previewOnly', 'previewEnable', 'previewRestore', 'previewAccepted', 'previewRejected', 'previewUnknown']

function visit(node, predicate, found = []) {
  if (Array.isArray(node)) { node.forEach(child => visit(child, predicate, found)); return found }
  if (!node || typeof node !== 'object') return found
  if (predicate(node)) found.push(node)
  visit(node.children, predicate, found)
  visit(node.props?.children, predicate, found)
  visit(node.props?.footer, predicate, found)
  return found
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join('')
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  return node && typeof node === 'object' ? text(node.children) + text(node.props?.children) + text(node.props?.footer) : ''
}
function count(value, part) { return value.split(part).length - 1 }
const tick = () => new Promise(resolve => setImmediate(resolve))

async function runClient(language, { emitted = false, sameModule = false } = {}) {
  const renderer = elementRenderer()
  const locale = actualLocale(language)
  const sourcePath = new URL(emitted ? '../dist/client.js' : '../packages/agent-team/client.js', import.meta.url)
  let source = await readFile(sourcePath, 'utf8')
  if (!emitted) {
    const dictionaries = Object.fromEntries(await Promise.all(['en', 'zh'].map(async code => [
      code, JSON.parse(await readFile(new URL(`../locale/${code}.json`, import.meta.url), 'utf8')).collabUi,
    ])))
    assert.ok(source.includes('const UI_LOCALES = null'))
    source = source.replace('const UI_LOCALES = null', `const UI_LOCALES = ${JSON.stringify(dictionaries)}`)
  }
  let spec
  runInNewContext(source, {
    setTimeout, clearTimeout, document: { activeElement: null },
    window: { __ModuleLoader__: { load(value) { spec = value } } },
  })
  const rows = ids.map((id, index) => ({
    id, moduleName: `@dsh-native-collab/derived/${index}`, current: 'disabled',
    sourceLayer: 'unknown', runtimePhase: placeholders.has(id) ? null : 'active',
  }))
  const remote = { collabUi: {
    async status() { return { profileName: 'test', hmrEnabled: null, rows, desired: 'unchanged', pendingRestart: 'unknown', writeSupport: 'unsupported', operationError: 'transaction-unavailable', error: null, assembly: null } },
    async bootStatus() { return { profileName: 'test', configured: 'disabled', writeSupport: 'available', pendingRestart: 'unknown', error: null } },
    async bootPlan(action) { return { action, accepted: false, planId: '12345678-1234-1234-1234-123456789abc', targets: sameModule ? [{ scope: 'root', id: 'same', moduleName: '@same/module', previousModule: '@same/module', operation: 'replace' }] : [], pendingRestart: 'required', error: null, warnings: [] } },
    async bootApply() { return { action: 'enable', accepted: true, pendingRestart: 'required', error: null, configured: 'enabled' } },
  } }
  const registrations = []
  const dispose = await spec.factory(clientRequire(renderer.React)).apply(clientContext({
    remote, locale,
    slots: { inject(_name, register) { register(); return () => {} }, register(contract, Component) { registrations.push({ contract, Component }); return () => {} } },
  }))
  const config = registrations.find(item => item.contract.name === 'plugins.bundle.config')
  const props = { view: 'page', t: locale.bind('collabUi'), ...config.contract.inject() }
  const page = () => renderer.draw(config.Component, props)
  const boot = () => {
    const entry = visit(page(), node => node.props?.key === 'boot')[0]
    return renderer.draw(entry.type, entry.props)
  }
  const button = (id, tree = boot()) => {
    const match = visit(tree, node => node.props?.['data-testid'] === id)[0]
    assert.ok(match, `Missing ${id}`)
    return match
  }
  return { renderer, source, locale, page, boot, button, dispose: async () => { renderer.destroy(); await dispose() } }
}

for (const language of ['en', 'zh']) {
  test(`RC11 ${language}: placeholder labels prefix once and explanations occupy separate block nodes`, async () => {
    const f = await runClient(language)
    try {
      const entry = visit(f.page(), node => node.props?.key === 'status' && typeof node.type === 'function')[0]
      f.renderer.draw(entry.type, entry.props)
      await tick()
      const tree = f.renderer.draw(entry.type, entry.props)
      const rows = visit(tree, node => node.type === 'tr' && node.props?.['data-kind'] === 'derived')
      assert.equal(rows.length, ids.length)
      for (const row of rows) {
        const id = ids.find(value => row.props['data-placeholder'] === (placeholders.has(value) ? 'true' : 'false') && text(row).includes(f.locale.bind('collabUi')(`row.${value}`)))
        assert.ok(id, `row is one of the seven translated derived IDs: ${text(row)}`)
        const t = f.locale.bind('collabUi')
        const heading = visit(row, node => node.type === 'th' && node.props.scope === 'row')[0]
        assert.ok(heading, `row ${id} has a row heading`)
        const titleWithoutExplanations = visit(heading, node => ['p', 'div'].includes(node.type) && (text(node) === t('statusPlaceholder'))).reduce((value, block) => value.replace(t('statusPlaceholder'), ''), text(heading))
        assert.equal(count(titleWithoutExplanations, t('derivedKind')), 1, `row ${id} has exactly one ${t('derivedKind')} prefix`)
        assert.ok(titleWithoutExplanations.includes(t(`row.${id}`)), `row ${id} has its own localized label`)
        if (placeholders.has(id)) {
          const explanationBlocks = visit(heading, node => ['p', 'div'].includes(node.type) && text(node) === t('statusPlaceholder'))
          assert.equal(explanationBlocks.length, 1, `row ${id} has one separate block explanation`)
          assert.notEqual(explanationBlocks[0], heading)
        }
      }
    } finally { await f.dispose() }
  })
}

for (const language of ['en', 'zh']) {
  test(`RC11 ${language}: same-module explanation is a distinct block below the operation`, async () => {
    const f = await runClient(language, { sameModule: true })
    try {
      f.boot()
      await tick()
      f.button('boot-enable').props.onClick()
      await tick()
      const modal = visit(f.boot(), node => node.type === 'test-host-modal')[0]
      assert.ok(modal, 'boot plan modal is rendered')
      const explanationText = f.locale.bind('collabUi')('boot.moduleUnchanged')
      const explanations = visit(modal, node => ['p', 'div'].includes(node.type) && text(node) === explanationText)
      assert.equal(explanations.length, 1, 'same-module explanation is a distinct block node')
      const explanation = explanations[0]
      const cell = visit(modal, node => node.type === 'td' && text(node).includes(explanationText))[0]
      assert.ok(cell)
      assert.ok(text(cell).indexOf(text(explanation)) > text(cell).indexOf(f.locale.bind('collabUi')('boot.operation.replace')))
    } finally { await f.dispose() }
  })
}

test('RC11 emitted factory mounts without a preview RPC and has no preview descriptor or obsolete locale keys', async () => {
  const emitted = await readFile(new URL('../dist/client.js', import.meta.url), 'utf8')
  for (const key of obsoleteLocaleKeys) {
    assert.doesNotMatch(emitted, new RegExp(`\\b${key}\\b`), `emitted client omits ${key}`)
  }
  for (const language of ['en', 'zh']) {
    const dictionary = JSON.parse(await readFile(new URL(`../locale/${language}.json`, import.meta.url), 'utf8')).collabUi
    for (const key of obsoleteLocaleKeys) assert.equal(Object.hasOwn(dictionary, key), false, `${language}.json omits ${key}`)
  }
  const f = await runClient('en', { emitted: true })
  await f.dispose()
})
