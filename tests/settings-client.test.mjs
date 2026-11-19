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
  let factory, nextTimer = 0
  const timers = new Map()
  vm.runInNewContext(readFileSync('dist/client.js', 'utf8'), {
    setTimeout(callback, delay) { assert.equal(delay, 350); timers.set(++nextTimer, callback); return nextTimer },
    clearTimeout(timer) { timers.delete(timer) },
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
  const controls = () => registration.component(props()).props.children[0].props.children
  return { native, face, writes, controls, dictionaries, scope,
    advanceRevision() { revision++; for (const listener of listeners) listener() },
    flushNumber: async () => {
      for (const [id, callback] of timers) { timers.delete(id); void callback() }
      await settled()
    },
    state: () => face.hooks.nativeCollabForm.getSnapshot(),
    markup: language => renderToStaticMarkup(React.createElement(registration.component, props(language))),
    withdraw() { served = false; for (const listener of listeners) listener(); withdraw() },
    registered: () => registration,
  }
}

const settled = () => new Promise(resolve => setImmediate(resolve))

test('bundle settings default to the official model policy and keep the wait tool enabled', async t => {
  const b = await bench(t)
  assert.equal(b.registered().options.key, '@sieuno/dsh-native-collab')
  assert.deepEqual(Object.keys(b.dictionaries.zh).sort(), Object.keys(b.dictionaries.en).sort())
  for (const language of ['zh', 'en']) {
    const html = b.markup(language)
    assert.match(html, /<select[^>]*id="native-collab-modelSource"/)
    assert.match(html, /id="native-collab-teamRequestLimit"/)
    assert.equal((html.match(/role="switch"/g) ?? []).length, 1)
    assert.match(html, /role="switch" aria-checked="false"/)
    assert.equal((html.match(/<option /g) ?? []).length, 3)
    assert.match(html, /value="conversation" selected=""/)
    assert.doesNotMatch(html, /Automatic \(default|自动（|native-collab-modelEnhancement|native-collab-delegationGuidance|native-collab-communicationEnhancement/)
    assert.match(html, /value="all"/)
    assert.match(html, /value="32"/)
    assert.doesNotMatch(html, /<button[^>]*>(?:Save|保存)<\/button>/)
    assert.equal(b.face.save, undefined)
  }
  b.withdraw()
  assert.equal(b.registered(), undefined)
  assert.equal(b.state().available, false)
})

test('model and limit controls autosave through the native Loader and affect subsequent calls', async t => {
  const b = await bench(t)
  const uid = b.native.entry.fiber.uid
  const controls = b.controls()
  controls[0].props.children[0].props.children[1].props.onChange({ target: { value: 'all' } })
  await settled()
  assert.equal(b.writes.length, 1)
  assert.equal(b.native.entry.options.config.modelSource, 'all')
  controls[1].props.onEdit('1')
  controls[1].props.onEdit('2')
  assert.equal(b.writes.length, 1)
  await b.flushNumber()
  assert.equal(b.writes.length, 2)
  assert.equal(b.state().failed, false)
  assert.equal(b.state().dirty, false)
  assert.equal(b.native.entry.fiber.uid, uid)
  assert.equal(b.native.entry.options.config.modelSource, 'all')
  assert.equal(b.native.entry.options.config.teamRequestLimit, 2)
  assert.equal((await b.native.call('subagent', { description: 'Test', prompt: 'Test', provider: 'mock', model: 'extra' })).isError, false)
  for (let i = 0; i < 2; i++) assert.equal((await b.native.call('send_message', { agent: 'child', message: 'test' })).isError, false)
  assert.equal((await b.native.call('send_message', { agent: 'child', message: 'limit' })).isError, true)
  b.face.resetField('teamRequestLimit')
  await settled()
  assert.equal(b.state().teamRequestLimit.text, '32')
})

test('changing the wait switch immediately revokes prior tool admission and reset restores the default', async t => {
  const b = await bench(t)
  const { ctx, parent, entry } = b.native
  const uid = entry.fiber.uid
  const resolveTools = () => ctx.tools.resolve({ agent: parent, modelSelection: parent.options, signal: new AbortController().signal })
  const before = await resolveTools()
  t.after(() => before.dispose())
  assert.ok(ctx.tools.executable('wait_agent', parent, before))
  b.controls()[2].props.children[0].props.children[1].props.onChange(true)
  assert.equal(b.writes.length, 1)
  await settled()
  assert.equal(entry.fiber.uid, uid)
  assert.equal(entry.options.config.disableWaitAgent, true)
  assert.match(b.markup('en'), /role="switch" aria-checked="true"/)
  assert.ok(ctx.tools.get('wait_agent', parent))
  assert.equal(ctx.tools.executable('wait_agent', parent), undefined)
  assert.equal(ctx.tools.executable('wait_agent', parent, before), undefined)
  const disabled = await resolveTools()
  t.after(() => disabled.dispose())
  assert.ok(!ctx.tools.schemas(parent, disabled).some(tool => tool.name === 'wait_agent'))
  assert.ok(ctx.tools.executable('send_message', parent, disabled))
  b.face.resetField('disableWaitAgent'); await settled()
  assert.match(b.markup('en'), /role="switch" aria-checked="false"/)
  assert.ok(ctx.tools.executable('wait_agent', parent))
})

test('an invalid limit never writes and does not block another setting', async t => {
  const b = await bench(t)
  for (const value of ['0', '-1', '1.5', '9007199254740992', 'no', '']) {
    b.face.edit('teamRequestLimit', value); await b.flushNumber()
    assert.equal(b.state().teamRequestLimit.invalid, true)
    assert.equal(b.writes.length, 0)
  }
  b.face.edit('disableWaitAgent', 'true'); await settled()
  assert.equal(b.native.entry.options.config.disableWaitAgent, true)
  b.face.edit('teamRequestLimit', '9'); await b.flushNumber()
  assert.equal(b.native.entry.options.config.teamRequestLimit, 9)
})

test('read-only forms never write', async t => {
  const b = await bench(t, { writable: false })
  assert.match(b.markup('en'), /These settings are read-only/)
  b.face.edit('modelSource', 'all'); await settled()
  assert.equal(b.writes.length, 0)
})

test('rejected autosaves restore the accepted settings and explain the failure', async t => {
  const b = await bench(t, { reject: true })
  b.face.edit('teamRequestLimit', '9'); await b.flushNumber()
  assert.equal(b.writes.length, 1)
  assert.equal(b.state().failed, true)
  assert.match(b.markup('en'), /Could not save automatically/)
  assert.equal(b.state().teamRequestLimit.text, '32')
  assert.equal(b.native.entry.options.config.teamRequestLimit, undefined)
})

test('a debounced limit does not overwrite a newer document revision or write after withdrawal', async t => {
  const b = await bench(t)
  b.face.edit('teamRequestLimit', '9')
  b.advanceRevision()
  await b.flushNumber()
  assert.equal(b.writes.length, 0)
  assert.equal(b.state().failed, true)
  assert.equal(b.state().teamRequestLimit.text, '32')
  b.face.edit('teamRequestLimit', '8')
  b.withdraw()
  await b.flushNumber()
  assert.equal(b.writes.length, 0)
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
    await settled()
    assert.equal(b.state().modelSource.text, 'all')
    assert.equal(b.state().failed, false)
    assert.equal((await b.native.call('subagent', { description: 'Test', prompt: 'Test', provider: 'mock', model: 'extra' })).isError, false)
    b.face.resetField('modelSource'); await settled()
    assert.equal(b.state().modelSource.text, 'conversation')
    assert.equal(b.state().modelSource.overridden, false)
    assert.equal(b.native.entry.options.config.modelSource, undefined)
    assert.equal((await b.native.call('subagent', { description: 'Test', prompt: 'Test', provider: 'mock', model: 'extra' })).isError, true)
  }
})
