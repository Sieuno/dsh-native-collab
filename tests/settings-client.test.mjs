import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire, registerHooks } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import { fixture } from './native-fixture.mjs'

const sdk = createRequire(resolve(process.env.DSH_NATIVE_SDK ?? '.github/sdk/native', 'package.json'))
const browserImports = Object.fromEntries(['react', 'react/jsx-runtime', 'react-dom/server', 'clsx'].map(name => [name, pathToFileURL(sdk.resolve(name)).href]))
// Read the published SDK's actual form implementations without importing its
// unrelated markdown/highlighter components. CSS is not tested by Node rendering.
registerHooks({
  resolve(specifier, context, next) {
    if (Object.hasOwn(browserImports, specifier)) return { url: browserImports[specifier], shortCircuit: true }
    return next(specifier, context)
  },
  load(url, context, next) {
    if (url.endsWith('.css')) return { format: 'module', source: 'export default new Proxy({}, { get: (_, key) => String(key) })', shortCircuit: true }
    if (/\.(tsx|ts)$/.test(url)) return { format: 'module', source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
      fileName: fileURLToPath(url), compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    }).outputText, shortCircuit: true }
    return next(url, context)
  },
})
const primitivesRoot = dirname(sdk.resolve('@deepseek-ai/dsh-client-ui-primitives/package.json'))
const source = path => import(pathToFileURL(resolve(primitivesRoot, 'src', path)).href)
const primitives = {
  ...(await source('settings-form/form-model.ts')),
  ...(await source('settings-form/SettingsForm.tsx')),
  ...(await source('settings-form/fields.tsx')),
  ...(await source('Switch.tsx')),
}
const React = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')

async function bench(t, { writable = true, reject = false, config = {} } = {}) {
  const native = await fixture(config, { startup: true })
  t.after(() => native.dispose())
  let revision = 0, user = { ...config }, served = true, registration, dictionaries
  const listeners = new Set(), effects = [], writes = []
  const scope = {
    getSnapshot: () => ({ status: served ? 'ready' : 'unavailable', writable, revision, user, base: {},
      value: Object.fromEntries(Object.entries(native.entry.fiber.effectiveConfig).map(([key, value]) => [key, value?.get ? value.get() : value])) }),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    async mutate(ops, expected) {
      writes.push({ ops, expected })
      if (reject || expected !== revision) return false
      const config = { ...native.entry.options.config }
      for (const op of ops) { if (op.op === 'set') config[op.path[0]] = op.value; else delete config[op.path[0]] }
      await native.entry.update({ config })
      await native.entry.fiber.await()
      user = config; revision++
      for (const listener of listeners) listener()
      return true
    },
  }
  let factory
  vm.runInNewContext(readFileSync('dist/client.js', 'utf8'), {
    window: { __ModuleLoader__: { load(module) { assert.equal(module.id, '@sieuno/dsh-native-collab'); factory = module.factory } } },
  })
  const client = factory(name => {
    if (name === 'react') return React
    if (name === '@deepseek-ai/dsh-client-ui-primitives') return primitives
    throw new Error(`Unexpected client dependency: ${name}`)
  })
  let withdraw
  client.apply({
    effect(effect) { const off = effect(); effects.push(off); return off },
    locale: { register(_namespace, value) { dictionaries = value; return () => {} } },
    configForms: {
      get(ns) { assert.equal(ns, 'dsh-native-collab-ui'); return scope },
      whileServed(namespaces, mount) { assert.deepEqual(Array.from(namespaces), ['dsh-native-collab-ui']); withdraw = mount(); return () => withdraw() },
    },
    slots: {
      inject(name, mount) { assert.equal(name, 'plugins.bundle.config'); return mount() },
      register(options, component) { registration = { options, component }; return () => { registration = undefined } },
    },
  })
  t.after(() => { for (const off of effects.reverse()) off() })
  const face = registration.options.inject()
  const props = (language = 'zh') => ({ ...face, view: 'page', t: key => {
    assert.ok(Object.hasOwn(dictionaries[language], key), `Missing locale key: ${key}`)
    return dictionaries[language][key]
  }, useNativeCollabForm: select => select(face.hooks.nativeCollabForm.getSnapshot()) })
  const controls = () => registration.component(props()).props.children.props.children
  return { native, face, writes, controls, dictionaries, scope,
    state: () => face.hooks.nativeCollabForm.getSnapshot(),
    markup: language => renderToStaticMarkup(React.createElement(registration.component, props(language))),
    withdraw() { served = false; for (const listener of listeners) listener(); withdraw() },
    registered: () => registration,
  }
}

const settled = () => new Promise(resolve => setImmediate(resolve))

test('bundle settings render only model source and message limit with official policy selected by default', async t => {
  const b = await bench(t)
  assert.equal(b.registered().options.key, '@sieuno/dsh-native-collab')
  assert.deepEqual(Object.keys(b.dictionaries.zh).sort(), Object.keys(b.dictionaries.en).sort())
  for (const language of ['zh', 'en']) {
    const html = b.markup(language)
    assert.match(html, /<select[^>]*id="native-collab-modelSource"/)
    assert.match(html, /id="native-collab-teamRequestLimit"/)
    assert.equal((html.match(/role="switch"/g) ?? []).length, 0)
    assert.equal((html.match(/<option /g) ?? []).length, 3)
    assert.match(html, /value="conversation" selected=""/)
    assert.doesNotMatch(html, /Automatic \(default|自动（|native-collab-modelEnhancement|native-collab-delegationGuidance|native-collab-communicationEnhancement/)
    assert.match(html, /value="all"/)
    assert.match(html, /value="32"/)
  }
  b.withdraw()
  assert.equal(b.registered(), undefined)
  assert.equal(b.state().available, false)
})

test('model and limit controls stage edits, save through the native Loader, and affect subsequent calls', async t => {
  const b = await bench(t)
  const uid = b.native.entry.fiber.uid
  const controls = b.controls()
  controls[0].props.children[0].props.children[1].props.onChange({ target: { value: 'all' } })
  controls[1].props.onEdit('2')
  assert.equal(b.writes.length, 0)
  b.face.save()
  await settled()
  await b.native.entry.fiber.await()
  assert.equal(b.state().failed, false)
  assert.equal(b.state().dirty, false)
  assert.equal(b.native.entry.fiber.uid, uid)
  assert.equal(b.native.entry.options.config.modelSource, 'all')
  assert.equal(b.native.entry.options.config.teamRequestLimit, 2)
  assert.equal((await b.native.call('subagent', { description: 'Test', prompt: 'Test', provider: 'mock', model: 'extra' })).isError, false)
  for (let i = 0; i < 2; i++) assert.equal((await b.native.call('send_message', { agent: 'child', message: 'test' })).isError, false)
  assert.equal((await b.native.call('send_message', { agent: 'child', message: 'limit' })).isError, true)
  b.face.resetField('teamRequestLimit')
  b.face.save(); await settled()
  assert.equal(b.state().teamRequestLimit.text, '32')
})

test('invalid limits, read-only forms, and rejected saves keep the accepted settings intact', async t => {
  const b = await bench(t, { reject: true })
  for (const value of ['0', '-1', '1.5', '9007199254740992', 'no']) {
    b.face.edit('teamRequestLimit', value); b.face.save(); await settled()
    assert.equal(b.state().invalid, true)
    assert.equal(b.writes.length, 0)
  }
  b.face.edit('teamRequestLimit', '9'); b.face.save(); await settled()
  assert.equal(b.state().failed, true)
  assert.equal(b.state().teamRequestLimit.text, '9')
  assert.equal(b.native.entry.options.config.teamRequestLimit, undefined)
  b.face.discard()
  assert.equal(b.state().teamRequestLimit.text, '32')
  const readOnly = await bench(t, { writable: false })
  assert.match(readOnly.markup('en'), /These settings are read-only/)
  readOnly.face.edit('modelSource', 'all'); readOnly.face.save(); await settled()
  assert.equal(readOnly.writes.length, 0)
})

test('legacy model settings display their effective source and a new selection supersedes the retired switch', async t => {
  for (const [config, expected] of [
    [{ modelEnhancement: false, modelSource: 'all' }, 'conversation'],
    [{ nativeModelSelectionCompatibility: false }, 'settings'],
    [{ modelSource: 'all' }, 'all'],
  ]) {
    const b = await bench(t, { config })
    assert.equal(b.state().modelSource.text, expected)
    assert.match(b.markup('en'), new RegExp(`value="${expected}" selected=""`))
    b.controls()[0].props.children[0].props.children[1].props.onChange({ target: { value: 'all' } })
    b.face.save(); await settled()
    assert.equal(b.state().modelSource.text, 'all')
    assert.equal(b.state().failed, false)
    assert.equal((await b.native.call('subagent', { description: 'Test', prompt: 'Test', provider: 'mock', model: 'extra' })).isError, false)
    b.face.resetField('modelSource'); b.face.save(); await settled()
    assert.equal(b.state().modelSource.text, 'conversation')
    assert.equal(b.state().modelSource.overridden, false)
    assert.equal(b.native.entry.options.config.modelSource, undefined)
    assert.equal((await b.native.call('subagent', { description: 'Test', prompt: 'Test', provider: 'mock', model: 'extra' })).isError, true)
  }
})
