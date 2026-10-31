/**
 * Remote contract. Official execution source is disclosed by
 * tests/official-client-fixture.mjs: installed DSH 0.2.1-rc.2
 * app.asar @deepseek-ai/dsh-api-gateway/lib/client.node.js $mount, which calls
 * validateContribution before registry register. This is not a fake mount.
 */
import assert from 'node:assert/strict'
import { clientModule, clientRequire, visit, text } from './browser-fixture.mjs'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import { loadOfficialClient, offlineConnection, OFFICIAL_SOURCE } from './official-client-fixture.mjs'

const React = {
  Fragment: 'fragment',
  useState: initial => [initial, () => {}],
  useEffect: () => {},
  createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
}

async function loadPlugin() {
  return (await clientModule()).factory(clientRequire(React))
}

function sameData(actual, expected) {
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)))
}

function harness() {
  const disposed = []
  const specs = []
  const locale = { unregistered: false }
  return {
    disposed,
    specs,
    locale,
    slots: {
      inject(_name, register) { const dispose = register(); disposed.push(dispose); return dispose },
      register(spec, Component) {
        spec.Component = Component
        specs.push(spec)
        return () => { spec.disposed = true }
      },
    },
    localeApi: {
      register(namespace, dictionaries) {
        locale.namespace = namespace
        locale.dictionaries = dictionaries
        return () => { locale.unregistered = true }
      },
    },
  }
}

function row(id = 'dsh-native-collab-agent-team') {
  return {
    id,
    moduleName: '@sieuno/dsh-native-collab/agent-team',
    current: 'enabled',
    sourceLayer: 'unknown',
    runtimePhase: null,
  }
}

function statusWire() {
  return {
    profileName: 'local',
    hmrEnabled: false,
    rows: [row()],
    desired: 'unchanged',
    pendingRestart: 'unknown',
    writeSupport: 'unsupported',
    operationError: 'transaction-unavailable',
    error: null,
    assembly: { present: true, modelEnhancement: false, teamRequestLimit: 32 },
    runtime: { mode: 'managed', phase: 'ready', services: ['subagent', 'agent-team', 'team-tools'].map(role => ({ role, phase: 'ready', failure: null })) },
    diagnosis: 'managed',
  }
}

async function officialRoot(calls, respond) {
  const official = await loadOfficialClient()
  const ctx = new Context()
  ctx.provide('loader', { await: () => Promise.resolve() })
  ctx.provide('connection', offlineConnection(calls, respond))
  await ctx.plugin(official.TypertRegistry)
  await ctx.plugin({ inject: official.inject, apply: official.apply })
  return ctx
}

test('official ClientRemote.$mount accepts the strict contribution and decodes status without a legacy preview binding', async t => {
  const official = await loadOfficialClient()
  for (const [path, digest] of Object.entries(official.hashes)) t.diagnostic(`${path} sha256 ${digest}`)
  assert.match(OFFICIAL_SOURCE, /dsh-api-gateway@0\.2\.1-rc\.2 lib\/client\.node\.js/)
  const calls = []
  const wires = { status: statusWire() }
  const ctx = await officialRoot(calls, () => ({
    ok: true,
    value: wires.status,
  }))
  await assert.rejects(
    () => ctx.remote.$mount({
      package: '@dsh-native-collab/probe',
      services: [{ namespace: 'probe' }],
      descriptors: [{
        id: 'probe#status', service: 'probe', namespace: 'probe', method: 'status',
        invocation: { kind: 'direct' },
        parameters: [{ name: 'action', wire: 'action', source: 'json', codec: { mode: 'src-json' } }],
        result: { mode: 'src-json' },
      }],
    }),
    /client api: generated Remote probe\/status field "action" has no strict codec/,
  )
  const plugin = await loadPlugin()
  const ui = harness()
  const app = {
    get remote() { return ctx.remote },
    get: name => ctx.get(name),
    slots: ui.slots,
    locale: ui.localeApi,
  }
  const dispose = await plugin.apply(app)
  assert.equal(typeof dispose, 'function')
  const statusDescriptor = ctx.typert.remotes.get('collabUi/status')
  assert.equal(ctx.typert.remotes.get('collabUi/preview'), undefined, 'no browser legacy preview descriptor')
  assert.equal(statusDescriptor.result.mode, 'strict')
  assert.equal(typeof statusDescriptor.result.decode, 'function')
  assert.equal(ui.specs.length, 4)
  const page = ui.specs.find(spec => spec.name === 'plugins.bundle.config')
  const props = page.inject()
  const decodedStatus = await props.readStatus()
  assert.notEqual(decodedStatus, wires.status)
  sameData(decodedStatus, {
    profileName: 'local', hmrEnabled: false, rows: [row()], desired: 'unchanged', pendingRestart: 'unknown',
    writeSupport: 'unsupported', operationError: 'transaction-unavailable', error: null,
    assembly: { present: true, modelEnhancement: false, teamRequestLimit: 32 },
    runtime: { mode: 'managed', phase: 'ready', services: ['subagent', 'agent-team', 'team-tools'].map(role => ({ role, phase: 'ready', failure: null })) }, diagnosis: 'managed',
  })
  assert.equal(calls.at(-1).path, '/api')
  assert.equal(calls.at(-1).endpoint, 'collabUi/status')
  assert.deepEqual({ ...calls.at(-1).args }, {})
  const legacyStatus = statusDescriptor.result.decode({ ...statusWire(), runtime: null, diagnosis: undefined })
  assert.equal(legacyStatus.runtime, null, 'older servers may omit runtime metadata or send null')
  assert.equal(legacyStatus.diagnosis, 'unknown')
  assert.throws(() => statusDescriptor.result.decode({ ...statusWire(), runtime: { ...statusWire().runtime, extra: true } }), /unexpected field/)
  const duplicateRoles = statusWire().runtime.services.map(item => ({ ...item })); duplicateRoles[2].role = duplicateRoles[0].role
  assert.throws(() => statusDescriptor.result.decode({ ...statusWire(), runtime: { ...statusWire().runtime, services: duplicateRoles } }), /invalid managed runtime role state/)
  for (const method of ['bootStatus', 'bootPlan', 'bootApply']) {
    assert.equal(ctx.typert.remotes.get('collabUi/' + method), undefined, `removed boot endpoint ${method} is not mounted`)
  }
  const failing = []
  const failCtx = await officialRoot(failing, () => ({ ok: true, value: { ...statusWire(), unexpected: true } }))
  const failUi = harness()
  const failDispose = await plugin.apply({
    get remote() { return failCtx.remote },
    get: name => failCtx.get(name),
    slots: failUi.slots,
    locale: failUi.localeApi,
  })
  const failPage = failUi.specs.find(spec => spec.name === 'plugins.bundle.config')
  await assert.rejects(() => failPage.inject().readStatus(), /Remote request failed|unexpected field/)
  assert.equal(failing.at(-1)?.endpoint, 'collabUi/status')
  await failDispose()
  assert.equal(failCtx.typert.remotes.get('collabUi/status'), undefined)
  await dispose()
  assert.equal(ctx.typert.remotes.get('collabUi/status'), undefined)
  assert.equal(ui.locale.unregistered, true)
  assert.equal(ui.locale.namespace, 'collabUi')
  assert.equal(page.disposed, true)
})

test('fixture-shaped mount forwards status without a remote diagnosis', async () => {
  const plugin = await loadPlugin()
  const ui = harness()
  const remote = {
    settings: { describe() { return { ok: true, value: {} } }, mutate() { return { ok: true, value: true } } },
    async $mount(contribution) {
      assert.deepEqual(Array.from(contribution.services, item => item.namespace), ['collabUi'])
      assert.deepEqual(Array.from(contribution.descriptors, item => item.method), ['status', 'limits', 'saveLimits'])
      remote.collabUi = {
        async status() { return { ok: true, value: { rows: [] } } },
      }
      return async () => { delete remote.collabUi }
    },
  }
  const dispose = await plugin.apply({
    remote,
    slots: ui.slots,
    locale: ui.localeApi,
    get() { throw new Error('fixture path must not use Cordis get') },
  })
  const bundle = ui.specs.find(spec => spec.name === 'plugins.bundle.config')
  const props = bundle.inject()
  assert.equal(props.remoteMountError, null)
  assert.deepEqual(await props.readStatus(), { rows: [] })
  assert.equal('boot' in props, false, 'no boot switch API is injected')
  const tree = bundle.Component({ view: 'page', t: key => key, ...props })
  assert.equal(visit(tree, node => node.props?.key === 'diagnosis').length, 0)
  await dispose()
  assert.equal(ui.locale.unregistered, true)
  assert.equal(bundle.disposed, true)
  assert.equal(remote.collabUi, undefined)
})

test('injected Remote mount failure does not reject apply and stays visible', async () => {
  const plugin = await loadPlugin()
  const ui = harness()
  let sent = false
  const failure = new Error('client api: generated Remote collabUi/status field "action" has no strict codec')
  const remote = {
    settings: {},
    async $mount() { throw failure },
    collabUi: {
      async status() { sent = true; return { ok: true, value: {} } },
    },
  }
  const dispose = await plugin.apply({ remote, slots: ui.slots, locale: ui.localeApi })
  assert.equal(typeof dispose, 'function')
  assert.equal(ui.specs.length, 4)
  const bundle = ui.specs.find(spec => spec.name === 'plugins.bundle.config')
  const props = bundle.inject()
  assert.equal(props.remoteMountError, failure)
  await assert.rejects(() => props.readStatus(), error => error === failure)
  assert.equal(sent, false)
  const tree = bundle.Component({ view: 'page', t: key => key, ...props })
  const alerts = visit(tree, node => node.props?.key === 'diagnosis')
  assert.equal(alerts.length, 1)
  assert.equal(alerts[0].props.code, 'remote-unavailable')
  const notice = alerts[0].type(alerts[0].props)
  assert.equal(notice.props['data-testid'], 'operation-error')
  assert.equal(text(notice).includes(failure.message), false, 'raw host exceptions are not shown')
  await dispose()
  assert.equal(ui.locale.unregistered, true)
  assert.equal(bundle.disposed, true)
  assert.equal(ui.locale.namespace, 'collabUi')
})

test('slot registration failure still unmounts and rethrows', async () => {
  const plugin = await loadPlugin()
  let unmounted = false
  const remote = {
    async $mount() { return async () => { unmounted = true } },
  }
  const locale = { unregistered: false }
  await assert.rejects(() => plugin.apply({
    remote,
    locale: { register() { return () => { locale.unregistered = true } } },
    slots: {
      inject() { throw new Error('slot failed') },
      register() { throw new Error('register should not run') },
    },
  }), /slot failed/)
  assert.equal(unmounted, true)
  assert.equal(locale.unregistered, true)
})

