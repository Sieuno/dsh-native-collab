/**
 * RC7 Remote contract. Official execution source is disclosed by
 * tests/rc7-official-client.mjs: installed DSH 0.2.1-rc.2
 * app.asar @deepseek-ai/dsh-api-gateway/lib/client.node.js $mount, which calls
 * validateContribution before registry register. This is not a fake mount.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import { loadOfficialClient, offlineConnection, OFFICIAL_SOURCE } from './rc7-official-client.mjs'

const React = {
  Fragment: 'fragment',
  useState: initial => [initial, () => {}],
  useEffect: () => {},
  createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
}

function loadPlugin() {
  const source = readFileSync(new URL('../dist/client.js', import.meta.url), 'utf8')
  let spec
  runInNewContext(source, { window: { __ModuleLoader__: { load(value) { spec = value } } } }, { filename: 'client.js' })
  return spec.factory(name => {
    if (name === 'react') return React
    if (name === '@deepseek-ai/dsh-client-ui-primitives') return { Button: 'button', Modal: 'modal' }
    throw new Error(`unexpected browser module ${name}`)
  })
}

function visit(node, predicate, found = []) {
  if (Array.isArray(node)) { for (const child of node) visit(child, predicate, found); return found }
  if (!node || typeof node !== 'object') return found
  if (predicate(node)) found.push(node)
  visit(node.children, predicate, found)
  visit(node.props?.children, predicate, found)
  visit(node.props?.footer, predicate, found)
  return found
}

function renderStatus(tree) {
  const status = visit(tree, node => node.props?.key === 'status' && typeof node.type === 'function')[0]
  assert.equal(typeof status?.type, 'function')
  return status.type(status.props)
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
  }
}

function bootPlanWire(action) {
  return {
    action, accepted: false, planId: null, targets: [],
    pendingRestart: 'required', error: 'transaction-unavailable', warnings: [],
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

test('official ClientRemote.$mount accepts the strict contribution and decodes status/bootPlan without a legacy preview binding', async t => {
  const official = await loadOfficialClient()
  for (const [path, digest] of Object.entries(official.hashes)) t.diagnostic(`${path} sha256 ${digest}`)
  assert.match(OFFICIAL_SOURCE, /dsh-api-gateway@0\.2\.1-rc\.2 lib\/client\.node\.js/)
  const calls = []
  const wires = { status: statusWire(), bootPlan: bootPlanWire('enable') }
  const ctx = await officialRoot(calls, (_path, endpoint) => ({
    ok: true,
    value: endpoint === 'collabUi/status' ? wires.status : wires.bootPlan,
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
  const plugin = loadPlugin()
  const ui = harness()
  const app = {
    get remote() { return ctx.remote },
    get: name => ctx.get(name),
    slots: ui.slots,
    locale: ui.localeApi,
  }
  const dispose = await plugin.apply(app)
  assert.equal(typeof dispose, 'function')
  const planDescriptor = ctx.typert.remotes.get('collabUi/bootPlan')
  const statusDescriptor = ctx.typert.remotes.get('collabUi/status')
  assert.equal(ctx.typert.remotes.get('collabUi/preview'), undefined, 'no browser legacy preview descriptor')
  assert.equal(planDescriptor.parameters[0].codec.mode, 'strict')
  assert.equal(typeof planDescriptor.parameters[0].codec.create, 'function')
  assert.equal(planDescriptor.parameters[0].codec.create().parse('enable'), 'enable')
  assert.throws(() => planDescriptor.parameters[0].codec.create().parse('bogus'), /enable" or "restore/)
  assert.equal(typeof planDescriptor.result.decode, 'function')
  assert.equal(statusDescriptor.result.mode, 'strict')
  assert.equal(typeof statusDescriptor.result.decode, 'function')
  assert.equal(ui.specs.length, 5)
  const page = ui.specs.find(spec => spec.name === 'plugins.bundle.config')
  const props = page.inject()
  const decodedStatus = await props.readStatus()
  assert.notEqual(decodedStatus, wires.status)
  sameData(decodedStatus, {
    profileName: 'local', hmrEnabled: false, rows: [row()], desired: 'unchanged', pendingRestart: 'unknown',
    writeSupport: 'unsupported', operationError: 'transaction-unavailable', error: null,
    assembly: { present: true, modelEnhancement: false, teamRequestLimit: 32 },
  })
  assert.equal(calls.at(-1).path, '/api')
  assert.equal(calls.at(-1).endpoint, 'collabUi/status')
  assert.deepEqual({ ...calls.at(-1).args }, {})
  const decodedPlan = await props.boot.plan('enable')
  // bootSchema validates in place; unlike statusSchema it does not promise a clone.
  sameData(decodedPlan, wires.bootPlan)
  assert.equal(decodedPlan.action, 'enable')
  assert.equal(decodedPlan.accepted, false)
  assert.deepEqual({ ...calls.at(-1).args }, { action: 'enable' })
  assert.equal(calls.at(-1).endpoint, 'collabUi/bootPlan')
  const sent = calls.length
  await assert.rejects(() => props.boot.plan('bogus'), /enable" or "restore/)
  assert.equal(calls.length, sent)
  const validPlan = wires.bootPlan
  wires.bootPlan = { ...validPlan, unexpected: true }
  await assert.rejects(() => props.boot.plan('enable'), /Remote request failed|unexpected field/)
  wires.bootPlan = validPlan
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
  await dispose()
  assert.equal(ui.locale.unregistered, true)
  assert.equal(ui.locale.namespace, 'collabUi')
  assert.equal(page.disposed, true)
})

test('master switch Remote descriptors use official strict codecs and send only a validated confirmation token', async () => {
  const calls = [], token = '12345678-1234-1234-1234-123456789abc'
  const target = { scope: 'root', id: 'agent-team', moduleName: '@deepseek-ai/dsh-agent-team', operation: 'enable', previousModule: null }
  const wires = {
    bootStatus: { profileName: 'test', configured: 'mixed', writeSupport: 'available', pendingRestart: 'unknown', error: null },
    bootPlan: { action: 'restore', accepted: false, planId: token, targets: [target], pendingRestart: 'required', error: null, warnings: ['native-features-will-be-enabled'] },
    bootApply: { action: 'restore', accepted: true, pendingRestart: 'required', error: null, configured: 'disabled' },
  }
  const ctx = await officialRoot(calls, (_path, endpoint) => ({ ok: true, value: wires[endpoint.split('/')[1]] }))
  const ui = harness()
  const dispose = await loadPlugin().apply({ get remote() { return ctx.remote }, get: name => ctx.get(name), slots: ui.slots, locale: ui.localeApi })
  const boot = ui.specs.find(spec => spec.name === 'plugins.bundle.config').inject().boot
  sameData(await boot.status(), wires.bootStatus)
  sameData(await boot.plan('restore'), wires.bootPlan)
  assert.deepEqual({ ...calls.at(-1).args }, { action: 'restore' })
  sameData(await boot.apply(token), wires.bootApply)
  assert.equal(calls.at(-1).endpoint, 'collabUi/bootApply')
  assert.deepEqual({ ...calls.at(-1).args }, { planId: token })
  const sent = calls.length
  await assert.rejects(() => boot.apply('../../arbitrary-file'), /confirmation token/)
  await assert.rejects(() => boot.plan('arbitrary-action'), /enable" or "restore/)
  assert.equal(calls.length, sent)
  wires.bootPlan.targets[0].operation = 'arbitrary-operation'
  await assert.rejects(() => boot.plan('restore'), /Remote request failed|boot target operation/)
  for (const method of ['bootStatus', 'bootPlan', 'bootApply']) {
    const descriptor = ctx.typert.remotes.get('collabUi/' + method)
    assert.equal(descriptor.result.mode, 'strict')
    assert.equal(typeof descriptor.result.decode, 'function')
  }
  await dispose()
})

test('fixture-shaped mount keeps buttons, locale, and local action rejection', async () => {
  const plugin = loadPlugin()
  const ui = harness()
  let planArgs
  const remote = {
    settings: { describe() { return { ok: true, value: {} } }, mutate() { return { ok: true, value: true } } },
    async $mount(contribution) {
      assert.deepEqual(Array.from(contribution.services, item => item.namespace), ['collabUi'])
      assert.deepEqual(Array.from(contribution.descriptors, item => item.method), ['status', 'bootStatus', 'bootPlan', 'bootApply'])
      remote.collabUi = {
        async status() { return { ok: true, value: { rows: [] } } },
        async bootPlan(action) { planArgs = action; return { ok: true, value: { action, accepted: false } } },
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
  assert.deepEqual(await props.boot.plan('restore'), { action: 'restore', accepted: false })
  assert.equal(planArgs, 'restore')
  await assert.rejects(() => props.boot.plan('nope'), /enable" or "restore/)
  assert.equal(planArgs, 'restore')
  const tree = bundle.Component({ view: 'page', t: key => key, ...props })
  assert.equal(visit(tree, node => node.props?.['data-testid'] === 'remote-mount-diagnosis').length, 0)
  assert.equal(visit(tree, node => node.type === 'details').length, 1)
  const statusPage = renderStatus(tree)
  assert.equal(visit(statusPage, node => node.props?.key === 'loading').length, 1)
  assert.equal(visit(statusPage, node => node.type === 'button' && node.props?.['data-testid'] === 'preview-enable').length, 0)
  assert.equal(visit(tree, node => node.type === 'modal').length, 0)
  const activation = ui.specs.find(spec => spec.name === 'plugins.bundle.activation')
  const modal = activation.Component({ t: key => key, onDismiss() {}, onOpenDetails() {} })
  assert.equal(modal.type, 'modal')
  await dispose()
  assert.equal(ui.locale.unregistered, true)
  assert.equal(bundle.disposed, true)
  assert.equal(remote.collabUi, undefined)
})

test('injected Remote mount failure does not reject apply and stays visible', async () => {
  const plugin = loadPlugin()
  const ui = harness()
  let sent = false
  let unmounted = false
  const failure = new Error('client api: generated Remote collabUi/bootPlan field "action" has no strict codec')
  const remote = {
    settings: {},
    async $mount() { throw failure },
    collabUi: {
      async status() { sent = true; return { ok: true, value: {} } },
      async bootPlan() { sent = true; return { ok: true, value: {} } },
    },
  }
  const dispose = await plugin.apply({ remote, slots: ui.slots, locale: ui.localeApi })
  assert.equal(typeof dispose, 'function')
  assert.equal(ui.specs.length, 5)
  const bundle = ui.specs.find(spec => spec.name === 'plugins.bundle.config')
  const props = bundle.inject()
  assert.equal(props.remoteMountError, failure)
  await assert.rejects(() => props.readStatus(), error => error === failure)
  await assert.rejects(() => props.boot.plan('enable'), error => error === failure)
  // A failed mount takes priority in the retained boot API; no validation or RPC is attempted.
  await assert.rejects(() => props.boot.plan('bogus'), error => error === failure)
  assert.equal(sent, false)
  const tree = bundle.Component({ view: 'page', t: key => key, ...props })
  const alerts = visit(tree, node => node.props?.['data-testid'] === 'remote-mount-diagnosis')
  assert.equal(alerts.length >= 1, true)
  assert.equal(alerts[0].children[0], failure.message)
  assert.equal(visit(tree, node => node.type === 'details').length, 1)
  const statusPage = renderStatus(tree)
  assert.equal(visit(statusPage, node => node.props?.key === 'loading').length, 1)
  assert.equal(visit(statusPage, node => node.props?.['data-testid'] === 'preview-restore').length, 0)
  await dispose()
  assert.equal(unmounted, false)
  assert.equal(ui.locale.unregistered, true)
  assert.equal(bundle.disposed, true)
  assert.equal(ui.locale.namespace, 'collabUi')
})

test('slot registration failure still unmounts and rethrows', async () => {
  const plugin = loadPlugin()
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

