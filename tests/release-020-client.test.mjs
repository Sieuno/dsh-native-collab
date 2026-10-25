import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { actualLocale } from './official-locale-fixture.mjs'
import { clientContext, clientRequire } from './browser-fixture.mjs'
import { elementRenderer } from './element-renderer.mjs'

const obsoleteKeys = [
  'readOnlyNotice',
  'reason.transaction-unavailable',
  'reason.source-layer-unknown',
  'reason.preset-structure-unverified',
  'reason.dynamic-config-unverified',
  'reason.higher-priority-overrides-unverified',
  'reason.next-start-not-proven',
  'reason.hmr-active',
  'reason.profile-unavailable',
  'reason.inventory-unavailable',
  'reason.invalid-action',
]
const tick = () => new Promise(resolve => setImmediate(resolve))

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

async function dictionaries() {
  return Object.fromEntries(await Promise.all(['en', 'zh'].map(async language => [
    language, JSON.parse(await readFile(new URL(`../locale/${language}.json`, import.meta.url), 'utf8')).collabUi,
  ])))
}
function emittedDictionaries(source) {
  const match = source.match(/const UI_LOCALES = (\{.*\})\s*\n/)
  assert.ok(match, 'emitted client contains its embedded locale dictionaries')
  return JSON.parse(match[1])
}

for (const language of ['en', 'zh']) {
  test(`release 0.2.0 ${language}: obsolete preview strings are absent and live blocked locale resolves`, async () => {
    const sourcePath = new URL('../packages/agent-team/client.js', import.meta.url)
    const emittedPath = new URL('../dist/client.js', import.meta.url)
    const [source, emitted, sourceDictionaries] = await Promise.all([
      readFile(sourcePath, 'utf8'), readFile(emittedPath, 'utf8'), dictionaries(),
    ])
    const embedded = emittedDictionaries(emitted)

    for (const [origin, dictionary] of [
      ['source locale', sourceDictionaries[language]],
      ['emitted locale', embedded[language]],
    ]) {
      for (const key of obsoleteKeys) assert.equal(Object.hasOwn(dictionary, key), false, `${origin} omits ${key}`)
      assert.equal(typeof dictionary.boot?.blocked, 'string', `${origin} retains boot.blocked`)
    }
    assert.deepEqual(embedded, sourceDictionaries, 'emitted locale dictionaries agree with source dictionaries')

    if (language === 'zh') {
      assert.match(sourceDictionaries.zh.boot.blocked, /重新核对/)
      assert.doesNotMatch(sourceDictionaries.zh.boot.blocked, /重新预览/)
    }

    const fixture = await mountClient(language, { source, emitted })
    try {
      const localized = fixture.locale.bind('collabUi')('boot.blocked')
      assert.equal(localized, sourceDictionaries[language].boot.blocked, 'public LocaleRuntime resolves the registered live boot label')
      if (language === 'zh') {
        assert.match(localized, /重新核对/)
        assert.doesNotMatch(localized, /重新预览/)
      }
    } finally { await fixture.dispose() }
  })
}

test('release 0.2.0 operation labels are narrowly scoped without losing table scrolling', async () => {
  const source = await readFile(new URL('../packages/agent-team/client.js', import.meta.url), 'utf8')
  const emitted = await readFile(new URL('../dist/client.js', import.meta.url), 'utf8')
  for (const [artifact, code] of [['source', source], ['emitted', emitted]]) {
    const css = code.match(/const UI_CSS = `([\s\S]*?)`/)
    assert.ok(css, `${artifact} includes inline UI CSS`)
    const operationRule = css[1].match(/\.dsh-native-collab-operation\s*\{([^}]*)\}/)
    assert.ok(operationRule, `${artifact} has a dedicated operation-label rule`)
    for (const declaration of [
      /(?:^|;)\s*display\s*:\s*inline-block\s*(?:;|$)/,
      /(?:^|;)\s*white-space\s*:\s*nowrap\s*(?:;|$)/,
      /(?:^|;)\s*word-break\s*:\s*normal\s*(?:;|$)/,
      /(?:^|;)\s*overflow-wrap\s*:\s*normal\s*(?:;|$)/,
    ]) assert.match(operationRule[1], declaration, `${artifact} scopes ${declaration}`)
    assert.match(css[1], /\.dsh-native-collab-table-frame\s*\{[^}]*overflow\s*:\s*auto/s, `${artifact} preserves horizontal table scrolling`)
    assert.match(css[1], /\.dsh-native-collab-table\s+th,\s*\.dsh-native-collab-table\s+td\s*\{[^}]*overflow-wrap\s*:\s*anywhere;[^}]*word-break\s*:\s*break-word/s, `${artifact} retains existing wrapping for table cells`)
    assert.doesNotMatch(css[1], /(?:^|})\s*(?:\*|html|body)\s*\{[^}]*\b(?:white-space|word-break|overflow-wrap)\s*:/s, `${artifact} does not introduce global whitespace rules`)
  }
})

// Element-renderer contracts only, not real-browser or Host validation.
// Preserve the existing split: risky communication preferences ask for confirmation;
// numeric quota uses its validated Save button directly. Do not add a new modal.
test('release 0.2.0 Chinese communication preference confirms locally and cancels without a write', async () => {
  const source = await readFile(new URL('../packages/agent-team/client.js', import.meta.url), 'utf8')
  const fixture = await mountClient('zh', { source })
  const renderer = fixture.renderer
  const writes = []
  const form = {
    state: { status: 'ready', revision: 7, writable: true, value: { communicationEnhancement: false } },
    async mutate(ops, revision) { writes.push({ ops, revision }); return true },
  }
  try {
    const row = fixture.registrations.find(item => item.contract.name === 'plugins.row.config')
    assert.ok(row, 'settings row is registered')
    const props = { view: 'page', t: fixture.locale.bind('collabUi'), form, ...row.contract.inject() }
    const page = () => renderer.draw(row.Component, props)
    page()
    await tick()
    visit(page(), node => node.props?.['data-testid'] === 'switch-communication')[0].props.onChange({ target: { checked: true } })
    const save = visit(page(), node => node.props?.['data-testid'] === 'save-communication')[0]
    assert.ok(save)
    assert.equal(save.props.disabled, false)
    save.props.onClick()

    const modal = visit(page(), node => node.type === 'test-host-modal')[0]
    assert.ok(modal, 'communication preference with missing base rows opens confirmation')
    assert.equal(modal.props.title, fixture.locale.bind('collabUi')('modalTitle'), 'confirmation title is localized through LocaleRuntime')
    assert.equal(writes.length, 0, 'opening the confirmation has not written settings')
    const cancel = visit(modal, node => node.props?.['data-testid'] === 'modal-cancel')[0]
    assert.ok(cancel)
    cancel.props.onClick()
    await tick()
    assert.equal(writes.length, 0, 'cancel makes no settings write')
    assert.equal(visit(page(), node => node.type === 'test-host-modal').length, 0, 'cancel closes confirmation')

    // Reopen and confirm to verify both localized action text and the exact allowlisted mutation.
    visit(page(), node => node.props?.['data-testid'] === 'save-communication')[0].props.onClick()
    const confirmed = visit(page(), node => node.type === 'test-host-modal')[0]
    assert.ok(confirmed)
    const confirm = visit(confirmed, node => node.props?.['data-testid'] === 'modal-confirm')[0]
    assert.ok(confirm)
    assert.equal(text(confirm), fixture.locale.bind('collabUi')('modalSavePreference'))
    confirm.props.onClick()
    await tick()
    await tick()
    assert.equal(writes.length, 1)
    assert.deepEqual(JSON.parse(JSON.stringify(writes[0])), {
      revision: 7,
      ops: [{ op: 'set', path: ['communicationEnhancement'], value: true }],
    }, 'confirmation writes only the controlled communication preference')
  } finally { await fixture.dispose() }
})

test('release 0.2.0 Chinese valid quota preserves direct Save and writes only its field', async () => {
  const fixture = await mountClient('zh')
  const writes = []
  const form = {
    state: { status: 'ready', revision: 8, writable: true, value: { teamRequestLimit: 32 } },
    async mutate(ops, revision) { writes.push({ ops, revision }); return true },
  }
  try {
    const row = fixture.registrations.find(item => item.contract.name === 'plugins.row.config')
    const props = { view: 'page', t: fixture.locale.bind('collabUi'), form, ...row.contract.inject() }
    const page = () => fixture.renderer.draw(row.Component, props)
    visit(page(), node => node.props?.['data-testid'] === 'team-request-limit')[0].props.onChange({ target: { value: '47' } })
    const save = visit(page(), node => node.props?.['data-testid'] === 'save-quota')[0]
    assert.equal(save.props.disabled, false)
    assert.equal(text(save), fixture.locale.bind('collabUi')('saveQuota'))
    assert.equal(writes.length, 0)
    save.props.onClick()
    await tick()
    await tick()
    assert.equal(visit(page(), node => node.type === 'test-host-modal').length, 0, 'quota intentionally has no confirmation modal')
    assert.deepEqual(JSON.parse(JSON.stringify(writes)), [{ revision: 8, ops: [{ op: 'set', path: ['teamRequestLimit'], value: 47 }] }])
    const notice = visit(page(), node => node.props?.['data-testid'] === 'write-notice')[0]
    assert.equal(text(notice), fixture.locale.bind('collabUi')('write.saved-pending-restart'))
  } finally { await fixture.dispose() }
})

async function mountClient(language, { source, emitted } = {}) {
  const renderer = elementRenderer()
  const locale = actualLocale(language)
  if (!source) source = await readFile(new URL('../packages/agent-team/client.js', import.meta.url), 'utf8')
  if (!emitted && source.includes('const UI_LOCALES = null')) {
    const values = await dictionaries()
    source = source.replace('const UI_LOCALES = null', `const UI_LOCALES = ${JSON.stringify(values)}`)
  } else if (emitted) source = emitted
  let spec
  runInNewContext(source, {
    setTimeout, clearTimeout, document: { activeElement: null },
    window: { __ModuleLoader__: { load(value) { spec = value } } },
  })
  const remote = { collabUi: {
    async status() { return { profileName: 'test', hmrEnabled: null, rows: [], desired: 'unchanged', pendingRestart: 'unknown', writeSupport: 'unsupported', operationError: 'transaction-unavailable', error: null, assembly: null } },
    async bootStatus() { return { profileName: 'test', configured: 'disabled', writeSupport: 'available', pendingRestart: 'unknown', error: null } },
    async bootPlan(action) { return { action, accepted: false, planId: '12345678-1234-1234-1234-123456789abc', targets: [], pendingRestart: 'required', error: null, warnings: [] } },
    async bootApply() { return { action: 'enable', accepted: true, pendingRestart: 'required', error: null, configured: 'enabled' } },
  } }
  const registrations = []
  const dispose = await spec.factory(clientRequire(renderer.React)).apply(clientContext({
    remote, locale,
    slots: { inject(_name, register) { register(); return () => {} }, register(contract, Component) { registrations.push({ contract, Component }); return () => {} } },
  }))
  return { renderer, locale, registrations, dispose: async () => { renderer.destroy(); await dispose() } }
}
