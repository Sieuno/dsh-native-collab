/**
 * Runtime integration. Real Cordis/ToolRuntime/SystemPrompt plus production apply.
 * Browser save/registration coverage lives in feature-settings and UI contract tests.
 * Settings/ConfigEditor Host fixture is not importable here and is not simulated.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const root = new URL('../', import.meta.url)
const require = createRequire(root)
const importInstalled = async name => import(pathToFileURL(require.resolve(name)))
const dist = name => import(new URL(`../dist/${name}`, import.meta.url))

const { Context } = await importInstalled('@deepseek-ai/cordis')
const { ToolRuntime } = await importInstalled('@deepseek-ai/dsh-tools')
const { SystemPrompt } = await importInstalled('@deepseek-ai/dsh-system-prompt')
const { SessionProjectionRegistry } = await importInstalled('@deepseek-ai/dsh-session-projection')
const teamTools = await dist('tool-agent-team/index.js')
const controlTools = await dist('tool-subagent-control/index.js')
const subagent = await dist('subagent/index.js')
const bootstrap = await dist('agent-team/bootstrap.js')
const agentTeam = await dist('agent-team/index.js')

function brandedRuntime(flag, sends) {
  const runtime = {
    modelDeliverySelection: flag,
    async sendMessage(...args) { sends.push(args); return 'msg-1' },
    async deliverHostPrompt() { return 'host-1' },
  }
  Object.defineProperty(runtime, subagent.collabHostDelivery, { value: true })
  return runtime
}

async function bootTools() {
  const ctx = new Context()
  const fibers = []
  fibers.push(await ctx.plugin(SystemPrompt))
  fibers.push(await ctx.plugin(ToolRuntime))
  fibers.push(await ctx.plugin(SessionProjectionRegistry))
  const agents = { items: [], list() { return this.items }, get(id) { return this.items.find(agent => agent.id === id) } }
  const sends = []
  const runtime = brandedRuntime(true, sends)
  const agentTeams = {
    selectionEnhanced: true,
    communicationEnhanced: true,
    tryMembership() { return { id: 'team', role: 'lead', name: 'lead' } },
    membership() { return { id: 'team', role: 'lead', name: 'lead' } },
    listMembers() { return [{ id: 'lead', name: 'lead', status: 'active' }, { id: 'mate-id', name: 'mate', status: 'active' }] },
    async sendMessage() { return { accepted: true } },
    async spawnTeammate() { return { member: { target: 'mate', name: 'mate', role: 'teammate', status: 'inactive' } } },
  }
  fibers.push(await ctx.plugin(pluginCtx => {
    pluginCtx.reflect.provide('agents', agents)
    pluginCtx.reflect.provide('agentTeams', agentTeams)
    pluginCtx.reflect.provide('subagents', runtime)
    pluginCtx.reflect.provide('sessions', { get() {} })
    pluginCtx.reflect.provide('sessionPersistence', {})
    pluginCtx.reflect.provide('llm', { async resolveCallConfig(config) { return config } })
    pluginCtx.reflect.provide('agentPresets', {})
    pluginCtx.reflect.provide('subagentModelSelection', { current() { return { enabled: true, allowedModels: [{ provider: 'p', model: 'listed' }] } } })
  }))
  return {
    ctx, agents, agentTeams, sends, runtime, fibers,
    async dispose() {
      for (const fiber of fibers.reverse()) await fiber.dispose()
    },
  }
}

async function installTeam(harness, flags) {
  const key = {}
  const sections = []
  const systemPrompt = harness.ctx.systemPrompt
  const scoped = {
    systemPrompt: {
      section(spec) {
        sections.push(spec)
        return systemPrompt.section(spec)
      },
      context(spec) { return systemPrompt.context(spec) },
      getSectionOrder(name) { return systemPrompt.getSectionOrder(name) },
      getContextOrder(name) { return systemPrompt.getContextOrder(name) },
    },
    tools: harness.ctx.tools,
  }
  const agent = { id: 'lead', ctx: scoped, session: { id: 's' } }
  harness.agents.items = [agent]
  const calls = []
  harness.agentTeams.selectionEnhanced = flags.model
  harness.agentTeams.communicationEnhanced = flags.communication
  harness.agentTeams.sendMessage = async (...args) => { calls.push(args); return { accepted: true } }
  harness.runtime.modelDeliverySelection = flags.queue
  teamTools.apply(harness.ctx)
  const spawn = harness.ctx.tools.get('spawn_teammate', key) ?? harness.ctx.tools.get('spawn_teammate')
  const send = harness.ctx.tools.get('send_message', key) ?? harness.ctx.tools.get('send_message')
  assert.equal(typeof spawn?.execute, 'function')
  assert.equal(typeof send?.execute, 'function')
  return { key, spawn, send, sections, calls, agent, async dispose() {} }
}

test('team schema handler and policy follow the split 2x2 flags', async () => {
  const cases = [
    { model: false, communication: false, queue: true },
    { model: false, communication: true, queue: true },
    { model: true, communication: false, queue: true },
    { model: true, communication: true, queue: false },
  ]
  for (const flags of cases) {
    const harness = await bootTools()
    let installed
    try {
      installed = await installTeam(harness, flags)
      const policy = installed.sections.find(section => section.name === 'team:policy')?.text ?? ''
      assert.equal(installed.spawn.parameters.properties.provider !== undefined, flags.model)
      assert.equal(installed.send.parameters.properties.delivery !== undefined, flags.communication && flags.queue)
      assert.match(policy, flags.model ? /Model selection is enabled/ : /Model selection is disabled/)
      assert.match(policy, /prefer spawn_teammate when the work needs a long-lived collaborator/)
      assert.match(policy, /a subagent keeps its own independent task scope/)
      assert.match(policy, /send a result message when it finishes/)
      assert.match(policy, /Use wait_agent only when you specifically must pause all other activity/)
      assert.match(policy, flags.communication
        ? /send_message accepts optional delivery|does not accept the delivery argument/
        : /send_message delivers messages at step boundaries; the delivery argument is rejected/)
      // The policy must never describe host internals such as a "native" path.
      assert.doesNotMatch(policy, /native/i)
      const agent = installed.agent
      if (!flags.model) {
        await assert.rejects(
          installed.spawn.execute({ name: 'mate', description: 'work', prompt: 'go', provider: 'p', model: 'm' }, { agent, signal: new AbortController().signal }),
          /selection enhancement is off/,
        )
      }
      if (!flags.communication) {
        await assert.rejects(
          installed.send.execute({ target: 'lead', message: 'hi', delivery: 'queue' }, { agent, signal: new AbortController().signal }),
          /communication enhancement is off/,
        )
        assert.equal(installed.calls.length, 0)
        const sent = await installed.send.execute(
          { target: 'lead', message: 'native' },
          { agent, signal: new AbortController().signal },
        )
        assert.equal(sent.sent, true)
        assert.equal(installed.calls.length, 1)
        assert.equal(installed.calls[0][1].delivery, undefined)
      }
    } finally {
      await installed?.dispose()
      await harness.dispose()
    }
  }
})

function ownSnapshot(ctx, config) {
  return new bootstrap.default(ctx, config)
}

test('explicit delivery cannot bypass runtime admission and native send remains', async () => {
  const harness = await bootTools()
  try {
    harness.runtime.modelDeliverySelection = false
    const sends = []
    harness.runtime.sendMessage = async (...args) => { sends.push(args); return 'kept' }
    controlTools.apply(harness.ctx, { deliverySelection: true })
    const tool = harness.ctx.tools.get('send_message')
    assert.equal(tool.parameters.properties.delivery, undefined)
    const agent = { id: 'parent' }
    await assert.rejects(
      tool.execute({ agent_id: 'child', message: 'no', delivery: 'queue' }, { agent, signal: new AbortController().signal }),
      /delivery selection is disabled/,
    )
    assert.equal(sends.length, 0)
    const sent = await tool.execute(
      { agent_id: 'child', message: 'yes' },
      { agent, signal: new AbortController().signal },
    )
    assert.equal(sent.messageId, 'kept')
    assert.equal(sends.length, 1)
    assert.equal(sends[0][3].delivery, undefined)
  } finally {
    await harness.dispose()
  }
})

test('service constructors freeze the startup snapshot and reject enhanced delivery', async () => {
  const harness = await bootTools()
  const planted = Symbol.for('@sieuno/dsh-native-collab.assemblySnapshot')
  try {
    const ui = new bootstrap.default(harness.ctx, {
      modelEnhancement: true,
      communicationEnhancement: false,
    })
    assert.equal(ui.assemblySnapshot().modelEnhancement, true)
    assert.equal(ui.assemblySnapshot().communicationEnhancement, false)
    assert.equal(ui.assemblySnapshot().nativeModelSelectionCompatibility, undefined)
    const teamCtx = new Context()
    const teamFiber = await teamCtx.plugin(SessionProjectionRegistry)
    const teamUi = ownSnapshot(teamCtx, { modelEnhancement: true, communicationEnhancement: false })
    const team = new agentTeam.TeamService(teamCtx, { enhancedSelection: true })
    assert.equal(team.selectionEnhanced, true)
    assert.equal(team.communicationEnhanced, false)
    await assert.rejects(
      team.sendMessage({ id: 'lead' }, { target: 'mate', content: [], delivery: 'steer' }),
      error => error.code === 'TEAM_ENHANCEMENT_DISABLED',
    )
    globalThis[planted] = Object.freeze({
      present: true,
      modelEnhancement: false,
      communicationEnhancement: false,
      nativeModelSelectionCompatibility: false,
    })
    const other = new Context()
    assert.throws(
      () => new agentTeam.TeamService(other, { enhancedSelection: true }),
      /collabUi assembly snapshot is required/,
    )
    assert.equal(other.get('agentTeams'), undefined)
    await teamFiber.dispose()
    const runtimeCtx = new Context()
    await runtimeCtx.plugin(() => {})
    const runtimeUi = ownSnapshot(runtimeCtx, { communicationEnhancement: false })
    const runtime = new subagent.SubagentRuntime(runtimeCtx, {
      deliverySelection: true,
      maxDepth: { get: () => 1 },
      maxActiveSubagents: { get: () => 8 },
    })
    assert.equal(runtime.modelDeliverySelection, false)
    await assert.rejects(
      runtime.sendMessage({ id: 'parent' }, 'child', [], { delivery: 'queue' }),
      error => error.code === 'DELIVERY_DISABLED',
    )
    assert.notEqual(runtimeUi.assemblySnapshot(), teamUi.assemblySnapshot())
    assert.equal(team.selectionEnhanced, true)
    assert.equal(globalThis[planted].communicationEnhancement, false)
  } finally {
    delete globalThis[planted]
    await harness.dispose()
  }
})

test('runtimeMode is a deprecated volatile managed-default compatibility field; seven preferences remain optional', async () => {
  const json = bootstrap.Config.toJSON()
  const rootNode = json.refs[String(json.uid)]
  const names = Object.keys(rootNode.dict).sort()
  assert.deepEqual(names, [
    'communicationEnhancement', 'completedChildContinuation', 'modelEnhancement', 'modelSource',
    'nativeModelSelectionCompatibility', 'runningChildGuidance', 'runtimeMode', 'teamRequestLimit',
  ])
  for (const name of names) {
    const node = json.refs[String(rootNode.dict[name])]
    if (name === 'runtimeMode') {
      assert.equal(node.type, 'union')
      assert.equal(node.meta.volatile, true)
      assert.equal(node.meta.default, 'managed')
      assert.deepEqual(node.list.map(uid => json.refs[String(uid)].value).sort(), ['managed', 'native'])
      continue
    }
    assert.equal(node.type, name === 'teamRequestLimit' ? 'number' : name === 'modelSource' ? 'union' : 'boolean')
    if (name === 'modelSource') assert.deepEqual(node.list.map(uid => json.refs[String(uid)].value).sort(), ['all', 'conversation', 'settings'])
    assert.equal(node.meta.volatile, true)
    assert.equal(node.meta.default, undefined)
    assert.notEqual(node.meta.required, true)
  }
  const collabUi = await readFile(new URL('../packages/agent-team/src/collab-ui.ts', import.meta.url), 'utf8')
  assert.match(collabUi, /installPresetAdapter\(ctx,/)
  assert.match(collabUi, /new ManagedRuntime\(ctx, 'managed'\)/)
  assert.match(collabUi, /ctx\.on\('internal\/config'/)
  assert.doesNotMatch(collabUi, /offline-workflow-required/)
  assert.doesNotMatch(collabUi, /nextMode/)
  const teamJson = agentTeam.TeamService.Config.toJSON()
  const teamRoot = teamJson.refs[String(teamJson.uid)]
  const enhanced = teamJson.refs[String(teamRoot.dict.enhancedSelection)]
  assert.equal(enhanced.meta.volatile, undefined)
  assert.equal(enhanced.meta.default, true)
  const delivery = subagent.SubagentRuntime.Config.toJSON()
  const deliveryRoot = delivery.refs[String(delivery.uid)]
  const deliveryNode = delivery.refs[String(deliveryRoot.dict.deliverySelection)]
  assert.equal(deliveryNode.meta.default, true)
  assert.notEqual(deliveryNode.meta.volatile, true)
})

test('Team routing resolves one roster identity before send and never retries a Team failure as a child', async () => {
  const harness = await bootTools()
  try {
    const installed = await installTeam(harness, { model: true, communication: true, queue: true })
    const exec = { agent: installed.agent, signal: new AbortController().signal }
    await installed.send.execute({ target: 'mate-id', message: 'id-addressed' }, exec)
    assert.equal(installed.calls[0][1].target, 'mate')
    await installed.send.execute({ target: 'mate', message: 'name-addressed' }, exec)
    assert.equal(installed.calls.length, 2)
    harness.agentTeams.sendMessage = async () => { throw Object.assign(new Error('delivery denied'), { code: 'TEAM_ENHANCEMENT_DISABLED' }) }
    await assert.rejects(installed.send.execute({ target: 'mate', message: 'do not retry' }, exec), /delivery denied/)
    assert.equal(harness.sends.length, 0)
    await installed.send.execute({ target: 'ordinary-child-session', message: 'native lineage must authorize' }, exec)
    assert.equal(harness.sends.length, 1)
    assert.equal(harness.sends[0][0], installed.agent)
    assert.equal(harness.sends[0][1], 'ordinary-child-session')
    harness.agentTeams.listMembers = () => [{ id: 'a', name: 'collision' }, { id: 'collision', name: 'b' }]
    await assert.rejects(installed.send.execute({ target: 'collision', message: 'ambiguous' }, exec), /ambiguous/)
    assert.equal(harness.sends.length, 1)
    harness.runtime.sendMessage = async () => { throw Object.assign(new Error('not a direct child'), { code: 'UNAUTHORIZED' }) }
    await assert.rejects(installed.send.execute({ target: 'foreign-session', message: 'no fallback' }, exec), /not a direct child/)
  } finally { await harness.dispose() }
})

test('official Settings and ConfigEditor are not importable from the read-only SDK', async () => {
  for (const name of ['@deepseek-ai/dsh-settings', '@deepseek-ai/dsh-config-editor', '@deepseek-ai/dsh-app-boot']) {
    assert.throws(() => require.resolve(name), /Cannot find module/)
  }
})
