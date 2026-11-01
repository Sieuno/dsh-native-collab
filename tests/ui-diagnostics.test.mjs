import test from 'node:test'
import assert from 'node:assert/strict'
import { clientContext, clientRequire, clientModule, visit, text } from './browser-fixture.mjs'
import { createLocale } from './locale-fixture.mjs'
import { elementRenderer } from './element-renderer.mjs'
import { ASSEMBLY_ROLES } from '../dist/agent-team/assembly-layout.js'

const DERIVED_IDS = [
  'dsh-native-collab-subagent',
  'dsh-native-collab-tool-subagent-control',
  'dsh-native-collab-tool-subagent-list-agents',
  'dsh-native-collab-agent-team',
  'dsh-native-collab-tool-agent-team',
  'dsh-native-collab-tool-subagent',
  'dsh-native-collab-tool-subagent-fork',
]
const CORES = [
  { key: 'subagent', nativeId: 'subagent', id: 'dsh-native-collab-subagent', module: '@sieuno/dsh-native-collab/subagent' },
  { key: 'agentTeam', nativeId: 'agent-team', id: 'dsh-native-collab-agent-team', module: '@sieuno/dsh-native-collab/agent-team' },
  { key: 'teamTools', nativeId: 'tool-agent-team', id: 'dsh-native-collab-tool-agent-team', module: '@sieuno/dsh-native-collab/tool-agent-team' },
]
const rowSubject = (rowId, moduleName) => ({ kind: 'row', row: { rowId, moduleName, enabled: false } })
const PLACEHOLDERS = new Set(ASSEMBLY_ROLES.filter(role => role.placement === 'preset').map(role => role.legacyId))
function textsOf(node) {
  return visit(node, () => true).flatMap(item => (item.children ?? []).flat(Infinity).filter(value => typeof value === 'string'))
}
const tick = () => new Promise(resolve => setImmediate(resolve))

async function harness(language) {
  const renderer = elementRenderer()
  const locale = createLocale(language)
  const calls = []
  const spec = await clientModule()
  const remote = { settings: {
    async describe() {
      const fields = ['modelEnhancement', 'communicationEnhancement', 'modelSource', 'nativeModelSelectionCompatibility', 'runningChildGuidance', 'completedChildContinuation', 'teamRequestLimit']
      const schema = { type: 'object', dict: Object.fromEntries(fields.map(field => [field, field === 'teamRequestLimit' ? { type: 'number' } : field === 'modelSource' ? { type: 'string', enum: ['conversation', 'settings', 'all'] } : { type: 'boolean' }])) }
      return { ok: true, value: { writable: true, hasDocument: true, namespaces: [{ ns: 'dsh-native-collab-ui', revision: form.state.revision, value: { ...form.state.value }, schema }] } }
    },
    async mutate() { throw new Error('diagnostics must not write') },
  }, collabUi: {
    async status() {
      return {
        rows: DERIVED_IDS.map(id => ({ id, current: 'disabled', sourceLayer: 'unknown', runtimePhase: PLACEHOLDERS.has(id) ? null : 'active' })),
        assembly: null,
      }
    },
    async bootPlan(action) { calls.push({ method: 'bootPlan', action }); throw new Error('bootPlan must not be called by the management page') },
    async bootApply(token) { calls.push({ method: 'bootApply', token }); throw new Error('bootApply must not be called by the management page') },
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
  const form = { state: { status: 'ready', revision: 1, writable: true, value: {} }, async mutate() { throw new Error('diagnostics must not write') } }
  const props = { view: 'page', t: locale.bind('collabUi'), form, ...row.contract.inject() }
  const page = () => renderer.draw(row.Component, props)
  return { renderer, locale, t: props.t, calls, page, form, registrations, dispose: async () => { renderer.destroy(); await dispose() } }
}

for (const language of ['en', 'zh']) {
  test(`${language}: flat LocaleRuntime resolves diagnostic headers and does not treat phase as source`, async () => {
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
      assert.equal(rows.filter(row => row.props['data-placeholder'] === 'true').length, 4)
      assert.equal(visit(page, node => node.props?.['data-testid'] === 'derived-placeholder').length, 4)
      assert.ok(textsOf(page).includes(f.t('statusPlaceholder')))
      assert.ok(textsOf(page).includes(f.t('derivedKind')))
      const scope = textsOf(visit(page, node => node.props?.['data-testid'] === 'status-root-scope')[0]).join('')
      assert.equal(scope, f.t('statusRootScope'))
      assert.match(scope, language === 'zh' ? /组件/ : /components/)
      assert.match(scope, language === 'zh' ? /不是功能开关/ : /not feature toggles/)
      assert.ok(textsOf(page).includes(f.t('statusReadOnly')))
      assert.match(f.t('statusReadOnly'), language === 'zh' ? /不能证明.*工具可用/ : /do not.*prove tool availability/)
      const sourceCells = visit(page, node => node.type === 'td' && node.props?.key === 'layer').map(node => textsOf(node).join(''))
      const phaseCells = visit(page, node => node.type === 'td' && node.props?.key === 'phase').map(node => textsOf(node).join(''))
      assert.ok(sourceCells.every(text => text === f.t('unknown')))
      assert.ok(phaseCells.includes(f.t('phase.active')))
      assert.ok(phaseCells.every(text => text !== f.t('sourceLayer')))
      assert.equal(visit(page, node => node.props?.['data-testid']?.startsWith('preview-')).length, 0)
      for (const [index, row] of rows.entries()) {
        const id = DERIVED_IDS[index]
        const heading = visit(row, node => node.type === 'th' && node.props.scope === 'row')[0]
        const label = visit(heading, node => node.props?.className === 'dsh-native-collab-row-label')[0]
        assert.ok(heading)
        assert.ok(label)
        assert.equal(text(label), `${f.t('derivedKind')} ${f.t(`row.${id}`)}`)
        const explanations = visit(heading, node => ['p', 'div'].includes(node.type) && text(node) === f.t('statusPlaceholder'))
        assert.equal(explanations.length, PLACEHOLDERS.has(id) ? 1 : 0)
      }
    } finally { await f.dispose() }
  })

  test(`${language}: ordinary management page has no boot controls or offline modal`, async () => {
    const f = await harness(language)
    try {
      const tree = f.page()
      assert.equal(visit(tree, node => /^boot-(?:enable|restore)$/.test(node.props?.['data-testid'] ?? '')).length, 0)
      assert.equal(visit(tree, node => node.type === 'test-host-modal' || node.props?.['data-testid'] === 'offline-guide').length, 0)
      assert.equal(f.registrations.some(item => item.contract.name === 'plugins.bundle.config'), true)
      const settings = visit(tree, node => node.props?.key === 'settings')[0]
      assert.ok(settings, 'normal settings remain mounted')
      const page = f.renderer.draw(settings.type, settings.props)
      await tick()
      assert.equal(visit(page, node => node.props?.['data-testid'] === 'enhancement-page').length, 1)
      for (const id of ['boot-enable', 'boot-restore', 'offline-guide', 'offline-download', 'boot-review', 'feature-setup-review']) {
        assert.equal(visit(tree, node => node.props?.['data-testid'] === id).length, 0)
      }
      assert.deepEqual(f.calls, [])
    } finally { await f.dispose() }
  })

  test(`${language}: lifecycle notice states normal restart and retained usage, without offline order`, async () => {
    const f = await harness(language)
    try {
      const registration = f.registrations.find(item => item.contract.name === 'plugins.detail.section')
      const bundleElement = f.renderer.draw(registration.Component, { t: f.t, subject: { kind: 'bundle', pkg: { name: '@sieuno/dsh-native-collab' } } })
      const bundle = f.renderer.draw(bundleElement.type, bundleElement.props)
      const content = textsOf(bundle).join('\n')
      for (const key of ['lifecycleTitle', 'lifecycleInstall', 'lifecycleRemove', 'lifecycleSidecar']) {
        assert.notEqual(f.t(key), key)
        assert.ok(content.includes(f.t(key)), key)
      }
      // Recovery guidance is manual and documented: FAQ plus the Profile
      // directory's external startup overrides. No offline tool is offered.
      assert.match(f.t('lifecycleRemove'), /FAQ/)
      assert.match(f.t('lifecycleRemove'), /Profile/)
      assert.equal(/启动切换|离线启动|boot switch|offline (?:tool|switch)/i.test(content), false)
      assert.equal(visit(bundle, node => node.props?.key === 'order' || node.type === 'ol').length, 0)
      assert.deepEqual(f.registrations.map(item => item.contract.name), [
        'plugins.bundle.config', 'plugins.detail.badge', 'plugins.detail.section', 'plugins.row.config',
        'conversation.session.header.actions', 'conversation.session.header.actions',
      ])
      assert.equal(f.registrations[3].contract.key, '@sieuno/dsh-native-collab#dsh-native-collab-ui')
      const badge = f.registrations.find(item => item.contract.name === 'plugins.detail.badge').Component
      const renderSection = subject => {
        const entry = f.renderer.draw(registration.Component, { t: f.t, subject })
        return entry && f.renderer.draw(entry.type, entry.props)
      }
      const renderBadge = subject => f.renderer.draw(badge, { t: f.t, subject })
      const bundleSubject = { kind: 'bundle', pkg: { name: '@sieuno/dsh-native-collab' } }
      assert.equal(bundle.props['data-lifecycle-scope'], 'bundle')
      assert.equal(visit(bundle, node => node.props?.role === 'alert').length, 1)
      assert.equal(visit(renderBadge(bundleSubject), node => node.props?.['data-testid'] === 'lifecycle-badge').length, 1)
      for (const core of CORES) {
        for (const subject of [
          rowSubject(core.id, core.module),
          rowSubject(core.nativeId, `@native/${core.nativeId}`),
          rowSubject('alias-not-a-core-id', core.module),
        ]) {
          const detail = renderSection(subject)
          assert.equal(detail.props['data-lifecycle-scope'], core.key)
          assert.ok(text(detail).includes(f.t(`lifecycleCore.${core.key}`)))
          assert.equal(visit(detail, node => node.type === 'p' && node.props?.key === 'core').length, 1)
          for (const other of CORES) if (other.key !== core.key) assert.equal(text(detail).includes(other.id), false, other.id)
          assert.equal(renderBadge(subject).props['data-lifecycle-scope'], core.key)
        }
      }
      for (const subject of [
        null, { kind: 'item', id: 'unrelated' }, { kind: 'bundle', pkg: { name: '@other/pkg' } },
        rowSubject('workflow', '@other/workflow'),
        ...ASSEMBLY_ROLES.filter(role => role.placement === 'preset').flatMap(role => [
          rowSubject(role.legacyId, role.moduleName), rowSubject(role.nativeId, role.nativeModuleName),
        ]),
      ]) {
        assert.equal(renderSection(subject), null)
        assert.equal(renderBadge(subject), null)
      }
    } finally { await f.dispose() }
  })
}

test('saved-state numeric cells share th/td box geometry without a host stylesheet', async () => {
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
    const defaultQuota = visit(tree, node => node.type === 'tr' && node.props?.key === 'teamRequestLimit')[0]
    assert.ok(textsOf(defaultQuota).includes(f.t('defaultValue').replace('{value}', '32')), 'unset value explicitly labels its default')
    f.form.state.value.teamRequestLimit = 32
    visit(settings(), node => node.props?.['data-testid'] === 'refresh-settings')[0].props.onClick()
    await tick()
    const quota = visit(settings(), node => node.type === 'tr' && node.props?.key === 'teamRequestLimit')[0]
    const numeric = visit(quota, node => node.props?.['data-numeric'] === 'true')
    assert.equal(numeric.length, 1)
    assert.equal(textsOf(numeric[0]).join(''), '32')
    const label = visit(quota, node => node.type === 'th')[0]
    assert.equal(label.props['data-numeric'], undefined)
  } finally { await f.dispose() }
})

