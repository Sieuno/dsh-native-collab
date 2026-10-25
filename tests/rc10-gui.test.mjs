import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { clientContext, clientRequire } from './browser-fixture.mjs'
import { actualLocale } from './official-locale-fixture.mjs'
import { elementRenderer } from './element-renderer.mjs'

const TOKEN = '12345678-1234-1234-1234-123456789abc'
const DERIVED_IDS = [
  'dsh-native-collab-subagent',
  'dsh-native-collab-tool-subagent-control',
  'dsh-native-collab-tool-subagent-list-agents',
  'dsh-native-collab-agent-team',
  'dsh-native-collab-tool-agent-team',
  'dsh-native-collab-tool-subagent',
  'dsh-native-collab-tool-subagent-fork',
]
const PLACEHOLDERS = new Set(['dsh-native-collab-tool-subagent', 'dsh-native-collab-tool-subagent-fork'])
const STALE_ENABLE_WARNINGS = [
  'native-features-will-be-enabled',
  'original-disabled-state-not-restored',
  'remove-only-after-off-and-verification',
  'own-profile-preferences-will-be-cleared',
  'stop-agents-and-restart',
  'fixed-state-not-history-restore',
  'custom-safety-check',
]

function visit(node, predicate, found = []) {
  if (Array.isArray(node)) { node.forEach(child => visit(child, predicate, found)); return found }
  if (!node || typeof node !== 'object') return found
  if (predicate(node)) found.push(node)
  visit(node.children, predicate, found)
  visit(node.props?.children, predicate, found)
  visit(node.props?.footer, predicate, found)
  return found
}
function textsOf(node) {
  return visit(node, () => true).flatMap(item => (item.children ?? []).flat(Infinity).filter(value => typeof value === 'string'))
}
const tick = () => new Promise(resolve => setImmediate(resolve))

async function harness(language, options = {}) {
  const renderer = elementRenderer()
  const locale = actualLocale(language)
  const calls = []
  const dictionaries = Object.fromEntries(await Promise.all(['en', 'zh'].map(async code => [
    code, JSON.parse(await readFile(new URL(`../locale/${code}.json`, import.meta.url), 'utf8')).collabUi,
  ])))
  const source = await readFile(new URL('../packages/agent-team/client.js', import.meta.url), 'utf8')
  assert.equal(source.includes('const UI_LOCALES = null'), true)
  const injected = source.replace('const UI_LOCALES = null', `const UI_LOCALES = ${JSON.stringify(dictionaries)}`)
  let spec
  runInNewContext(injected, {
    setTimeout, clearTimeout, document: { activeElement: null },
    window: { __ModuleLoader__: { load(value) { spec = value } } },
  })
  const remote = { collabUi: {
    async status() {
      return {
        rows: DERIVED_IDS.map(id => ({ id, current: 'disabled', sourceLayer: 'unknown', runtimePhase: PLACEHOLDERS.has(id) ? null : 'active' })),
        assembly: { teamRequestLimit: 32 },
      }
    },
    async bootStatus() {
      return { profileName: 'test', configured: options.configured ?? 'disabled', writeSupport: 'available', pendingRestart: 'unknown', error: options.statusError ?? null }
    },
    async bootPlan(action) {
      calls.push({ plan: action })
      return {
        action, accepted: false, planId: TOKEN, pendingRestart: 'required', error: null,
        warnings: options.warnings ?? STALE_ENABLE_WARNINGS,
        targets: options.targets ?? [
          { scope: 'preset:native', id: 'tool-subagent', moduleName: '@deepseek-ai/dsh-tool-subagent', previousModule: '@deepseek-ai/dsh-tool-subagent', operation: 'replace' },
          { scope: 'root', id: 'dsh-native-collab-subagent', moduleName: '@dsh-native-collab/derived/subagent', previousModule: '@deepseek-ai/dsh-subagent', operation: 'replace' },
        ],
      }
    },
    async bootApply(planId) { calls.push({ apply: planId }); return { action: 'enable', accepted: true, pendingRestart: 'required', error: null, configured: 'enabled' } },
  } }
  const registrations = []
  const dispose = await spec.factory(clientRequire(renderer.React)).apply(clientContext({
    remote, locale,
    slots: {
      inject(_name, register) { register(); return () => {} },
      register(contract, Component) { registrations.push({ contract, Component }); return () => {} },
    },
  }))
  const row = registrations.find(item => item.contract.name === 'plugins.bundle.config')
  const props = { view: 'page', t: locale.bind('collabUi'), ...row.contract.inject() }
  const page = () => renderer.draw(row.Component, props)
  const boot = () => {
    const element = visit(page(), node => node.props?.key === 'boot')[0]
    return renderer.draw(element.type, element.props)
  }
  const button = (id, tree = boot()) => {
    const match = visit(tree, node => node.props?.['data-testid'] === id)[0]
    assert.ok(match, `Missing ${id}`)
    return match
  }
  return { renderer, locale, t: props.t, calls, page, boot, button, dispose: async () => { renderer.destroy(); await dispose() } }
}

for (const language of ['en', 'zh']) {
  test(`RC10 ${language}: flat LocaleRuntime resolves diagnostic headers and does not treat phase as source`, async () => {
    const f = await harness(language)
    try {
      for (const key of ['currentState', 'sourceLayer', 'runtimePhase', 'statusRootScope', 'statusReadOnly', 'unknown-pending', 'derivedKind', 'statusPlaceholder']) {
        assert.notEqual(f.t(key), key, key)
      }
      assert.notEqual(f.t('sourceLayer'), f.t('runtimePhase'))
      assert.notEqual(f.t('currentState'), f.t('sourceLayer'))
      const entry = visit(f.page(), node => node.props?.key === 'status' && typeof node.type === 'function')[0]
      f.renderer.draw(entry.type, entry.props)
      await tick()
      const page = f.renderer.draw(entry.type, entry.props)
      const headers = visit(page, node => node.type === 'th' && node.props.scope === 'col').map(node => textsOf(node).join(''))
      assert.deepEqual(headers, [f.t('component'), f.t('currentState'), f.t('sourceLayer'), f.t('runtimePhase')])
      const rows = visit(page, node => node.type === 'tr' && node.props?.['data-kind'] === 'derived')
      assert.equal(rows.length, 7)
      assert.equal(rows.filter(row => row.props['data-placeholder'] === 'true').length, 2)
      assert.equal(visit(page, node => node.props?.['data-testid'] === 'derived-placeholder').length, 2)
      assert.ok(textsOf(page).includes(f.t('statusPlaceholder')))
      assert.ok(textsOf(page).includes(f.t('derivedKind')))
      const scope = textsOf(visit(page, node => node.props?.['data-testid'] === 'status-root-scope')[0]).join('')
      assert.equal(scope, f.t('statusRootScope'))
      assert.match(scope, language === 'zh' ? /派生根/ : /derived roots/)
      assert.match(scope, language === 'zh' ? /不报告 preset/ : /does not report native roots or preset execution/)
      const sourceCells = visit(page, node => node.type === 'td' && node.props?.key === 'layer').map(node => textsOf(node).join(''))
      const phaseCells = visit(page, node => node.type === 'td' && node.props?.key === 'phase').map(node => textsOf(node).join(''))
      assert.ok(sourceCells.every(text => text === f.t('unknown')))
      assert.ok(phaseCells.includes(f.t('phase.active')))
      assert.ok(phaseCells.every(text => text !== f.t('sourceLayer')))
    } finally { await f.dispose() }
  })

  test(`RC10 ${language}: enable confirmation is action-specific and drops restore warnings from a stale plan`, async () => {
    const f = await harness(language, { configured: 'disabled' })
    try {
      f.boot(); await tick()
      const restore = f.button('boot-restore')
      assert.notEqual(restore.props.disabled, true)
      f.button('boot-enable').props.onClick()
      await tick()
      const tree = f.boot()
      const modal = visit(tree, node => node.type === 'test-host-modal')[0]
      assert.ok(modal)
      assert.equal(modal.props['data-action'], 'enable')
      const modalText = textsOf(modal).join('\n')
      const pageText = textsOf(tree).join('\n')
      assert.ok(modalText.includes(f.t('boot.enableIntro')))
      assert.ok(modalText.includes(f.t('boot.presetPin')))
      assert.ok(modalText.includes(f.t('boot.warning.stop-agents-and-restart')))
      assert.ok(modalText.includes('custom-safety-check'))
      assert.equal(f.t('boot.warning.custom-safety-check'), 'boot.warning.custom-safety-check')
      for (const forbidden of [f.t('boot.restoreIntro'), f.t('boot.fixed'), f.t('boot.uninstall'), f.t('boot.warning.native-features-will-be-enabled'), f.t('boot.warning.remove-only-after-off-and-verification')]) {
        assert.equal(pageText.includes(forbidden), false, forbidden)
      }
      assert.equal(f.calls.filter(call => call.apply).length, 0)
      const unchanged = visit(modal, node => node.props?.['data-module-unchanged'] === 'true')
      const changed = visit(modal, node => node.props?.['data-module-unchanged'] === 'false')
      assert.equal(unchanged.length, 1)
      assert.equal(changed.length, 1)
      assert.ok(textsOf(unchanged[0]).join('').includes(f.t('boot.moduleUnchanged')))
      assert.equal(textsOf(changed[0]).join('').includes(f.t('boot.moduleUnchanged')), false)
    } finally { await f.dispose() }
  })

  test(`RC10 ${language}: restore names all five native roots and still accepts a disabled configured state`, async () => {
    const f = await harness(language, { configured: 'disabled' })
    try {
      f.boot(); await tick()
      assert.notEqual(f.button('boot-restore').props.disabled, true)
      f.button('boot-restore').props.onClick()
      await tick()
      const modal = visit(f.boot(), node => node.type === 'test-host-modal')[0]
      assert.equal(modal.props['data-action'], 'restore')
      const modalText = textsOf(modal).join('\n')
      assert.ok(modalText.includes(f.t('boot.restoreIntro')))
      assert.ok(modalText.includes(f.t('boot.uninstall')))
      assert.ok(modalText.includes(f.t('boot.warning.native-features-will-be-enabled')))
      assert.equal(modalText.includes(f.t('boot.enableIntro')), false)
      assert.match(f.t('boot.restoreIntro'), language === 'zh' ? /五项/ : /five native roots/)
      assert.match(f.t('boot.restoreIntro'), language === 'zh' ? /原先禁用/ : /originally disabled/)
      assert.match(f.t('boot.restoreIntro'), language === 'zh' ? /不是历史/ : /not a historical restoration/)
      assert.deepEqual(f.calls.filter(call => call.plan), [{ plan: 'restore' }])
      assert.equal(f.calls.filter(call => call.apply).length, 0)
    } finally { await f.dispose() }
  })
}

test('RC10 already-enabled enable does not open a confirmation or write', async () => {
  const f = await harness('en', { configured: 'enabled' })
  try {
    f.boot(); await tick(); f.boot()
    f.button('boot-enable').props.onClick()
    const tree = f.boot()
    assert.equal(visit(tree, node => node.type === 'test-host-modal').length, 0)
    assert.equal(textsOf(visit(tree, node => node.props?.['data-testid'] === 'boot-notice')[0]).join(''), f.t('boot.alreadyEnabled'))
    assert.equal(f.calls.length, 0)
    f.button('boot-restore', tree).props.onClick()
    await tick()
    assert.deepEqual(f.calls, [{ plan: 'restore' }])
  } finally { await f.dispose() }
})

test('RC10 saved-state numeric cells share th/td box geometry without a host stylesheet', async () => {
  const f = await harness('en')
  try {
    const settings = () => {
      const element = visit(f.page(), node => node.props?.key === 'settings')[0]
      return f.renderer.draw(element.type, element.props)
    }
    settings(); await tick()
    const tree = settings()
    const css = textsOf(visit(tree, node => node.props?.['data-testid'] === 'collab-styles')[0]).join('')
    assert.match(css, /\.dsh-native-collab-table th, \.dsh-native-collab-table td \{[^}]*box-sizing: border-box[^}]*font-weight: 400/)
    assert.match(css, /\.dsh-native-collab-saved td\[data-numeric="true"\] \{[^}]*tabular-nums/)
    const quota = visit(tree, node => node.type === 'tr' && node.props?.key === 'teamRequestLimit')[0]
    const numeric = visit(quota, node => node.props?.['data-numeric'] === 'true')
    assert.equal(numeric.length, 1)
    assert.equal(textsOf(numeric[0]).join(''), '32')
    const label = visit(quota, node => node.type === 'th')[0]
    assert.equal(label.props['data-numeric'], undefined)
  } finally { await f.dispose() }
})

test('RC10 confirm still requires the server plan token and restores the trigger', async () => {
  const f = await harness('en', { configured: 'disabled' })
  try {
    f.boot(); await tick()
    const focuses = []
    const trigger = { isConnected: true, disabled: false, focus() { focuses.push('enable') } }
    f.button('boot-enable').props.onClick({ currentTarget: trigger })
    await tick()
    assert.equal(f.calls.filter(call => call.apply).length, 0)
    f.button('boot-confirm').props.onClick()
    await tick()
    f.boot()
    await new Promise(resolve => setTimeout(resolve, 5))
    assert.deepEqual(f.calls.filter(call => call.apply), [{ apply: TOKEN }])
    assert.deepEqual(focuses, ['enable'])
  } finally { await f.dispose() }
})
