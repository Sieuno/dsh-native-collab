// Element-renderer contracts only; no browser, Host, or real Profile.
import test from 'node:test'
import assert from 'node:assert/strict'
import { elementRenderer } from './element-renderer.mjs'
import { clientContext, clientRequire, clientModule, visit as nodes, text } from './browser-fixture.mjs'
import { createLocale } from './locale-fixture.mjs'

const tick = () => new Promise(resolve => setImmediate(resolve))
const SECRET = 'SECRET_TOKEN /private/profile'
const INPUTS = ['switch-communication', 'switch-running-child', 'switch-completed-child', 'switch-model', 'model-selection', 'team-request-limit']
async function fixture(language = 'en', options = {}) {
  const renderer = elementRenderer(), locale = createLocale(language)
  const timers = new Map(); let timerId = 0
  const fakeSetTimeout = (fn, delay) => { const id = ++timerId; timers.set(id, { fn, delay }); return id }
  const fakeClearTimeout = id => timers.delete(id)
  const flushTimers = async () => { page(); const pending = [...timers.values()]; timers.clear(); for (const timer of pending) { assert.equal(timer.delay, 350); timer.fn() }; await settle() }
  const spec = await clientModule({ setTimeout: fakeSetTimeout, clearTimeout: fakeClearTimeout })
  const calls = { writes: [], describes: 0 }
  const serverValue = { ...options.saved }
  let revision = 9
  let releaseWrite
  const fields = ['modelEnhancement', 'communicationEnhancement', 'modelSource', 'nativeModelSelectionCompatibility', 'runningChildGuidance', 'completedChildContinuation', 'teamRequestLimit']
  const schema = options.schema ?? { type: 'object', dict: Object.fromEntries(fields.map(field => [field, field === 'teamRequestLimit' ? { type: 'number' } : field === 'modelSource' ? { type: 'string', enum: ['conversation', 'settings', 'all'] } : { type: 'boolean' }])) }
  let describeFailure = options.describeFailure
  const settings = {
    async describe() {
      calls.describes += 1
      if (options.holdDescribe && !options.release) await new Promise(resolve => { options.release = resolve })
      if (describeFailure === 'flat') return { writable: true, hasDocument: true, namespaces: [] }
      if (describeFailure === 'readonly') return { ok: true, value: { writable: false, hasDocument: true, namespaces: [] } }
      if (describeFailure === 'document') return { ok: true, value: { writable: true, hasDocument: false, namespaces: [] } }
      if (describeFailure === 'slot') return { ok: true, value: { writable: true, hasDocument: true, namespaces: [{ ns: '@sieuno/dsh-native-collab#dsh-native-collab-ui', revision, value: serverValue, schema }] } }
      if (describeFailure === 'throw') throw new Error(SECRET)
      if (describeFailure === 'rejected') return { ok: false, error: { code: 'settings/rejected', message: SECRET } }
      if (describeFailure === 'identity') return { ok: true, value: { writable: true, hasDocument: true, namespaces: [{ ns: 'wrong-namespace', revision, value: serverValue, schema }] } }
      if (describeFailure === 'revision') return { ok: true, value: { writable: true, hasDocument: true, namespaces: [{ ns: 'dsh-native-collab-ui', revision: null, value: serverValue, schema }] } }
      if (describeFailure === 'malformed') return { ok: true, value: { writable: true, hasDocument: true, namespaces: [{ ns: 'dsh-native-collab-ui', revision, value: serverValue, schema: { type: 'object', dict: {} } }] } }
      return { ok: true, value: { writable: !(options.mutateFailure === 'readonly' && calls.describes > 1), hasDocument: true, namespaces: [{ ns: 'dsh-native-collab-ui', revision, value: { ...serverValue }, schema }] } }
    },
    async mutate(namespace, ops, expectedRevision) {
      assert.equal(namespace, 'dsh-native-collab-ui')
      assert.equal(expectedRevision, revision, 'each write uses the latest verified revision')
      calls.writes.push({ ops: structuredClone(ops), revision: expectedRevision })
      if (options.holdFirstWrite && calls.writes.length === 1) await new Promise(resolve => { releaseWrite = resolve })
      if (options.mutateFailure === 'first-conflict' && calls.writes.length === 1) return { ok: false, error: { code: 'settings/conflict', message: SECRET } }
      if (options.mutateFailure === 'conflict') return { ok: false, error: { code: 'settings/conflict', message: SECRET } }
      if (options.mutateFailure === 'rejected') return { ok: false, error: { code: 'settings/rejected', message: SECRET } }
      if (options.mutateFailure === 'object-message') return { ok: false, error: { code: 'settings/rejected', message: '[object Object]' } }
      if (options.mutateFailure === 'flat') return { wrote: true }
      for (const op of ops) serverValue[op.path[0]] = op.value
      revision += 1
      if (options.mutateFailure === 'readback') serverValue[ops[0].path[0]] = 'unexpected'
      return { ok: true, value: true }
    },
  }
  const remote = { settings, collabUi: { async status() { return {
    profileName: 'test', hmrEnabled: null, rows: [], desired: 'unchanged', pendingRestart: 'unknown', writeSupport: 'unsupported', operationError: 'transaction-unavailable', error: null,
    assembly: options.assembly ? { present: true, ...options.assembly } : null,
  } } } }
  const registrations = []
  const dispose = await spec.factory(clientRequire(renderer.React)).apply(clientContext({ remote,
    locale: { register: (...args) => locale.register(...args) },
    slots: { inject(_name, register) { register() }, register(contract, Component) { registrations.push({ contract, Component }); return () => {} } },
  }))
  const row = registrations.find(entry => entry.contract.name === 'plugins.row.config')
  const props = { view: 'page', t: locale.bind('collabUi'), form: options.form, ...row.contract.inject() }
  const page = () => renderer.draw(row.Component, props)
  const byId = id => { const node = nodes(page(), item => item.props?.['data-testid'] === id)[0]; assert.ok(node, `Missing ${id}`); return node }
  const input = (id, value, property = 'checked') => byId(id).props.onChange({ target: { [property]: value } })
  page(); await settle(); page()
  return { page, byId, input, calls, serverValue, locale, props, flushTimers, releaseWrite() { assert.equal(typeof releaseWrite, 'function'); releaseWrite() }, setDescribeFailure(value) { describeFailure = value },
    async dispose() { renderer.destroy(); await dispose() } }
}
async function settle() { for (let i = 0; i < 8; i += 1) await tick() }
function fieldErrors(f) { return nodes(f.page(), node => node.props?.['data-field-error']) }

test('settings autosave exposes exactly three localized model-source choices and migrates legacy values conservatively', async () => {
  for (const language of ['en', 'zh']) {
    const f = await fixture(language, { saved: { nativeModelSelectionCompatibility: false } })
    try {
      const select = f.byId('model-selection')
      assert.equal(select.props.value, 'settings')
      assert.deepEqual(nodes(select, item => item.type === 'option').map(item => [item.props.value, text(item)]), [
        ['conversation', f.props.t('modelSourceConversation')], ['settings', f.props.t('modelSourceSettings')], ['all', f.props.t('modelSourceAll')],
      ])
      f.input('model-selection', 'all', 'value'); await settle()
      assert.deepEqual(f.calls.writes[0].ops, [{ op: 'set', path: ['modelSource'], value: 'all' }])
      assert.equal(f.serverValue.modelSource, 'all')
      assert.equal(nodes(f.page(), node => /^save-(?:communication|model|quota)$/.test(node.props?.['data-testid'] ?? '')).length, 0)
    } finally { await f.dispose() }
  }
  const f = await fixture('en', { saved: { nativeModelSelectionCompatibility: true } })
  try { assert.equal(f.byId('model-selection').props.value, 'conversation') } finally { await f.dispose() }
})

test('checkbox and select changes autosave one field each with serialized fresh revisions', async () => {
  const f = await fixture()
  try {
    f.input('switch-communication', true)
    f.input('switch-model', true)
    f.input('model-selection', 'settings', 'value')
    await settle()
    assert.deepEqual(f.calls.writes.map(row => [row.revision, row.ops]), [
      [9, [{ op: 'set', path: ['communicationEnhancement'], value: true }]],
      [10, [{ op: 'set', path: ['modelEnhancement'], value: true }]],
      [11, [{ op: 'set', path: ['modelSource'], value: 'settings' }]],
    ])
    assert.equal(f.serverValue.modelSource, 'settings')
  } finally { await f.dispose() }
})

for (const failure of [undefined, 'first-conflict']) {
  test(`an old in-flight ${failure ?? 'success'} cannot discard newer values or stop queued fields`, async () => {
    const f = await fixture('en', { holdFirstWrite: true, mutateFailure: failure })
    try {
      f.input('switch-model', true); await settle()
      assert.equal(f.calls.writes.length, 1)
      f.input('switch-model', false)
      f.input('model-selection', 'all', 'value'); await settle()
      assert.equal(f.calls.writes.length, 1, 'no concurrent namespace mutation')
      assert.equal(f.byId('switch-model').props.checked, false)
      f.releaseWrite(); await settle()
      assert.equal(f.calls.writes.length, 3)
      assert.equal(f.serverValue.modelEnhancement, false)
      assert.equal(f.serverValue.modelSource, 'all')
      assert.equal(f.byId('model-selection').props.value, 'all', 'read-back enum is retained')
      assert.equal(fieldErrors(f).length, 0, 'superseded failure is not shown for the new value')
      assert.deepEqual(f.calls.writes.map(row => row.revision), failure ? [9, 9, 10] : [9, 10, 11])
    } finally { await f.dispose() }
  })
}

test('quota invalid values show field error without write; valid safe integer writes only after controlled debounce', async () => {
  const f = await fixture()
  try {
    for (const value of ['', '0', '-1', '1.5', '1e999', '9007199254740992', 'abc']) {
      f.input('team-request-limit', value, 'value')
      assert.equal(f.calls.writes.length, 0)
      assert.equal(f.byId('quota-validation').props['data-field-error'], 'teamRequestLimit')
    }
    f.input('team-request-limit', '48', 'value')
    await settle()
    assert.equal(f.calls.writes.length, 0, 'pending debounce is not a saved write')
    await f.flushTimers()
    assert.deepEqual(f.calls.writes[0].ops, [{ op: 'set', path: ['teamRequestLimit'], value: 48 }])
  } finally { await f.dispose() }
})

test('clearing a quota cancels an unsent debounced value behind another pending write', async () => {
  const f = await fixture('en', { holdFirstWrite: true })
  try {
    f.input('switch-model', true); await settle()
    f.input('team-request-limit', '48', 'value'); f.page(); await f.flushTimers()
    assert.equal(f.calls.writes.length, 1)
    f.input('team-request-limit', '', 'value'); f.page()
    f.releaseWrite(); await settle()
    assert.equal(f.calls.writes.length, 1, 'the canceled quota must not be written later')
    assert.equal(f.serverValue.teamRequestLimit, undefined)
    assert.equal(f.byId('quota-validation').props['data-field-error'], 'teamRequestLimit')
  } finally { await f.dispose() }
})

for (const failure of ['conflict', 'readonly', 'malformed', 'rejected', 'object-message', 'flat', 'readback']) {
  test(`field autosave failure remains local, retains draft, and never leaks host details: ${failure}`, async () => {
    const f = await fixture('en', { mutateFailure: failure })
    try {
      if (failure === 'malformed') f.setDescribeFailure('malformed')
      f.input('switch-model', true); await settle()
      const errors = fieldErrors(f)
      assert.ok(errors.some(node => node.props['data-field-error'] === 'modelEnhancement'))
      assert.equal(f.byId('switch-model').props.checked, true)
      assert.doesNotMatch(JSON.stringify(f.page()), /SECRET_TOKEN|\/private\/profile|\[object Object\]/)
      assert.equal(f.page().props?.['data-testid'] === 'pending-state', false)
      assert.equal(f.calls.writes.length, failure === 'readonly' || failure === 'malformed' ? 0 : 1)
    } finally { await f.dispose() }
  })
}

test('serialized Settings schemas follow references and enum unions while saving each field through RemoteResult', async () => {
  const schema = { uid: 'root', refs: {
    root: { type: 'object', dict: {
      modelEnhancement: 'a', communicationEnhancement: 'b', modelSource: 'model-source',
      nativeModelSelectionCompatibility: 'g', runningChildGuidance: 'd', completedChildContinuation: 'e', teamRequestLimit: 'f',
    } },
    a: { type: 'boolean', meta: { volatile: true } }, b: { type: 'boolean', meta: { volatile: true } },
    g: { type: 'boolean', meta: { volatile: true } },
    'model-source': { type: 'union', list: ['conversation', 'settings', 'all'] },
    conversation: { type: 'const', value: 'conversation' }, settings: { type: 'const', value: 'settings' }, all: { type: 'const', value: 'all' },
    d: { type: 'boolean' }, e: { type: 'boolean' }, f: { type: 'number' },
  } }
  const f = await fixture('en', { schema, saved: { communicationEnhancement: true } })
  try {
    assert.equal(f.byId('switch-communication').props.disabled, false)
    f.input('switch-communication', false); await settle()
    f.input('model-selection', 'all', 'value'); await settle()
    f.input('team-request-limit', '48', 'value'); await f.flushTimers()
    assert.deepEqual(f.calls.writes.map(row => row.ops), [
      [{ op: 'set', path: ['communicationEnhancement'], value: false }],
      [{ op: 'set', path: ['modelSource'], value: 'all' }],
      [{ op: 'set', path: ['teamRequestLimit'], value: 48 }],
    ])
    assert.equal(fieldErrors(f).length, 0)
  } finally { await f.dispose() }
})

test('unknown/unready settings identity, schema, revision, and refresh failures never become writes or success', async () => {
  for (const describeFailure of ['throw', 'rejected', 'flat', 'readonly', 'document', 'identity', 'slot', 'revision', 'malformed']) {
    const f = await fixture('en', { describeFailure, form: {
      state: { status: 'ready', revision: 3, writable: true, value: {} },
      async mutate() { assert.fail('unverified namespace must not fall back to a row form') },
    } })
    try {
      assert.equal(f.byId('switch-model').props.disabled, true)
      assert.equal(f.calls.writes.length, 0)
      assert.doesNotMatch(JSON.stringify(f.page()), /SECRET_TOKEN|\/private\/profile|\[object Object\]/)
    } finally { await f.dispose() }
  }
})
