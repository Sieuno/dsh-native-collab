import { clientRequire, clientContext } from './browser-fixture.mjs'
/**
 * RC5 GUI regression. Real Cordis/ToolRuntime/SystemPrompt plus production apply.
 * Settings/ConfigEditor Host fixture is not importable here and is not simulated.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { runInNewContext } from 'node:vm'
import { join } from 'node:path'

const root = new URL('../', import.meta.url)
const require = createRequire(root)
const importInstalled = async name => import(pathToFileURL(require.resolve(name)))
const dist = name => import(new URL(`../dist/${name}`, import.meta.url))

const { Context } = await importInstalled('@deepseek-ai/cordis')
const { ToolRuntime } = await importInstalled('@deepseek-ai/dsh-tools')
const { SystemPrompt } = await importInstalled('@deepseek-ai/dsh-system-prompt')
const { SessionProjectionRegistry } = await importInstalled('@deepseek-ai/dsh-session-projection')
const teamTools = await dist('tool-agent-team/index.js')
const subagentTools = await dist('tool-subagent/index.js')
const controlTools = await dist('tool-subagent-control/index.js')
const subagent = await dist('subagent/index.js')
const bootstrap = await dist('agent-team/bootstrap.js')
const agentTeam = await dist('agent-team/index.js')

const clientPath = join(import.meta.dirname, '..', 'dist', 'client.js')
const STATUS_IDS = [
  'dsh-native-collab-subagent',
  'dsh-native-collab-tool-subagent-control',
  'dsh-native-collab-tool-subagent-list-agents',
  'dsh-native-collab-agent-team',
  'dsh-native-collab-tool-agent-team',
  'dsh-native-collab-tool-subagent',
  'dsh-native-collab-tool-subagent-fork',
]

function visit(node, predicate, found = []) {
  if (Array.isArray(node)) {
    for (const child of node) visit(child, predicate, found)
    return found
  }
  if (node && typeof node === 'object') {
    if (predicate(node)) found.push(node)
    if (node.children) visit(node.children, predicate, found)
    if (node.props?.children) visit(node.props.children, predicate, found)
    if (node.props?.footer) visit(node.props.footer, predicate, found)
  }
  return found
}

function textOf(node, out = []) {
  if (typeof node === 'string' || typeof node === 'number') {
    out.push(String(node))
    return out.join('\n')
  }
  if (Array.isArray(node)) {
    for (const child of node) textOf(child, out)
    return out.join('\n')
  }
  if (node && typeof node === 'object') textOf(node.children, out)
  return out.join('\n')
}

function byId(node, id) {
  return visit(node, item => item.props?.['data-testid'] === id)[0]
}

async function loadClient() {
  let loaded
  const sandbox = { window: { __ModuleLoader__: { load(spec) { loaded = spec } } } }
  runInNewContext(await readFile(clientPath, 'utf8'), sandbox, { filename: clientPath })
  return loaded
}

function translator(locale) {
  return key => {
    const table = locale.collabUi
    if (typeof table?.[key] === 'string') return table[key]
    const value = key.split('.').reduce((current, part) => current?.[part], table)
    if (typeof value !== 'string') throw new Error(`missing locale ${key}`)
    return value
  }
}

function reactShim() {
  const hooks = []
  let hookIndex = 0
  let effect
  const React = {
    createElement(type, props, ...children) {
      return { type, props: props ?? {}, children: children.length ? children : props?.children }
    },
    useState(initial) {
      const index = hookIndex++
      if (!(index in hooks)) hooks[index] = initial
      return [hooks[index], value => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value }]
    },
    useEffect(callback) { effect = callback },
  }
  return {
    React,
    reset() { hookIndex = 0 },
    clear() { hookIndex = 0; hooks.length = 0; effect = undefined },
    async flush() {
      const dispose = effect?.()
      await new Promise(resolve => setImmediate(resolve))
      if (typeof dispose === 'function') dispose()
    },
  }
}

function readyRows() {
  return {
    profileName: 'synthetic',
    hmrEnabled: false,
    rows: STATUS_IDS.map(id => ({ id, current: 'enabled' })),
    assembly: {
      present: true,
      modelEnhancement: false,
      communicationEnhancement: true,
      nativeModelSelectionCompatibility: undefined,
    },
  }
}

function exactSchema() {
  return {
    uid: 'root',
    refs: {
      root: {
        type: 'object',
        dict: {
          modelEnhancement: 'a',
          communicationEnhancement: 'b',
          nativeModelSelectionCompatibility: 'c',
          runningChildGuidance: 'd', completedChildContinuation: 'e', teamRequestLimit: 'f',
        },
      },
      a: { type: 'boolean', meta: { volatile: true } },
      b: { type: 'boolean', meta: { volatile: true } },
      c: { type: 'boolean', meta: { volatile: true } },
      d: { type: 'boolean' }, e: { type: 'boolean' }, f: { type: 'number' },
    },
  }
}

async function renderSettings(options) {
  const loaded = await loadClient()
  const shim = reactShim()
  const plugin = loaded.factory(clientRequire(shim.React))
  const registrations = []
  await plugin.apply(clientContext({
    remote: { collabUi: { status: async () => options.status ?? readyRows() }, settings: options.settings },
    slots: {
      inject(_name, register) { register() },
      register(contract, component) {
        const value = { contract, component }
        registrations.push(value)
        return value
      },
    },
  }))
  const row = registrations.find(entry => entry.contract.name === 'plugins.row.config')
  const activation = registrations.find(entry => entry.contract.name === 'plugins.bundle.activation')
  const draw = () => {
    shim.reset()
    const element = row.component({
      ...row.contract.inject(),
      t: options.t,
      view: options.view ?? 'page',
      form: options.form,
      subject: options.subject ?? { kind: 'row', row: { rowId: 'dsh-native-collab-ui' } },
    })
    shim.reset()
    return typeof element?.type === 'function' ? element.type(element.props) : element
  }
  return { registrations, activation, shim, draw }
}

test('renderer keeps the original three slots and adds row config plus activation', async () => {
  const en = JSON.parse(await readFile(new URL('../locale/en.json', import.meta.url), 'utf8'))
  const zh = JSON.parse(await readFile(new URL('../locale/zh.json', import.meta.url), 'utf8'))
  const source = await readFile(clientPath, 'utf8')
  assert.equal(source.includes('plugins.detail.actions'), false)
  assert.equal(source.includes('ctx.dispose'), false)
  const { registrations, activation } = await renderSettings({ t: translator(en) })
  assert.deepEqual(registrations.slice(0, 3).map(entry => entry.contract.name), [
    'plugins.bundle.config', 'plugins.detail.badge', 'plugins.detail.section',
  ])
  assert.equal(registrations[3].contract.name, 'plugins.row.config')
  assert.equal(registrations[3].contract.key, '@dsh-native-collab/derived#dsh-native-collab-ui')
  assert.equal(activation.contract.name, 'plugins.bundle.activation')
  assert.equal(activation.contract.key, '@dsh-native-collab/derived')
  for (const locale of [en, zh]) {
    const page = await renderSettings({ t: translator(locale), view: 'summary' })
    const summary = page.draw()
    assert.match(String(summary?.props?.children ?? summary), /settings|设置/)
  }
})

test('renderer modal cancel and details write nothing; unknown namespace writes nothing', async () => {
  const en = JSON.parse(await readFile(new URL('../locale/en.json', import.meta.url), 'utf8'))
  const zh = JSON.parse(await readFile(new URL('../locale/zh.json', import.meta.url), 'utf8'))
  const writes = []
  const form = {
    state: { status: 'ready', revision: 4, writable: true, value: {} },
    async mutate(ops, revision) { writes.push({ kind: 'form', ops, revision }); return true },
  }
  const settings = {
    async describe() {
      return {
        ok: true,
        value: {
          writable: true,
          hasDocument: true,
          namespaces: [{ ns: '@dsh-native-collab/derived#dsh-native-collab-ui', schema: exactSchema(), revision: 9 }],
        },
      }
    },
    async mutate(ns, ops, revision) { writes.push({ kind: 'remote', ns, ops, revision }) },
  }
  for (const locale of [en, zh]) {
    writes.length = 0
    const view = await renderSettings({
      t: translator(locale),
      form,
      settings,
      status: { rows: [], assembly: null },
    })
    let page = view.draw()
    await view.shim.flush()
    page = view.draw()
    assert.ok(byId(page, 'settings-modal') === undefined)
    byId(page, 'switch-model').props.onChange({ target: { checked: false } })
    page = view.draw()
    byId(page, 'save-model').props.onClick()
    page = view.draw()
    const modal = visit(page, node => node.type === 'test-host-modal')[0]
    assert.equal(modal.props.open, true)
    assert.ok(modal.props.title)
    byId(page, 'modal-cancel').props.onClick()
    page = view.draw()
    assert.equal(byId(page, 'settings-modal'), undefined)
    assert.equal(writes.length, 0)
    byId(page, 'save-model').props.onClick()
    page = view.draw()
    visit(page, node => node.type === 'test-host-modal')[0].props.onClose()
    assert.equal(writes.length, 0)
  }
  writes.length = 0
  const remoteOnly = await renderSettings({ t: translator(en), settings, status: readyRows() })
  let page = remoteOnly.draw()
  await remoteOnly.shim.flush()
  page = remoteOnly.draw()
  byId(page, 'switch-communication').props.onChange({ target: { checked: false } })
  page = remoteOnly.draw()
  byId(page, 'save-communication').props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(writes.length, 0)
  assert.match(textOf(remoteOnly.draw()), /namespace was not uniquely verified/)
})

test('renderer saves one group through the row form and does not rewrite the other', async () => {
  const en = JSON.parse(await readFile(new URL('../locale/en.json', import.meta.url), 'utf8'))
  const writes = []
  const form = {
    state: {
      status: 'ready',
      revision: 7,
      writable: true,
      value: { communicationEnhancement: true },
    },
    async mutate(ops, revision) { writes.push({ ops, revision }); return true },
  }
  const view = await renderSettings({ t: translator(en), form, status: readyRows() })
  let page = view.draw()
  await view.shim.flush()
  page = view.draw()
  assert.ok(byId(page, 'saved-state'))
  byId(page, 'switch-model').props.onChange({ target: { checked: true } })
  byId(page, 'switch-native-compat').props.onChange({ target: { checked: false } })
  page = view.draw()
  byId(page, 'save-model').props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(writes.length, 1)
  assert.equal(JSON.stringify(writes[0].ops), JSON.stringify([
    { op: 'set', path: ['modelEnhancement'], value: true },
    { op: 'set', path: ['nativeModelSelectionCompatibility'], value: false },
  ]))
  assert.equal(writes[0].revision, 7)
  page = view.draw()
  assert.match(textOf(page), /not applied to the current Agent/)
  byId(page, 'switch-communication').props.onChange({ target: { checked: false } })
  page = view.draw()
  byId(page, 'save-communication').props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(writes.length, 2)
  assert.equal(JSON.stringify(writes[1].ops), JSON.stringify([{ op: 'set', path: ['communicationEnhancement'], value: false }]))
})

test('activation later and details do not write', async () => {
  const en = JSON.parse(await readFile(new URL('../locale/en.json', import.meta.url), 'utf8'))
  const writes = []
  const view = await renderSettings({ t: translator(en) })
  let dismissed = 0
  let details = 0
  const element = view.activation.component({
    t: translator(en),
    onDismiss: () => { dismissed += 1 },
    onOpenDetails: () => { details += 1 },
  })
  const dialog = element
  assert.equal(dialog.type, 'test-host-modal')
  assert.equal(dialog.props.open, true)
  assert.equal(byId(dialog, 'activation-dismiss') !== undefined, true)
  byId(dialog, 'activation-dismiss').props.onClick()
  byId(dialog, 'activation-details').props.onClick()
  assert.equal(dismissed, 1)
  assert.equal(details, 1)
  assert.equal(writes.length, 0)
  assert.ok(dialog.props.title)
})

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
      assert.match(policy, flags.model ? /Selection enhancement is on/ : /Selection enhancement is off/)
      assert.match(policy, flags.communication ? /send_message accepts optional delivery|does not accept delivery/ : /keeps the native steer path/)
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

function freshSession() {
  const events = []
  const session = {
    id: 'fresh',
    header: { origin: 'user' },
    inheritedEventCount: 0,
    firstLiveSeq: 0,
    seq: 0,
    eventAt(seq) { return events[Number(seq)] },
    snapshotEvents() { return events.slice() },
    append(type, data) {
      const event = { type, data, seq: session.seq }
      events.push(event)
      session.seq += 1
      return event
    },
  }
  return session
}

async function bootDelegation() {
  const harness = await bootTools()
  const providers = new Map()
  harness.runtime.getProvider = name => providers.get(name)
  harness.runtime.registerProvider = provider => { providers.set(provider.name, provider) }
  harness.runtime.resolveMaxDepth = () => 1
  harness.runtime.registerProvider({
    name: 'subagent',
    inheritsParentContext: false,
    capabilities: { agentOptions: true, depthLimit: true, agentPreset: true },
  })
  return harness
}

function ownSnapshot(ctx, config) {
  return new bootstrap.default(ctx, config)
}

test('ordinary subagent off stays native and on follows compat; fork stays none', async () => {
  const off = await bootDelegation()
  try {
    ownSnapshot(off.ctx, {
      modelEnhancement: false,
      communicationEnhancement: false,
      nativeModelSelectionCompatibility: false,
    })
    await subagentTools.apply(off.ctx, { provider: 'subagent', nativeModelSelectionCompatibility: false }, freshSession())
    const tool = off.ctx.tools.get('subagent')
    assert.equal(tool.parameters.properties.provider !== undefined, true)
    assert.equal(tool.parameters.properties.model !== undefined, true)
    assert.equal(typeof off.ctx.tools.get('list_subagent_models')?.execute, 'function')
  } finally {
    await off.dispose()
  }

  const live = await bootDelegation()
  try {
    ownSnapshot(live.ctx, {
      modelEnhancement: true,
      communicationEnhancement: true,
      nativeModelSelectionCompatibility: false,
    })
    await subagentTools.apply(live.ctx, {
      provider: 'subagent',
      toolName: 'subagent-live',
      nativeModelSelectionCompatibility: true,
    })
    assert.equal(live.ctx.tools.get('subagent-live').parameters.properties.provider !== undefined, true)
  } finally {
    await live.dispose()
  }

  const standing = await bootDelegation()
  try {
    ownSnapshot(standing.ctx, {
      modelEnhancement: true,
      communicationEnhancement: true,
      nativeModelSelectionCompatibility: true,
    })
    await assert.rejects(subagentTools.apply(standing.ctx, {
      provider: 'subagent',
      toolName: 'subagent-native-standing',
      nativeModelSelectionCompatibility: false,
    }), /standing nativeModelSelectionCompatibility requires a scoped preset Context/)
  } finally {
    await standing.dispose()
  }

  const forked = await bootDelegation()
  try {
    const fork = await dist('tool-subagent/fork.js')
    ownSnapshot(forked.ctx, {
      modelEnhancement: false,
      communicationEnhancement: true,
      nativeModelSelectionCompatibility: true,
    })
    await fork.apply(forked.ctx, { provider: 'subagent' })
    const forkTool = forked.ctx.tools.get('subagent_fork')
    assert.equal(forkTool.parameters.properties.provider, undefined)
    assert.equal(forkTool.parameters.properties.model, undefined)
    assert.equal(forked.ctx.tools.get('list_subagent_models'), undefined)
  } finally {
    await forked.dispose()
  }
})

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
  const planted = Symbol.for('@dsh-native-collab/derived.assemblySnapshot')
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

test('control config is six optional next-assembly fields with no default', async () => {
  const json = bootstrap.Config.toJSON()
  const rootNode = json.refs[String(json.uid)]
  const names = Object.keys(rootNode.dict).sort()
  assert.deepEqual(names, [
    'communicationEnhancement', 'completedChildContinuation',
    'modelEnhancement', 'nativeModelSelectionCompatibility', 'runningChildGuidance', 'teamRequestLimit',
  ])
  for (const name of names) {
    const node = json.refs[String(rootNode.dict[name])]
    assert.equal(node.type, name === 'teamRequestLimit' ? 'number' : 'boolean')
    assert.equal(node.meta.volatile, true)
    assert.equal(node.meta.default, undefined)
    assert.notEqual(node.meta.required, true)
  }
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

test('budget and permission modules are not switched by the overlay helper', async () => {
  const budget = await readFile(new URL('../packages/agent-team/src/budget.ts', import.meta.url), 'utf8')
  const permissions = await readFile(new URL('../packages/subagent/src/index.ts', import.meta.url), 'utf8')
  assert.equal(budget.includes('modelEnhancement'), false)
  assert.equal(budget.includes('communicationEnhancement'), false)
  assert.match(permissions, /deliverySelection: z\.boolean\(\)\.default\(true\)/)
  assert.equal(permissions.includes('deliverySelection: z.boolean().default(true).volatile()'), false)
})

test('RC6 Team routing resolves one roster identity before send and never retries a Team failure as a child', async () => {
  const harness = await bootTools()
  try {
    const installed = await installTeam(harness, { model: true, communication: true, queue: true })
    const exec = { agent: installed.agent, signal: new AbortController().signal }
    await installed.send.execute({ target: 'mate-id', message: 'id-addressed' }, exec)
    assert.equal(installed.calls[0][1].target, 'mate')
    await installed.send.execute({ target: 'mate', message: 'name-addressed' }, exec)
    assert.equal(installed.calls.length, 2)
    harness.agentTeams.sendMessage = async () => { throw Object.assign(new Error('denied by budget'), { code: 'TEAM_BUDGET_EXHAUSTED' }) }
    await assert.rejects(installed.send.execute({ target: 'mate', message: 'do not retry' }, exec), /denied by budget/)
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

test('RC6 numeric quota validates before mutation and communication saves only its own three fields', async () => {
  const en = JSON.parse(await readFile(new URL('../locale/en.json', import.meta.url), 'utf8'))
  const writes = []
  const view = await renderSettings({ t: translator(en), status: readyRows(), form: {
    state: { status: 'ready', revision: 1, writable: true, value: {} },
    async mutate(ops, revision) { writes.push({ ops, revision }); return true },
  } })
  view.draw(); await view.shim.flush()
  for (const bad of ['', '0', '-1', '1.5', '1e999', '9007199254740992', 'abc']) {
    byId(view.draw(), 'team-request-limit').props.onChange({ target: { value: bad } })
    assert.equal(byId(view.draw(), 'save-quota').props.disabled, true)
  }
  assert.equal(writes.length, 0)
  byId(view.draw(), 'team-request-limit').props.onChange({ target: { value: '48' } })
  byId(view.draw(), 'save-quota').props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(JSON.stringify(writes[0].ops), JSON.stringify([{ op: 'set', path: ['teamRequestLimit'], value: 48 }]))
  byId(view.draw(), 'switch-running-child').props.onChange({ target: { checked: false } })
  byId(view.draw(), 'switch-completed-child').props.onChange({ target: { checked: false } })
  byId(view.draw(), 'save-communication').props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(JSON.stringify(writes[1].ops), JSON.stringify([
    { op: 'set', path: ['runningChildGuidance'], value: false },
    { op: 'set', path: ['completedChildContinuation'], value: false },
  ]))
})

test('official Settings and ConfigEditor are not importable from the read-only SDK', async () => {
  for (const name of ['@deepseek-ai/dsh-settings', '@deepseek-ai/dsh-config-editor', '@deepseek-ai/dsh-app-boot']) {
    assert.throws(() => require.resolve(name), /Cannot find module/)
  }
})
