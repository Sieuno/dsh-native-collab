import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { createLocale, localeSourceEvidence } from './locale-fixture.mjs'
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
const sourceSource = await readFile(sourcePath, 'utf8')
const sourceTree = ts.createSourceFile(sourcePath, sourceSource, ts.ScriptTarget.Latest, true)
const emittedSource = await readFile(emittedPath, 'utf8')

// emit-dist.mjs substitutes only these two build-time constants. Comparing the
// remaining skeleton tells us whether the checked-in bundle already carries the
// current source client and its locale dictionaries; a stale bundle is reported
// instead of failing on copy that the next `npm run build` refreshes.
function bundleSkeleton(text) {
  return text.split('\n').filter(line => !/^const (?:UI_LOCALES|ASSEMBLY_LAYOUT) = /.test(line)).join('\n')
}
const emittedFresh = bundleSkeleton(sourceSource) === bundleSkeleton(emittedSource)

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
const corePairKeys = ['subagent', 'agentTeam', 'teamTools']
const settingsFields = [
  'modelEnhancement', 'communicationEnhancement', 'modelSource', 'nativeModelSelectionCompatibility',
  'runningChildGuidance', 'completedChildContinuation', 'teamRequestLimit',
]
const writeReasons = [
  'write-unconfirmed',
  'saved-pending-restart', 'settings-missing', 'settings-unverified', 'namespace-unverified',
  'revision-missing', 'not-writable', 'settings-unavailable', 'rejected', 'conflict',
  'empty', 'field-rejected', 'refreshed',
  'refresh-failed', 'status-refresh-failed',
]
// fiberPhase is a string from Host inventory; these are the known translated
// phases exercised/defined for this component. Null/absent uses `unknown`.
const runtimePhases = ['active', 'failed', 'pending', 'loading', 'unloading', 'not-requested', 'ready', 'disposing', 'disposed']
const dynamicKeys = [
  ...settingsFields, 'modelSourceConversation', 'modelSourceSettings', 'modelSourceAll', 'autoSaving', 'autoSaved', 'autoSaveFailed', 'autoSaveDescription', 'on', 'off', 'unknown', 'unknown-pending',
  ...coreIds.map(id => `row.${id}`),
  ...corePairKeys.map(key => `lifecycleCore.${key}`),
  ...['enabled', 'disabled', 'unknown'],
  ...runtimePhases.map(phase => `phase.${phase}`),
  ...['native', 'managed', 'legacy-mixed', 'unknown', 'failed', 'loading'].map(state => `runtime.${state}`),
  ...runtimePhases.map(phase => `runtime.phase.${phase}`),
  ...['subagent', 'agent-team', 'team-tools'].map(role => `runtime.role.${role}`),
  ...['title', 'details', 'nativeNote'].map(key => `runtime.${key}`),
  'technicalDetails',
  ...writeReasons.map(reason => `write.${reason}`),
]
const literalKeys = literalTKeys(sourceTree)
const requiredKeys = [...new Set([...literalKeys, ...dynamicKeys])].sort()

async function emittedLocaleDictionaries() {
  const renderer = elementRenderer()
  const locale = createLocale('en')
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
  const remote = { collabUi: { async status() { return { rows: [] } } } }
  const dispose = await spec.factory(clientRequire(renderer.React)).apply(clientContext({
    remote, locale: localeAdapter,
    slots: { inject(_name, register) { register(); return () => {} }, register() { return () => {} } },
  }))
  await dispose()
  renderer.destroy()
  assert.ok(dictionaries, 'emitted client must register its packaged collabUi dictionaries')
  return dictionaries
}

test('locale coverage: every client literal and finite dynamic t key exists in its own language', async t => {
  t.diagnostic(JSON.stringify(localeSourceEvidence))
  assert.ok(literalKeys.length > 0, 'AST scan must discover literal t(...) calls in the client source')
  const emitted = emittedFresh ? await emittedLocaleDictionaries() : null
  if (!emitted) t.diagnostic('dist/client.js predates the current client/locale; bundled-dictionary equality is verified after the next build')
  for (const language of ['en', 'zh']) {
    const own = flatten(locales[language])
    const runtime = createLocale(language)
    // A fresh locale contract has no plugin dictionary. Register only
    // this language, so neither an empty runtime nor English fallback can mask errors.
    runtime.register('collabUi', { [language]: own })
    for (const key of requiredKeys) {
      assert.ok(Object.hasOwn(own, key), `${language}.json is missing collabUi.${key}`)
      assert.equal(runtime.bind('collabUi')(key), own[key], `${language} LocaleRuntime resolves collabUi.${key} to its own translation`)
      assert.notEqual(runtime.bind('collabUi')(key), key, `${language} LocaleRuntime does not leave collabUi.${key} unresolved`)
    }
    if (!emitted) continue
    const bundled = emitted[language]
    assert.ok(bundled, `emitted client has ${language} dictionary`)
    for (const key of requiredKeys) {
      assert.ok(Object.hasOwn(bundled, key), `emitted ${language} dictionary is missing collabUi.${key}`)
      assert.equal(bundled[key], own[key], `emitted ${language} collabUi.${key} matches source locale`)
    }
  }
})

test('retired offline boot-switch copy is gone and both dictionaries share one key set', () => {
  const en = flatten(locales.en)
  const zh = flatten(locales.zh)
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort(), 'locale dictionaries expose identical collabUi key sets')
  const retired = /^(?:boot|offline)\.|^(?:maintenanceTitle|setupTitle|setupDescription|setupConfirm|lifecycleRestore|lifecycleNotAuto|lifecycleStep\..*|write\.setup-unavailable)$/
  for (const [language, dictionary] of [['en', en], ['zh', zh]]) {
    const residue = Object.keys(dictionary).filter(key => retired.test(key)).sort()
    assert.deepEqual(residue, [], `${language}.json carries no removed offline boot-switch keys`)
    assert.equal(dictionary['write.setup-unavailable'], undefined)
  }
})

test('D8 regression: diagnostic headers and unknown-pending exist in Chinese without English fallback', () => {
  const zh = flatten(locales.zh)
  const runtime = createLocale('zh')
  runtime.register('collabUi', { zh })
  const missingD8Keys = ['currentState', 'sourceLayer', 'runtimePhase', 'statusRootScope', 'statusReadOnly']
  for (const key of missingD8Keys) {
    assert.ok(Object.hasOwn(zh, key), `zh.json must define collabUi.${key} locally`)
    assert.equal(runtime.bind('collabUi')(key), zh[key], `Chinese LocaleRuntime resolves collabUi.${key} to Chinese`)
  }
  assert.ok(Object.hasOwn(zh, 'unknown-pending'), 'zh.json must define collabUi.unknown-pending')
  assert.equal(runtime.bind('collabUi')('unknown-pending'), zh['unknown-pending'])
})

test('dynamic-family contract is derived from finite client protocols', async () => {
  const client = sourceSource
  for (const reason of writeReasons) assert.ok(client.includes(`'${reason}'`), `write reason ${reason} remains in the client protocol`)
  for (const key of ['currentState', 'sourceLayer', 'runtimePhase', 'statusRootScope', 'statusReadOnly']) assert.ok(literalKeys.includes(key), `client directly requests diagnostic key ${key}`)
  for (const key of ['diagnosis.remote-unavailable', 'diagnosis.unknown']) assert.ok(literalKeys.includes(key), `client localizes its own diagnostic ${key}`)
  for (const expression of [
    "t(field)", "t(row.current ?? 'unknown')", "t(row.sourceLayer ?? 'unknown')",
    "t('row.' + row.id)", "t(`lifecycleCore.${pair.key}`)", "t('phase.' + phase)", "t('write.' + notice.reason)",
    "t('write.' + fieldErrors[field])", 
  ]) assert.ok(client.includes(expression), `dynamic translation family remains used in client: ${expression}`)
  assert.ok(client.includes("phase === null || phase === undefined ? t('unknown')"), 'absent runtime phase uses translated unknown fallback')
  // Table headers and the diagnostic fallback are still resolved through a value.
  assert.ok(client.includes('t(key)'))
  assert.ok(client.includes("h('details', { key: 'details' }"))
})
