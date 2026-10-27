import test from 'node:test'
import assert from 'node:assert/strict'
import { clientRequire, clientContext, clientModule, visit } from './browser-fixture.mjs'
async function load(React, remote) {
  const spec = await clientModule({}, { emitted: true })
  const plugin = spec.factory(clientRequire(React))
  const registrations = []
  const providers = []
  const context = clientContext({ remote, slots: {
    inject(name, register) { providers.push(register); return () => {} },
    register(contract, component) { const value = { contract, component }; registrations.push(value); return () => {} },
  } })
  const cleanup = await plugin.apply(context)
  for (const provider of providers) provider()
  return { spec, plugin, registrations, cleanup }
}
test('browser entry mounts its namespace and locale before registering four supported slots without an installation popup', async () => {
  let calls = 0
  const React = { Fragment: 'fragment', useState: initial => [initial, () => {}], createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }) }
  const { spec, plugin, registrations, cleanup } = await load(React, { collabUi: { async status() { calls++; return { profileName: null, hmrEnabled: null, rows: [], desired: 'unchanged', pendingRestart: 'unknown', writeSupport: 'unsupported', operationError: 'transaction-unavailable', error: null, assembly: null } } } })
  assert.equal(spec.id, '@sieuno/dsh-native-collab')
  assert.deepEqual([...plugin.inject], ['slots', 'remote', 'locale'])
  assert.equal(calls, 0)
  assert.deepEqual(registrations.map(row => row.contract.name), ['plugins.bundle.config', 'plugins.detail.badge', 'plugins.detail.section', 'plugins.row.config'])
  assert.equal(registrations[0].contract.key, '@sieuno/dsh-native-collab')
  const injected = registrations[0].contract.inject()
  assert.equal(typeof injected.readStatus, 'function')
  assert.deepEqual(await injected.readStatus(), { profileName: null, hmrEnabled: null, rows: [], desired: 'unchanged', pendingRestart: 'unknown', writeSupport: 'unsupported', operationError: 'transaction-unavailable', error: null, assembly: null })
  assert.equal(calls, 1)
  const page = registrations[0].component({ view: 'page', t: key => key, ...injected })
  assert.equal(visit(page, node => node.props?.key === 'settings').length, 1)
  assert.equal(visit(page, node => node.type === 'details').length, 1)
  await cleanup()
})
test('collapsed diagnostics unwrap RemoteResult and expose no obsolete preview actions', async () => {
  let cursor = 0
  let effect
  const states = []
  const React = {
    Fragment: 'fragment', createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = value }] },
    useEffect(callback) { effect = callback },
  }
  const actions = []
  const view = await load(React, { collabUi: {
    status: async () => ({ rows: [{ id: 'dsh-native-collab-subagent', current: 'disabled', sourceLayer: 'unknown' }] }),
    preview: async action => { actions.push(action); return { error: 'transaction-unavailable' } },
  } })
  const props = { view: 'page', t: key => key, ...view.registrations[0].contract.inject() }
  const wrapper = view.registrations[0].component(props)
  const status = visit(wrapper, node => node.props?.key === 'status' && typeof node.type === 'function')[0]
  states.length = 0 // The diagnostic child owns separate hook state from BundleConfig.
  const draw = () => { cursor = 0; return status.type(status.props) }
  draw(); const cleanup = effect(); await new Promise(resolve => setImmediate(resolve))
  const page = draw()
  assert.equal(visit(page, node => node.type === 'tbody')[0].children[0].length, 1)
  const buttons = visit(page, node => node.type === 'button')
  assert.equal(buttons.length, 0)
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(actions, [])
  assert.equal(visit(draw(), node => node.props?.['data-testid'] === 'preview-result').length, 0)
  cleanup(); await view.cleanup()
})
