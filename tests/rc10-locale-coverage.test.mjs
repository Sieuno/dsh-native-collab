import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { actualLocale, localeSourceEvidence } from './official-locale-fixture.mjs'
import { clientContext, clientRequire } from './browser-fixture.mjs'
import { elementRenderer } from './element-renderer.mjs'

const root = join(import.meta.dirname, '..')
const require = createRequire(import.meta.url)
const ts = require(process.env.DSH_TYPESCRIPT_ENTRY || 'typescript')
const sourcePath = join(root, 'packages', 'agent-team', 'client.js')
const emittedPath = join(root, 'dist', 'client.js')
const locales = Object.fromEntries(await Promise.all(['en', 'zh'].map(async language => [
  language, JSON.parse(await readFile(join(root, 'locale', `${language}.json`), 'utf8')).collabUi,
])))
const emittedSource = await readFile(emittedPath, 'utf8')
const emittedTree = ts.createSourceFile(emittedPath, emittedSource, ts.ScriptTarget.Latest, true)

function flatten(value, prefix = '', out = {}) {
  for (const [key, child] of Object.entries(value ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof child === 'string') out[path] = child
    else if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, path, out)
  }
  return out
}
function tName(expression) {
  return ts.isIdentifier(expression) ? expression.text === 't'
    : ts.isPropertyAccessExpression(expression) && expression.name.text === 't'
}
function finiteStrings(expression, call) {
  if (ts.isStringLiteralLike(expression)) return [expression.text]
  if (ts.isParenthesizedExpression(expression)) return finiteStrings(expression.expression, call)
  if (ts.isConditionalExpression(expression)) return [...finiteStrings(expression.whenTrue, call), ...finiteStrings(expression.whenFalse, call)]
  if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    return finiteStrings(expression.left, call).flatMap(left => finiteStrings(expression.right, call).map(right => left + right))
  }
  if (ts.isTemplateExpression(expression)) {
    let values = [expression.head.text]
    for (const span of expression.templateSpans) values = values.flatMap(prefix => finiteStrings(span.expression, call).map(value => prefix + value + span.literal.text))
    return values
  }
  if (ts.isIdentifier(expression)) {
    for (let ancestor = call.parent; ancestor; ancestor = ancestor.parent) {
      if (!ts.isArrowFunction(ancestor) || ancestor.parameters[0]?.name?.getText() !== expression.text) continue
      const map = ancestor.parent
      if (ts.isCallExpression(map) && ts.isPropertyAccessExpression(map.expression) && map.expression.name.text === 'map' && ts.isArrayLiteralExpression(map.expression.expression)) {
        return map.expression.expression.elements.flatMap(item => ts.isStringLiteralLike(item) ? [item.text] : [])
      }
      break
    }
  }
  return []
}
function literalTKeys(tree) {
  const keys = new Set()
  function visit(node) {
    if (ts.isCallExpression(node) && tName(node.expression) && node.arguments.length) {
      for (const key of finiteStrings(node.arguments[0], node)) keys.add(key)
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return [...keys].sort()
}

// These families are exhaustive over finite values accepted by the UI's own
// constants/protocols, not keys inferred from whichever dictionary happens to exist.
const coreIds = [
  'dsh-native-collab-subagent', 'dsh-native-collab-tool-subagent-control',
  'dsh-native-collab-tool-subagent-list-agents', 'dsh-native-collab-agent-team',
  'dsh-native-collab-tool-agent-team', 'dsh-native-collab-tool-subagent',
  'dsh-native-collab-tool-subagent-fork',
]
const corePairKeys = ['subagent', 'control', 'listAgents', 'agentTeam', 'teamTools']
const settingsFields = [
  'modelEnhancement', 'communicationEnhancement', 'nativeModelSelectionCompatibility',
  'runningChildGuidance', 'completedChildContinuation', 'teamRequestLimit',
]
const writeReasons = [
  'saved-pending-restart', 'settings-missing', 'settings-unverified', 'namespace-unverified',
  'revision-missing', 'not-writable', 'settings-unavailable', 'rejected', 'conflict',
  'empty', 'field-rejected',
]
const lifecycleSteps = ['stop', 'backup', 'withdraw', 'verify', 'remove', 'restart']
const bootStates = ['enabled', 'disabled', 'mixed', 'unknown']
const bootOperations = ['enable', 'disable', 'replace', 'clear']
const bootWarnings = [
  'fixed-state-not-history-restore', 'stop-agents-and-restart',
  'remove-only-after-off-and-verification', 'native-features-will-be-enabled',
  'own-profile-preferences-will-be-cleared', 'remove-external-overlay',
]
// fiberPhase is a string from Host inventory; these are the known translated
// phases exercised/defined for this component. Null/absent uses `unknown`.
const runtimePhases = ['active', 'failed', 'pending', 'loading', 'unloading']
const dynamicKeys = [
  ...settingsFields, 'on', 'off', 'unknown', 'unknown-pending',
  ...coreIds.map(id => `row.${id}`),
  ...corePairKeys.map(key => `lifecycleCore.${key}`),
  ...['enabled', 'disabled', 'unknown'],
  ...runtimePhases.map(phase => `phase.${phase}`),
  ...writeReasons.map(reason => `write.${reason}`),
  ...lifecycleSteps.map(step => `lifecycleStep.${step}`),
  ...bootStates.map(state => `boot.state.${state}`),
  ...bootOperations.map(operation => `boot.operation.${operation}`),
  ...bootWarnings.map(warning => `boot.warning.${warning}`),
]
const literalKeys = literalTKeys(emittedTree)
const requiredKeys = [...new Set([...literalKeys, ...dynamicKeys])].sort()

async function emittedLocaleDictionaries() {
  const renderer = elementRenderer()
  const locale = actualLocale('en')
  let dictionaries
  const localeAdapter = {
    register(namespace, value) {
      assert.equal(namespace, 'collabUi')
      dictionaries = value
      return locale.register(namespace, value)
    },
  }
  let spec
  runInNewContext(emittedSource, {
    setTimeout, clearTimeout, document: { activeElement: null },
    window: { __ModuleLoader__: { load(value) { spec = value } } },
  })
  const remote = { collabUi: {
    async status() { return { rows: [] } },
    async bootStatus() { return {} }, async bootPlan() { return {} }, async bootApply() { return {} },
  } }
  const dispose = await spec.factory(clientRequire(renderer.React)).apply(clientContext({
    remote, locale: localeAdapter,
    slots: { inject(_name, register) { register(); return () => {} }, register() { return () => {} } },
  }))
  await dispose()
  renderer.destroy()
  assert.ok(dictionaries, 'emitted client must register its packaged collabUi dictionaries')
  return dictionaries
}

test('RC10 locale coverage: every emitted literal and finite dynamic t key exists in its own language', async t => {
  t.diagnostic(JSON.stringify(localeSourceEvidence))
  assert.ok(literalKeys.length > 0, 'AST scan must discover literal t(...) calls in emitted client')
  const emitted = await emittedLocaleDictionaries()
  for (const language of ['en', 'zh']) {
    const own = flatten(locales[language])
    const bundled = emitted[language]
    assert.ok(bundled, `emitted client has ${language} dictionary`)
    const runtime = actualLocale(language)
    // A fresh official LocaleRuntime has no plugin dictionary. Register only
    // this language, so neither an empty runtime nor English fallback can mask errors.
    runtime.register('collabUi', { [language]: bundled })
    for (const key of requiredKeys) {
      assert.ok(Object.hasOwn(own, key), `${language}.json is missing collabUi.${key}`)
      assert.ok(Object.hasOwn(bundled, key), `emitted ${language} dictionary is missing collabUi.${key}`)
      assert.equal(bundled[key], own[key], `emitted ${language} collabUi.${key} matches source locale`)
      assert.equal(runtime.bind('collabUi')(key), own[key], `${language} LocaleRuntime resolves collabUi.${key} to its own translation`)
      assert.notEqual(runtime.bind('collabUi')(key), key, `${language} LocaleRuntime does not leave collabUi.${key} unresolved`)
    }
  }
})

test('RC10 D8 regression: diagnostic headers and unknown-pending exist in Chinese without English fallback', () => {
  const zh = flatten(locales.zh)
  const runtime = actualLocale('zh')
  runtime.register('collabUi', { zh })
  const missingD8Keys = ['currentState', 'sourceLayer', 'runtimePhase', 'statusRootScope', 'statusReadOnly']
  for (const key of missingD8Keys) {
    assert.ok(Object.hasOwn(zh, key), `zh.json must define collabUi.${key} locally`)
    assert.equal(runtime.bind('collabUi')(key), zh[key], `Chinese LocaleRuntime resolves collabUi.${key} to Chinese`)
  }
  assert.ok(Object.hasOwn(zh, 'unknown-pending'), 'zh.json must define collabUi.unknown-pending')
  assert.equal(runtime.bind('collabUi')('unknown-pending'), zh['unknown-pending'])
})

test('RC10 dynamic-family contract is derived from finite client and boot-switch protocols', async () => {
  const client = await readFile(sourcePath, 'utf8')
  const bootSource = await readFile(join(root, 'packages', 'agent-team', 'src', 'boot-switch.ts'), 'utf8')
  for (const reason of writeReasons) assert.ok(client.includes(`'${reason}'`), `write reason ${reason} remains in the client protocol`)
  for (const warning of bootWarnings) assert.ok(bootSource.includes(`'${warning}'`), `boot warning ${warning} remains in boot-switch protocol`)
  for (const key of ['currentState', 'sourceLayer', 'runtimePhase', 'statusRootScope', 'statusReadOnly']) assert.ok(literalKeys.includes(key), `emitted client directly requests diagnostic key ${key}`)
  for (const expression of [
    "t(field)", "t(row.current ?? 'unknown')", "t(row.sourceLayer ?? 'unknown')",
    "t('row.' + row.id)", "t(`lifecycleCore.${pair.key}`)", "t('phase.' + phase)", "t(`write.${notice.reason}`)",
    "t(`lifecycleStep.${key}`)", "t('boot.state.' + (state?.configured || 'unknown'))",
    "t('boot.operation.' + target.operation)", "t('boot.warning.' + code)",
  ]) assert.ok(client.includes(expression), `dynamic translation family remains used in client: ${expression}`)
  assert.ok(client.includes("phase === null || phase === undefined ? t('unknown')"), 'absent runtime phase uses translated unknown fallback')
  // Boot error codes are server diagnostics rendered raw after a generic translated label;
  // they are not dynamic translation keys and must not be treated as missing locale entries.
  assert.ok(literalKeys.includes('boot.blocked'))
  assert.ok(client.includes("t('boot.blocked') + ': ' + state.error"))
  assert.ok(client.includes("t('boot.blocked') + ': ' + plan.error"))
  assert.ok(!requiredKeys.some(key => key.startsWith('boot.error.')))
})
