import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createLocale } from './locale-fixture.mjs'
import { clientSource, clientModule, clientContext, clientRequire } from './browser-fixture.mjs'
import { elementRenderer } from './element-renderer.mjs'

const obsoleteKeys = [
  'readOnlyNotice', 'reason.transaction-unavailable', 'reason.source-layer-unknown',
  'reason.preset-structure-unverified', 'reason.dynamic-config-unverified',
  'reason.higher-priority-overrides-unverified', 'reason.next-start-not-proven',
  'reason.hmr-active', 'reason.profile-unavailable', 'reason.inventory-unavailable', 'reason.invalid-action',
  'previewOnly', 'previewEnable', 'previewRestore', 'previewAccepted', 'previewRejected', 'previewUnknown',
]

for (const language of ['en', 'zh']) {
  test(`${language}: source and emitted factories register flat current locale without preview strings`, async () => {
    const dictionary = JSON.parse(await readFile(new URL(`../locale/${language}.json`, import.meta.url), 'utf8')).collabUi
    for (const key of obsoleteKeys) assert.equal(Object.hasOwn(dictionary, key), false, key)
    for (const key of ['quotaRemains', 'quotaUsageUnknown']) {
      assert.ok(dictionary[key].includes(language === 'zh' ? '由会话所有 Agent 共享' : 'shared by all Agents associated with the session'))
      assert.doesNotMatch(dictionary[key], /Team 家族|Team family/)
    }
    for (const emitted of [false, true]) {
      const locale = createLocale(language), renderer = elementRenderer()
      const spec = await clientModule({}, { emitted })
      const dispose = await spec.factory(clientRequire(renderer.React)).apply(clientContext({
        locale, remote: { collabUi: { async status() { return { rows: [], assembly: null } } } },
        slots: { inject(_name, register) { register(); return () => {} }, register() { return () => {} } },
      }))
      try {
        const t = locale.bind('collabUi')
        for (const key of ['settingsTitle', 'modelSourceAll', 'currentState', 'sourceLayer', 'runtimePhase', 'quotaRemains', 'quotaUsageUnknown']) {
          assert.equal(t(key), dictionary[key])
        }
        for (const key of obsoleteKeys) assert.equal(t(key), key)
      } finally { renderer.destroy(); await dispose() }
    }
  })
}

test('flat locale does not treat nested dictionaries as registered dotted keys', () => {
  const locale = createLocale('zh')
  locale.register('test', { zh: { settings: { title: '不会被解析' } } })
  assert.equal(locale.bind('test')('settings.title'), 'settings.title')
})

test('emitted browser factory includes both current build-time data injections', async () => {
  assert.equal(await clientSource({ emitted: true }), await clientSource())
})

test('operation-label CSS is scoped and preserves table scrolling and wrapping', async () => {
  for (const emitted of [false, true]) {
    const code = await clientSource({ emitted })
    const css = code.match(/const UI_CSS = `([\s\S]*?)`/)
    assert.ok(css)
    const operationRule = css[1].match(/\.dsh-native-collab-operation\s*\{([^}]*)\}/)
    assert.ok(operationRule)
    for (const declaration of [
      /(?:^|;)\s*display\s*:\s*inline-block\s*(?:;|$)/,
      /(?:^|;)\s*white-space\s*:\s*nowrap\s*(?:;|$)/,
      /(?:^|;)\s*word-break\s*:\s*normal\s*(?:;|$)/,
      /(?:^|;)\s*overflow-wrap\s*:\s*normal\s*(?:;|$)/,
    ]) assert.match(operationRule[1], declaration)
    assert.match(css[1], /\.dsh-native-collab-table-frame\s*\{[^}]*overflow\s*:\s*auto/s)
    assert.match(css[1], /\.dsh-native-collab-table\s+th,\s*\.dsh-native-collab-table\s+td\s*\{[^}]*overflow-wrap\s*:\s*anywhere;[^}]*word-break\s*:\s*break-word/s)
    assert.doesNotMatch(css[1], /(?:^|})\s*(?:\*|html|body)\s*\{[^}]*\b(?:white-space|word-break|overflow-wrap)\s*:/s)
  }
})
