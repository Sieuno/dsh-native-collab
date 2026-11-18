import test from 'node:test'
import assert from 'node:assert/strict'
import { Session } from '@deepseek-ai/dsh-session'
import { fixture, text } from './native-fixture.mjs'
const task = model => ({ description: 'Review one module', prompt: 'Review it', provider: 'mock', model })
async function using(t, config) { const f = await fixture(config); t.after(() => f.dispose()); return f }

test('official tool family, prompts, and interrupt configuration are retained', async t => {
  const f = await using(t)
  assert.equal(f.ctx.get('subagents'), f.runtime)
  for (const name of ['subagent', 'subagent_fork', 'send_message', 'list_agents', 'wait_agent']) assert.ok(f.ctx.tools.get(name))
  for (const name of ['spawn_teammate', 'interrupt_agent']) assert.equal(f.ctx.tools.get(name), undefined)
  assert.equal(f.ctx.tools.get('send_message').parameters.properties.delivery, undefined)
  const assembly = await f.ctx.systemPrompt.assemble({ agent: f.parent, scope: f.parent })
  const prompt = assembly.sections.map(section => section.text).join('\n')
  assert.match(prompt, /end your turn instead of sleeping or polling/)
  assert.match(prompt, /Handle small or tightly coupled tasks directly/)
  assert.doesNotMatch(prompt, /spawn_teammate|force an interruption|Ask the subagent to report progress/)
  assert.equal(assembly.sections.filter(section => section.name === 'native-collab:delegation').length, 1)
})

test('conversation source preserves the native snapshot and adapter preflight', async t => {
  const f = await using(t, { modelSource: 'conversation' })
  f.parent.session.append('subagent/model-selection-policy', { allowedModels: [{ provider: 'mock', model: 'saved' }] })
  assert.equal((await f.call('subagent', task('saved'))).isError, false)
  const denied = await f.call('subagent', task('a'))
  assert.equal(denied.isError, true); assert.match(text(denied), /not allowed for this Session/)
  assert.deepEqual(f.preflights.map(route => route.model), ['saved'])
})

test('settings source reads current allowlist per call without editing session policy', async t => {
  const f = await using(t, { modelSource: 'settings' })
  f.parent.session.append('subagent/model-selection-policy', { allowedModels: [{ provider: 'mock', model: 'saved' }] })
  const before = f.parent.session.snapshotEvents()
  assert.equal((await f.call('subagent', task('a'))).isError, false)
  f.state.settings.allowedModels = [{ provider: 'mock', model: 'b' }]
  assert.equal((await f.call('subagent', task('a'))).isError, true)
  assert.equal((await f.call('subagent', task('b'))).isError, false)
  assert.deepEqual(f.parent.session.snapshotEvents(), before)
  const discovered = await f.call('list_subagent_models', { provider: 'mock' })
  assert.match(text(discovered), /mock\/b/); assert.doesNotMatch(text(discovered), /mock\/a/)
})

test('disabled or malformed current settings never fall back to historical authorization', async t => {
  const f = await using(t, { modelSource: 'settings' })
  f.parent.session.append('subagent/model-selection-policy', { allowedModels: [{ provider: 'mock', model: 'a' }] })
  f.state.settings.enabled = false
  assert.equal((await f.call('subagent', task('a'))).isError, true)
  f.state.settings = { enabled: true, allowedModels: 'broken' }
  assert.match(text(await f.call('subagent', task('a'))), /unavailable or malformed/)
  assert.equal(f.starts.length, 0)
})

test('all source accepts an unadvertised exact model but retains official adapter validation', async t => {
  const f = await using(t, { modelSource: 'all' })
  assert.equal((await f.call('subagent', task('unadvertised'))).isError, false)
  assert.equal(f.preflights[0].model, 'unadvertised')
  f.state.invalidModel = true
  assert.match(text(await f.call('subagent', task('bad'))), /adapter rejected/)
  assert.match(text(await f.call('subagent', { ...task('a'), provider: 'missing' })), /not registered/)
  assert.equal(f.starts.length, 1)
  const discovery = await f.call('list_subagent_models', {})
  assert.match(text(discovery), /empty/)
  assert.match(text(await f.call('list_subagent_models', { provider: 'empty' })), /no advertised models/)
})

test('native paired-route validation, cancellation, and fork inheritance remain intact', async t => {
  const f = await using(t, { modelSource: 'all' })
  assert.match(text(await f.call('subagent', { description: 'Test', prompt: 'Test', reasoning_effort: 'high' })), /requires both/)
  const signal = AbortSignal.abort(new Error('cancelled'))
  assert.equal((await f.call('subagent', task('a'), f.parent, signal)).isError, true)
  assert.equal((await f.call('subagent_fork', task('a'))).isError, true)
  assert.equal(f.ctx.tools.get('subagent_fork').parameters.properties.model, undefined)
  assert.equal(f.starts.length, 0)
})

test('model source changes are live and do not remount the preference entry', async t => {
  const f = await using(t, { modelSource: 'conversation' })
  const uid = f.entry.fiber.uid
  assert.equal((await f.call('subagent', task('b'))).isError, true)
  await f.update({ modelSource: 'all' })
  assert.equal(f.entry.fiber.uid, uid)
  assert.equal((await f.call('subagent', task('b'))).isError, false)
  await f.update({ modelEnhancement: false })
  assert.equal((await f.call('subagent', task('b'))).isError, true)
})

test('parallel model calls keep independent policy scopes', async t => {
  const f = await using(t, { modelSource: 'all' })
  const other = { ...f.parent, id: 'other', session: Session.create('other') }
  const results = await Promise.all([f.call('subagent', task('left'), f.parent), f.call('subagent', task('right'), other)])
  assert.ok(results.every(result => !result.isError))
  assert.deepEqual(f.starts.map(request => request.agentOptions.model).sort(), ['left', 'right'])
})

test('wake limit is shared across sibling senders and failed native sends refund it', async t => {
  const f = await using(t, { teamRequestLimit: 2 })
  f.state.sendFailure = true
  assert.equal((await f.call('send_message', { agent: 'child', message: 'retryable' })).isError, true)
  f.state.sendFailure = false
  assert.equal((await f.call('send_message', { agent: 'child', message: 'one' })).isError, false)
  assert.equal((await f.call('send_message', { agent: 'peer', message: 'two' }, f.child)).isError, false)
  const denied = await f.call('send_message', { agent: 'child', message: 'three' }, f.peer)
  assert.match(text(denied), /Automatic wake limit reached/)
  assert.equal(f.sends.length, 2)
  assert.equal((await f.call('send_message', { agent: 'other', message: 'independent' }, f.unrelated)).isError, false)
})

test('human intervention resets the tree; automatic messages do not', async t => {
  const f = await using(t, { teamRequestLimit: 1 })
  await f.call('send_message', { agent: 'child', message: 'one' })
  f.ctx.emit('agent/inbox/inserted', { agent: f.child, message: { source: { kind: 'agent-message' } } })
  assert.equal((await f.call('send_message', { agent: 'peer', message: 'blocked' })).isError, true)
  f.ctx.emit('agent/inbox/inserted', { agent: f.child, message: { source: { kind: 'user' } } })
  assert.equal((await f.call('send_message', { agent: 'peer', message: 'reset' })).isError, false)
})

test('completed-task reports are exempt only on the native direct-parent path', async t => {
  const f = await using(t, { teamRequestLimit: 1 })
  await f.call('send_message', { agent: 'child', message: 'one' })
  assert.equal((await f.call('send_message', { agent: 'lead', message: 'result', task_result: true }, f.child)).isError, false)
  assert.match(text(await f.call('send_message', { agent: 'peer', message: 'abuse', task_result: true }, f.child)), /only allowed/)
  assert.match(text(await f.call('send_message', { agent: 'child', message: 'old api', delivery: 'queue' })), /omit delivery/)
})

test('retired communication switches leave running and idle children to native messaging', async t => {
  const f = await using(t, { communicationEnhancement: true, runningChildGuidance: false, completedChildContinuation: false })
  assert.equal((await f.call('send_message', { agent: 'child', message: 'running' })).isError, false)
  f.child.status = 'idle'
  assert.equal((await f.call('send_message', { agent: 'child', message: 'idle' })).isError, false)
  assert.equal((await f.call('send_message', { agent: 'peer', message: 'peer' }, f.child)).isError, false)
  const prompt = await f.ctx.systemPrompt.assemble({ agent: f.parent, scope: f.parent })
  assert.ok(!prompt.sections.some(section => /direct children are disabled/.test(section.text)))
})

test('delegation guidance is always present even when the retired switch is false', async t => {
  const f = await using(t, { delegationGuidance: false })
  const prompt = await f.ctx.systemPrompt.assemble({ agent: f.parent, scope: f.parent })
  const section = prompt.sections.find(section => section.name === 'native-collab:delegation')
  assert.match(section.text, /Handle small or tightly coupled tasks directly/)
})

test('native authorization failures remain failures and do not consume allowance', async t => {
  const f = await using(t, { teamRequestLimit: 1 })
  assert.match(text(await f.call('send_message', { agent: 'other', message: 'forbidden' })), /native unauthorized/)
  assert.equal((await f.call('send_message', { agent: 'child', message: 'allowed' })).isError, false)
})

test('extension disposal restores official tool bodies, schema, and prompts', async t => {
  const f = await using(t, { modelSource: 'all', teamRequestLimit: 1, disableWaitAgent: true })
  assert.equal(f.ctx.tools.executable('wait_agent', f.parent), undefined)
  await f.entry.fiber.dispose()
  assert.equal(f.ctx.get('subagents'), f.runtime)
  assert.ok(f.ctx.tools.executable('wait_agent', f.parent))
  assert.equal(f.ctx.tools.get('send_message').parameters.properties.task_result, undefined)
  assert.equal((await f.call('subagent', task('a'))).isError, true)
  for (let index = 0; index < 3; index++) assert.equal((await f.call('send_message', { agent: 'child', message: 'native' })).isError, false)
  const assembly = await f.ctx.systemPrompt.assemble({ agent: f.parent, scope: f.parent })
  assert.equal(assembly.sections.some(section => section.name.startsWith('native-collab:')), false)
})
