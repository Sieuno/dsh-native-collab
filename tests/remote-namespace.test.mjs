/**
 * remote namespace access. Uses a real Cordis Context and Service, not a
 * plain-object fake remote. The plugin fiber injects only slots/remote/locale.
 * Namespace services are provided on another fiber, so ctx.remote.collabUi and
 * ctx.remote.settings throw without inject while ctx.get still returns them.
 * Does not boot Host, Web, or the official gateway, and does not send RPC.
 */
import assert from 'node:assert/strict'
import { clientModule, clientRequire, visit, text } from './browser-fixture.mjs'
import test from 'node:test'
import { Context, Service } from '@deepseek-ai/cordis'

const React = {
  Fragment: 'fragment',
  useState: initial => [initial, () => {}],
  useEffect: () => {},
  createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
}

async function loadPlugin() {
  return (await clientModule()).factory(clientRequire(React))
}

async function start(fiber) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('plugin apply timed out (remote namespace inject deadlock)')), 2000)
  })
  try {
    await Promise.race([fiber, timeout])
  } finally {
    clearTimeout(timer)
  }
  return fiber
}

function boot(control) {
  const ctx = new Context()
  const slots = { specs: [], disposed: 0 }
  const locale = { unregistered: false, namespace: null }
  ctx.provide('slots', {
    inject(_name, register) {
      const dispose = register()
      return () => { slots.disposed++; if (typeof dispose === 'function') dispose() }
    },
    register(spec, Component) {
      spec.Component = Component
      slots.specs.push(spec)
      return () => { spec.disposed = true }
    },
  })
  ctx.provide('locale', {
    register(namespace, dictionaries) {
      locale.namespace = namespace
      locale.dictionaries = dictionaries
      return () => { locale.unregistered = true }
    },
  })
  class RemoteHost extends Service {
    constructor(hostCtx) {
      super(hostCtx, 'remote')
      const owner = hostCtx
      this.$mount = async contribution => {
        control.contribution = contribution
        const fiber = owner.plugin({
          name: 'remote.collabUi',
          apply(nsCtx) {
            if (control.skipCollab) return
            if (control.invalidCollab) {
              nsCtx.provide('remote.collabUi', {})
              return
            }
            nsCtx.provide('remote.collabUi', {
              status() {
                control.status++
                return { ok: true, value: { rows: [] } }
              },
            })
          },
        })
        await fiber
        return async () => { control.unmounted++; await fiber.dispose() }
      }
    }
  }
  const settings = control.invalidSettings
    ? {}
    : {
      describe() { control.described++; return { ok: true, value: { team: true } } },
      mutate(patch) { control.mutated.push(patch); return { ok: true, value: true } },
    }
  // Sibling of the client fiber, not an ancestor. An ancestor store would
  // satisfy the inject-proxy walk and hide the production failure.
  const settingsHost = {
    name: 'settings-host-fixture',
    apply(settingsCtx) { settingsCtx.provide('remote.settings', settings) },
  }
  return { ctx, slots, locale, RemoteHost, settingsHost }
}

async function applyClient(t, control) {
  const { ctx, slots, locale, RemoteHost, settingsHost } = boot(control)
  const remoteFiber = ctx.plugin(RemoteHost)
  await start(remoteFiber)
  await start(ctx.plugin(settingsHost))
  const plugin = await loadPlugin()
  assert.deepEqual([...plugin.inject], ['slots', 'remote', 'locale'])
  const fiber = ctx.plugin(plugin)
  t.after(async () => { await fiber.dispose() })
  await start(fiber)
  assert.equal('remote.collabUi' in fiber.inject, false)
  assert.equal('remote.settings' in fiber.inject, false)
  const bundle = slots.specs.find(spec => spec.name === 'plugins.bundle.config')
  assert.equal(typeof bundle?.inject, 'function')
  return { ctx, slots, locale, fiber, plugin, bundle, injected: bundle.inject() }
}

async function probe(ctx) {
  const seen = {}
  const fiber = ctx.plugin({
    name: 'remote-namespace-probe',
    inject: ['slots', 'remote', 'locale'],
    apply(probeCtx) {
      try { seen.collab = probeCtx.remote.collabUi } catch (error) { seen.collabError = error }
      try { seen.settings = probeCtx.remote.settings } catch (error) { seen.settingsError = error }
      seen.collabGet = probeCtx.get('remote.collabUi')
      seen.settingsGet = probeCtx.get('remote.settings')
    },
  })
  await start(fiber)
  await fiber.dispose()
  return seen
}

function page(bundle, injected) {
  return bundle.Component({ view: 'page', t: key => key, ...injected })
}

function diagnosis(tree) {
  return visit(tree, node => node.props?.key === 'diagnosis')
}

test('mounted Cordis namespaces are reachable without injecting them', async t => {
  const control = { status: 0, described: 0, mutated: [], unmounted: 0 }
  const { ctx, slots, locale, fiber, bundle, injected } = await applyClient(t, control)
  const seen = await probe(ctx)
  assert.match(seen.collabError.message, /cannot get property "remote\.collabUi" without inject/)
  assert.match(seen.settingsError.message, /cannot get property "remote\.settings" without inject/)
  assert.equal(typeof seen.collabGet.status, 'function')
  assert.equal(typeof seen.settingsGet.describe, 'function')
  assert.deepEqual(Array.from(control.contribution.services, item => item.namespace), ['collabUi'])
  assert.deepEqual(Array.from(control.contribution.descriptors, item => item.method), ['status', 'limits', 'saveLimits'])
  assert.equal(injected.remoteMountError, null)
  assert.deepEqual(await injected.readStatus(), { rows: [] })
  assert.equal(control.status, 1)
  assert.deepEqual(await injected.settings.describe(), { ok: true, value: { team: true } })
  assert.deepEqual(await injected.settings.mutate({ team: false }), { ok: true, value: true })
  assert.equal(control.described, 1)
  assert.deepEqual(control.mutated, [{ team: false }])
  const tree = page(bundle, injected)
  assert.equal(diagnosis(tree).length, 0)
  assert.ok(visit(tree, node => node.props?.key === 'settings').length === 1)
  assert.ok(visit(tree, node => node.props?.key === 'runtime').length === 1)
  await fiber.dispose()
  assert.equal(control.unmounted, 1)
  assert.equal(locale.unregistered, true)
  assert.equal(locale.namespace, 'collabUi')
  assert.equal(slots.disposed, 4)
  assert.equal(bundle.disposed, true)
  assert.equal(ctx.get('remote.collabUi'), undefined)
})

test('inject-denied namespaces diagnose and do not crash the page', async t => {
  const control = { status: 0, described: 0, mutated: [], unmounted: 0, invalidCollab: true, invalidSettings: true }
  const { ctx, slots, locale, fiber, bundle, injected } = await applyClient(t, control)
  const seen = await probe(ctx)
  assert.match(seen.collabError.message, /cannot get property "remote\.collabUi" without inject/)
  assert.match(seen.settingsError.message, /cannot get property "remote\.settings" without inject/)
  const tree = page(bundle, injected)
  const alerts = diagnosis(tree)
  assert.equal(alerts.length, 1)
  assert.equal(alerts[0].props.code, 'remote-unavailable')
  const notice = alerts[0].type(alerts[0].props)
  assert.equal(notice.props['data-testid'], 'operation-error')
  assert.equal(text(notice).includes('without inject'), false, 'raw host exceptions are not shown')
  assert.ok(visit(tree, node => node.props?.key === 'settings').length === 1)
  assert.ok(visit(tree, node => node.props?.key === 'runtime').length === 1)
  await assert.rejects(() => injected.readStatus(), /cannot get property "remote\.collabUi" without inject/)
  await assert.rejects(() => injected.settings.describe(), /cannot get property "remote\.settings" without inject/)
  await assert.rejects(() => injected.settings.mutate({ team: false }), /cannot get property "remote\.settings" without inject/)
  assert.equal(control.status, 0)
  assert.equal(control.described, 0)
  await fiber.dispose()
  assert.equal(control.unmounted, 1)
  assert.equal(locale.unregistered, true)
  assert.equal(slots.disposed, 4)
  assert.equal(bundle.disposed, true)
  assert.equal(ctx.get('remote.collabUi'), undefined)
})

test('a missing namespace is diagnosed without crashing the page', async t => {
  const control = { status: 0, described: 0, mutated: [], unmounted: 0, skipCollab: true }
  const { ctx, slots, locale, fiber, bundle, injected } = await applyClient(t, control)
  const seen = await probe(ctx)
  assert.equal(seen.collabError, undefined)
  assert.equal(seen.collab, undefined)
  assert.equal(seen.collabGet, undefined)
  const tree = page(bundle, injected)
  const alerts = diagnosis(tree)
  assert.equal(alerts.length, 1)
  assert.equal(alerts[0].props.code, 'remote-unavailable')
  const notice = alerts[0].type(alerts[0].props)
  assert.equal(notice.props['data-testid'], 'operation-error')
  assert.equal(text(notice).includes('without inject'), false, 'raw host exceptions are not shown')
  assert.ok(visit(tree, node => node.props?.key === 'settings').length === 1)
  assert.ok(visit(tree, node => node.props?.key === 'runtime').length === 1)
  await assert.rejects(() => injected.readStatus(), /Remote namespace collabUi is not mounted/)
  assert.deepEqual(await injected.settings.describe(), { ok: true, value: { team: true } })
  assert.deepEqual(await injected.settings.mutate({ team: true }), { ok: true, value: true })
  assert.equal(control.described, 1)
  assert.deepEqual(control.mutated, [{ team: true }])
  await fiber.dispose()
  assert.equal(control.unmounted, 1)
  assert.equal(locale.unregistered, true)
  assert.equal(slots.disposed, 4)
  assert.equal(bundle.disposed, true)
  assert.equal(ctx.get('remote.collabUi'), undefined)
})
