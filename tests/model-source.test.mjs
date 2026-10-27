import test from 'node:test'
import assert from 'node:assert/strict'

const policy = await import(new URL('../dist/subagent/model-source.js', import.meta.url))

const captured = [{ provider: 'native', model: 'captured' }]
const settingsA = { enabled: true, allowedModels: [{ provider: 'settings', model: 'one' }] }
const settingsB = { enabled: true, allowedModels: [{ provider: 'settings', model: 'two' }] }

test('conversation policy is an immutable session snapshot, not current settings', () => {
  const first = captured.map(route => ({ ...route }))
  policy.assertModelRouteAllowed('conversation', first[0], captured, settingsB, ['native', 'settings'])
  assert.throws(() => policy.assertModelRouteAllowed('conversation', settingsB.allowedModels[0], captured, settingsB, ['native', 'settings']), /not allowed for this conversation/)
})

test('settings policy is read per operation and reflects changed allowed routes', () => {
  policy.assertModelRouteAllowed('settings', settingsA.allowedModels[0], captured, settingsA, ['settings'])
  assert.throws(() => policy.assertModelRouteAllowed('settings', settingsA.allowedModels[0], captured, settingsB, ['settings']), /not allowed by current settings/)
  policy.assertModelRouteAllowed('settings', settingsB.allowedModels[0], captured, settingsB, ['settings'])
})

test('all policy uses live registered providers, not model-selection allowlist', () => {
  policy.assertModelRouteAllowed('all', { provider: 'live', model: 'not-advertised' }, captured, settingsA, ['live'])
  assert.throws(() => policy.assertModelRouteAllowed('all', { provider: 'old', model: 'm' }, captured, settingsA, ['live']), /not currently registered/)
})

test('legacy compatibility maps conservatively and explicit enum wins', () => {
  assert.equal(policy.resolveModelSource(undefined, undefined), 'conversation')
  assert.equal(policy.resolveModelSource(undefined, true), 'conversation')
  assert.equal(policy.resolveModelSource(undefined, false), 'settings')
  assert.equal(policy.resolveModelSource('all', true), 'all')
  assert.equal(policy.resolveModelSource('settings', true), 'settings')
})

test('missing services, malformed policy, and unauthorized routes fail closed', () => {
  assert.throws(() => policy.assertModelRouteAllowed('conversation', captured[0], undefined, settingsA, ['native']), /policy is unavailable/)
  assert.throws(() => policy.assertModelRouteAllowed('settings', settingsA.allowedModels[0], captured, undefined, ['settings']), /unavailable or malformed/)
  assert.throws(() => policy.assertModelRouteAllowed('all', { provider: 'live', model: 'm' }, captured, settingsA, undefined), /catalog is unavailable/)
  assert.throws(() => policy.assertModelRouteAllowed('settings', { provider: 'x', model: 'y' }, captured, settingsA, ['x']), /not allowed by current settings/)
})
