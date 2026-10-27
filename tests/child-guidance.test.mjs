import test from 'node:test'
import assert from 'node:assert/strict'
import { SubagentManager } from '../dist/subagent/manager.js'
import { resolveChildMessagePolicy, childMessageDenied } from '../dist/subagent/child-message-policy.js'
import { COLLAB_UI_BRAND, readChildMessageFlags } from '../dist/subagent/assembly-snapshot.js'
import { subagentMessagingGuidance } from '../dist/tool-subagent/flow.js'
import { snapshotSubagentDescriptor } from '../dist/subagent/descriptor.js'

// Focused admission fixture: no AgentLoop, provider, network, or real Profile.
function fixture(policy) {
  const deliveries = []
  const parent = { id: 'parent', status: 'idle', session: { header: {} }, steer(message) { deliveries.push(['parent', message]) } }
  const child = { id: 'child', status: 'running', session: { header: { parentSession: 'parent' } }, steer(message) { deliveries.push(['steer', message]) }, followup(message) { deliveries.push(['queue', message]) } }
  const agents = new Map([['parent', parent], ['child', child]])
  let observations = 0
  let observationParent = 'parent'
  const ctx = {
    agents, plugin() { return { ctx: {}, async dispose() {} } }, on() {}, effect() {},
    get(name) {
      if (name === 'sessionQuery') return { async observeSession() {
        observations++
        return { header: { parentSession: observationParent }, inheritedEventCount: 0, events: [{ type: 'subagent/descriptor', data: snapshotSubagentDescriptor({ mode: 'continuable', provider: 'native', label: 'child' }) }], [Symbol.dispose]() {} }
      } }
    },
  }
  const manager = new SubagentManager(ctx, {}, () => 8, policy)
  manager.resident.set('child', { kind: 'local', childId: 'child', parent, handle: { agent: child }, announced: true, ownedChildren: new Set(), poke: Promise.withResolvers() })
  return { manager, parent, child, deliveries, agents, get observations() { return observations }, foreign() { observationParent = 'foreign-parent' } }
}
const content = [{ type: 'text', text: 'message' }]
const options = () => ({ signal: new AbortController().signal })

test('communication master-off preserves native; both independent sub-options default enabled', () => {
  for (const master of [undefined, false, true]) for (const running of [undefined, false, true]) for (const continuation of [undefined, false, true]) {
    const policy = resolveChildMessagePolicy({ communicationEnhancement: master, runningChildGuidance: running, completedChildContinuation: continuation })
    assert.equal(policy.running, master !== true || running !== false)
    assert.equal(policy.continuation, master !== true || continuation !== false)
    assert.equal(Object.isFrozen(policy), true)
    assert.equal(childMessageDenied(policy, true) === undefined, policy.running)
    assert.equal(childMessageDenied(policy, false) === undefined, policy.continuation)
  }
})
test('resident running guidance and idle continuation are separate real-manager admission cutoffs', async () => {
  const view = fixture({ running: false, continuation: true })
  await assert.rejects(view.manager.sendMessage(view.parent, 'child', content, options()), error => error.code === 'INPUT_CLOSED')
  assert.equal(view.deliveries.length, 0)
  view.child.status = 'idle'
  await view.manager.sendMessage(view.parent, 'child', content, options())
  assert.equal(view.deliveries.length, 1)
  assert.equal(view.deliveries[0][1].source.senderSessionId, 'parent')
  const opposite = fixture({ running: true, continuation: false })
  await opposite.manager.sendMessage(opposite.parent, 'child', content, { ...options(), delivery: 'queue' })
  assert.equal(opposite.deliveries[0][0], 'queue')
  opposite.child.status = 'idle'
  await assert.rejects(opposite.manager.sendMessage(opposite.parent, 'child', content, options()), error => error.code === 'INPUT_CLOSED')
  assert.equal(opposite.deliveries.length, 1)
})
test('deny options do not block human input or child-to-parent replies; exact identity and lineage still win', async () => {
  const view = fixture({ running: false, continuation: false })
  await view.manager.queuePrompt(view.parent, 'child', content, { kind: 'user' }, options().signal)
  await view.manager.sendMessage(view.child, 'parent', content, options())
  assert.equal(view.deliveries.length, 2)
  await assert.rejects(view.manager.sendMessage({ ...view.parent }, 'child', content, options()), error => error.code === 'UNAUTHORIZED')
  const alien = { id: 'alien', session: { header: {} } }; view.agents.set('alien', alien)
  await assert.rejects(view.manager.sendMessage(alien, 'child', content, options()), error => error.code === 'UNAUTHORIZED')
  assert.equal(view.deliveries.length, 2)
})
test('cold continuation checks durable parent and descriptor before deny; denied cold resume never materializes', async () => {
  const view = fixture({ running: true, continuation: false })
  view.manager.resident.delete('child'); view.agents.delete('child')
  await assert.rejects(view.manager.sendMessage(view.parent, 'child', content, options()), error => error.code === 'INPUT_CLOSED')
  assert.equal(view.observations, 1)
  assert.equal(view.deliveries.length, 0)
  view.foreign()
  await assert.rejects(view.manager.sendMessage(view.parent, 'child', content, options()), error => error.code === 'UNAUTHORIZED')
})
test('a live resolver keeps the two sub-options current without rebuilding the manager', async () => {
  let live = { running: false, continuation: true }
  const view = fixture(() => live)
  await assert.rejects(view.manager.sendMessage(view.parent, 'child', content, options()), error => error.code === 'INPUT_CLOSED')
  assert.equal(view.deliveries.length, 0)
  live = { running: true, continuation: true }
  await view.manager.sendMessage(view.parent, 'child', content, options())
  assert.equal(view.deliveries.at(-1)[0], 'steer')
  assert.ok(view.deliveries.at(-1)[1].content.some(block => block.text === 'message'))
})
test('readChildMessageFlags reads the branded control service per call and rejects malformed readers', () => {
  const flags = { runningChildGuidance: false, completedChildContinuation: undefined }
  const ctx = { get: name => name === 'collabUi' ? { [COLLAB_UI_BRAND]: true, childMessageFlags: () => ({ ...flags }) } : undefined }
  assert.deepEqual(readChildMessageFlags(ctx), { runningChildGuidance: false, completedChildContinuation: undefined })
  flags.runningChildGuidance = true
  assert.equal(readChildMessageFlags(ctx)?.runningChildGuidance, true)
  assert.equal(readChildMessageFlags({ get: () => ({ childMessageFlags: () => ({}) }) }), undefined)
  assert.equal(readChildMessageFlags({ get: () => ({ [COLLAB_UI_BRAND]: true, childMessageFlags: () => ({ runningChildGuidance: 'yes' }) }) }), undefined)
  assert.equal(readChildMessageFlags({ get: () => ({ [COLLAB_UI_BRAND]: true }) }), undefined)
  assert.equal(readChildMessageFlags(undefined), undefined)
})

test('the live sub-options select the delegation steering branch and both off prints nothing', () => {
  assert.equal(subagentMessagingGuidance(undefined), '')
  assert.equal(subagentMessagingGuidance({ runningChildGuidance: false, completedChildContinuation: false }), '')
  const running = subagentMessagingGuidance({ runningChildGuidance: true, completedChildContinuation: false })
  assert.match(running, /For any running subagent, `send_message` can queue a message or force an interruption/)
  assert.equal(running.includes('for an idle subagent'), false)
  const continuing = subagentMessagingGuidance({ runningChildGuidance: true, completedChildContinuation: true })
  assert.match(continuing, /for an idle subagent, the same call assigns a new task/)
  assert.match(continuing, /For any running subagent, `send_message` can queue a message or force an interruption/)
  assert.equal(subagentMessagingGuidance({ runningChildGuidance: undefined, completedChildContinuation: true }).includes('idle subagent'), true)
})
