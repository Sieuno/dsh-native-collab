/** Contract-shaped test doubles only: not a browser, transport, or Host integration. */
import assert from 'node:assert/strict'
export const primitives = { Button: 'button', Modal: 'test-host-modal' }
export const clientRequire = React => name => {
  if (name === 'react') return React
  if (name === '@deepseek-ai/dsh-client-ui-primitives') return primitives
  throw new Error(`Unexpected browser module ${name}`)
}
export function clientContext(context) {
  const remote = context.remote
  remote.$mount = async contribution => {
    assert.deepEqual(Array.from(contribution.services, item => item.namespace), ['collabUi'])
    assert.deepEqual(Array.from(contribution.descriptors, item => item.method), ['status', 'bootStatus', 'bootPlan', 'bootApply'])
    const original = remote.collabUi
    remote.collabUi = Object.fromEntries(['status', 'bootStatus', 'bootPlan', 'bootApply'].map(method => [method,
      async (...args) => ({ ok: true, value: await original[method](...args) }),
    ]))
    return () => { remote.collabUi = original }
  }
  context.locale ??= { register(namespace, dictionaries) {
    assert.equal(namespace, 'collabUi')
    assert.equal(typeof dictionaries.en.settingsTitle, 'string')
    assert.equal(typeof dictionaries.zh.settingsTitle, 'string')
    assert.equal(typeof dictionaries.en['boot.title'], 'string')
    assert.equal(typeof dictionaries.zh['boot.title'], 'string')
    assert.ok(Object.values(dictionaries.en).every(value => typeof value === 'string'), 'Host locale dictionaries are flat string maps')
    assert.ok(Object.values(dictionaries.zh).every(value => typeof value === 'string'))
    return () => {}
  } }
  return context
}
export function schemaFields(dict) {
  Object.assign(dict, { runningChildGuidance: 'd', completedChildContinuation: 'e', teamRequestLimit: 'f' })
  return dict
}
