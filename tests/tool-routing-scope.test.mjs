// Real Cordis scopes and ToolRuntime dispatch/output validation; service backends stay isolated.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { executeToolCall, mountToolExecutor, sdkEnvironment } from './sdk-execution-fixture.mjs'
sdkEnvironment()
const require = createRequire(import.meta.url)
const installed = name => import(pathToFileURL(require.resolve(name)))
const { Context } = await installed('@deepseek-ai/cordis')
const { ToolRuntime } = await installed('@deepseek-ai/dsh-tools')
const { SystemPrompt } = await installed('@deepseek-ai/dsh-system-prompt')
const { createScope } = await installed('@deepseek-ai/dsh-scope')
const teamTools = await import('../dist/tool-agent-team/index.js')
const controlTools = await import('../dist/tool-subagent-control/index.js')
const listTools = await import('../dist/tool-subagent-control/list-agents.js')
const { collabHostDelivery } = await import('../dist/subagent/index.js')

async function boot(order) {
  const ctx = new Context(), fibers = [], scopes = []
  fibers.push(await ctx.plugin(SystemPrompt), await ctx.plugin(ToolRuntime))
  await mountToolExecutor(ctx, fibers)
  const caller = { id: 'lead-id' }, outsider = { id: 'outsider-id' }
  const members = [
    { id: caller.id, name: 'lead', role: 'lead', status: 'running', diagnostics: [] },
    { id: 'mate-id', name: 'mate', role: 'teammate', status: 'inactive', diagnostics: [] },
  ]
  const sends = [], interrupts = []
  const children = [{ id: 'mate-id', mode: 'continuable', label: 'Team backing child' }, { id: 'independent', mode: 'continuable', label: 'standalone' }]
  const runtime = {
    [collabHostDelivery]: true, modelDeliverySelection: true,
    async sendMessage(...args) { sends.push(['subagent', ...args]); return 'message-id' },
    async deliverHostPrompt() { return 'host-message' },
    interrupt(...args) { interrupts.push(['subagent', ...args]) },
    async listChildren() { return children }, async listDescendants() { return [] },
    childActivity() { return { runningIds: [], preparing: false } },
    observeChildActivity() { return () => {} },
  }
  let teamEnabled = true, transitioning = false
  const membershipListeners = new Set()
  const teams = {
    [Symbol.for('@sieuno/dsh-native-collab.membershipObserver')](listener) { membershipListeners.add(listener); return () => membershipListeners.delete(listener) },
    [Symbol.for('@sieuno/dsh-native-collab.membershipMessageAdmission')](_caller, target) { if (transitioning && ['mate', 'mate-id'].includes(target)) throw Object.assign(new Error('identity transition in progress; retry after it completes'), { code: 'IDENTITY_TRANSITION_IN_PROGRESS' }) },
    selectionEnhanced: true, communicationEnhanced: true,
    tryMembership(agent) { return teamEnabled && agent === caller ? { role: 'lead', name: 'lead', id: 'team' } : undefined },
    membership() { return { role: 'lead', name: 'lead', id: 'team' } },
    listMembers(agent) { assert.equal(agent, caller); return transitioning ? members.filter(member => member.id !== 'mate-id') : members },
    async sendMessage(...args) { sends.push(['team', ...args]) },
    interrupt(...args) { interrupts.push(['team', ...args]); return { previousStatus: 'inactive' } },
    async waitForChange() { throw new Error('no active work must not register a Team wait') },
  }
  fibers.push(await ctx.plugin(pluginCtx => {
    pluginCtx.reflect.provide('agents', { list: () => [caller, outsider], get: id => [caller, outsider].find(agent => agent.id === id) })
    pluginCtx.reflect.provide('subagents', runtime)
    pluginCtx.reflect.provide('agentTeams', teams)
  }))
  await new Promise((resolve, reject) => {
    fibers.push(ctx.plugin({
      inject: ['tools', 'subagents', 'agents', 'agentTeams', 'systemPrompt'],
      apply(pluginCtx) {
        try {
          for (const agent of [caller, outsider]) {
            const scope = createScope(pluginCtx, agent); scopes.push(scope); agent.ctx = scope.ctx
          }
          if (order === 'global-first') { controlTools.apply(pluginCtx, { deliverySelection: true }); listTools.apply(pluginCtx) }
          teamTools.apply(pluginCtx)
          if (order === 'team-first') { controlTools.apply(pluginCtx, { deliverySelection: true }); listTools.apply(pluginCtx) }
          resolve()
        } catch (error) { reject(error) }
      },
    }))
  })
  let next = 0
  return {
    ctx, caller, outsider, sends, interrupts, members,
    setTransitioning(value) { transitioning = value },
    setTeamMembership(enabled) { teamEnabled = enabled; for (const listener of membershipListeners) listener(caller) },
    call(name, args = {}, agent = caller) {
      return executeToolCall(ctx, { callId: `call-${++next}`, name, arguments: args, agent, signal: new AbortController().signal })
    },
    async disposeCallerTools() { ctx.emit('agent/disposed', { agent: caller }) },
    async dispose() { for (const scope of scopes.reverse()) await scope.dispose(); for (const fiber of fibers.reverse()) await fiber.dispose() },
  }
}

for (const order of ['global-first', 'team-first']) test(`real scoped tool routing and output schemas (${order})`, async () => {
  const f = await boot(order)
  try {
    const ownList = f.ctx.tools.get('list_agents', f.caller), plainList = f.ctx.tools.get('list_agents', f.outsider)
    assert.notEqual(ownList, plainList)
    assert.deepEqual(ownList.parameters.properties.scope.enum, ['all', 'team', 'children', 'descendants'])
    assert.deepEqual(plainList.parameters.properties.scope.enum, ['children', 'descendants'])
    const mixed = await f.call('list_agents')
    assert.equal(mixed.isError, false, JSON.stringify(mixed))
    assert.deepEqual(mixed.value.map(row => row.kind), ['team', 'team', 'subagent'])
    assert.equal(mixed.value[2].id, 'independent')
    assert.deepEqual(JSON.parse(mixed.content[0].text), mixed.value)
    const team = await f.call('list_agents', { scope: 'team' })
    assert.equal(team.isError, false); assert.equal(team.value.length, 2)
    const children = await f.call('list_agents', { scope: 'children' })
    assert.equal(children.isError, false); assert.equal(children.value.length, 1)
    const plain = await f.call('list_agents', {}, f.outsider)
    assert.equal(plain.isError, false); assert.ok(plain.value.every(row => row.kind === 'child'))
    const waiting = await f.call('wait_agent')
    assert.equal(waiting.isError, false, JSON.stringify(waiting)); assert.equal(waiting.value.noProgress.reason, 'no-active-agent')
    assert.equal((await f.call('send_message', { target: 'mate-id', message: 'team' })).isError, false)
    assert.equal((await f.call('send_message', { target: 'independent', message: 'child' })).isError, false)
    assert.deepEqual(f.sends.map(call => call[0]), ['team', 'subagent'])
    assert.equal(f.sends[0][2].target, 'mate')
    const interrupted = await f.call('interrupt_agent', { target: 'independent' })
    assert.equal(interrupted.isError, false); assert.deepEqual(interrupted.value, { accepted: true })
    assert.equal(f.interrupts[0][0], 'subagent'); assert.equal(f.interrupts[0][2].agent, f.caller)
    f.setTransitioning(true)
    const acceptedBefore = f.sends.length
    for (const target of ['mate', 'mate-id']) {
      const rejected = await f.call('send_message', { target, message: 'blocked' })
      assert.equal(rejected.isError, true)
      assert.match(JSON.stringify(rejected.content), /identity transition in progress/)
    }
    assert.equal(f.sends.length, acceptedBefore, 'removed roster alias must not fall through during conversion')
    f.setTransitioning(false)
    f.setTeamMembership(false)
    assert.equal(f.ctx.tools.get('list_agents', f.caller), plainList, 'demotion reveals independent global tool definitions without Agent restart')
    assert.equal(f.ctx.tools.get('team_task_create', f.caller), undefined)
    f.setTeamMembership(true)
    assert.deepEqual(f.ctx.tools.get('list_agents', f.caller).parameters.properties.scope.enum, ['all', 'team', 'children', 'descendants'])
    assert.ok(f.ctx.tools.get('team_task_create', f.caller), 'promotion reinstalls Team tools on the same scope')
    await f.disposeCallerTools()
    assert.equal(f.ctx.tools.get('list_agents', f.caller), plainList, 'disposing Team scope reveals the global definition again')
  } finally { await f.dispose() }
})
