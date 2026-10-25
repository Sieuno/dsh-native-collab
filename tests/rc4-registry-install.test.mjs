/**
 * Positive registry regression for the RC4 derived delegation apply.
 *
 * Real SDK: Cordis Context, SystemPrompt, ToolRuntime, SessionProjectionRegistry.
 * Stubs, labeled below: subagents, subagentModelSelection, llm, agents, sessions,
 * agentPresets, and Session log objects. startActivation does not create a child,
 * check permissions, or call a model. This is not a Host/HTTP/GUI acceptance run.
 *
 * Luna's negative review is a different file and is not modified here.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const rootUrl = new URL('../', import.meta.url)
const require = createRequire(rootUrl)
const importInstalled = async (name) => import(pathToFileURL(require.resolve(name)))
const [
  { Context },
  { ToolRuntime, defineTool },
  { SystemPrompt },
  projectionModule,
  { createScope },
] = await Promise.all([
  importInstalled('@deepseek-ai/cordis'),
  importInstalled('@deepseek-ai/dsh-tools'),
  importInstalled('@deepseek-ai/dsh-system-prompt'),
  importInstalled('@deepseek-ai/dsh-session-projection'),
  importInstalled('@deepseek-ai/dsh-scope'),
])
const SessionProjectionRegistry = projectionModule.SessionProjectionRegistry
const { applyDerivedDelegation } = await import(new URL('../dist/tool-subagent/install.js', import.meta.url))
const freshEntry = await import(new URL('../dist/tool-subagent/index.js', import.meta.url))
const forkEntry = await import(new URL('../dist/tool-subagent/fork.js', import.meta.url))
const own = await import(new URL('../dist/agent-team/own-model.js', import.meta.url))
const CollabUi = (await import(new URL('../dist/agent-team/bootstrap.js', import.meta.url))).default

const listed = { provider: 'p', model: 'listed' }
const unlisted = { provider: 'p', model: 'unlisted' }

/** STUB Session log. The real projection registry reads these methods. */
function stubSession(spec = {}) {
  const events = []
  const session = {
    id: spec.id ?? 'session-1',
    header: spec.header ?? { origin: 'user' },
    inheritedEventCount: spec.inheritedEventCount ?? 0,
    firstLiveSeq: spec.firstLiveSeq ?? 0,
    seq: 0,
    requestHeader() { return spec.requestHeader },
    eventAt(seq) { return events[Number(seq)] },
    snapshotEvents() { return events.slice() },
    append(type, data) {
      const event = { type, data, seq: session.seq }
      events.push(event)
      session.seq += 1
      return event
    },
  }
  session.appends = () => events.length
  if (spec.endSeed) session.append('session/end-seed', {})
  if (spec.policy) session.append('subagent/model-selection-policy', { allowedModels: spec.policy.map(route => ({ ...route })) })
  session.seedAppends = session.appends()
  return session
}

function stubAgent(id, agentCtx, session, options) {
  return {
    id,
    ctx: agentCtx,
    session,
    options: options ?? { provider: 'backend', model: 'parent-model', maxTokens: 128 },
  }
}

/** STUB subagent runtime. Not SubagentRuntime. */
class StubSubagents {
  constructor() {
    this.providers = new Map()
    this.activations = []
    this.hostDepth = 3
    this.ctx = undefined
  }
  bind(ctx) {
    this.ctx = ctx
    return this
  }
  getProvider(name) { return this.providers.get(name) }
  resolveMaxDepth(configured) {
    if (configured === 'provider-managed') return undefined
    if (configured !== undefined) return configured
    return this.hostDepth
  }
  async startActivation(spec) {
    this.activations.push(spec)
    return { childId: 'stub-child' }
  }
  registerProvider(provider) {
    this.providers.set(provider.name, provider)
    this.ctx.emit('subagent/provider-added', provider)
    return () => {
      this.providers.delete(provider.name)
      this.ctx.emit('subagent/provider-removed', provider.name)
    }
  }
}

/** STUB host allowlist. Not the official settings service. */
class StubSettings {
  constructor(value) {
    this.value = value ?? { enabled: true, allowedModels: [listed, unlisted] }
    this.reads = 0
  }
  current() {
    this.reads += 1
    if (this.value.enabled === true && this.value.allowedModels.length === 0) {
      throw new Error('enabled subagent model selection requires at least one allowed model')
    }
    return this.value
  }
}

/** STUB LLM registry. resolveCallConfig is not a network call. */
class StubLlm {
  constructor() {
    this.providers = [{ id: 'p', name: 'P' }]
    this.models = [{ id: 'listed', name: 'Listed' }]
    this.calls = []
    this.missing = new Set()
  }
  listProviders() { return this.providers }
  async listModels() { return this.models }
  async resolveCallConfig(config) {
    this.calls.push({ ...config })
    if (this.missing.has(config.provider)) {
      const error = new Error(`NO_ADAPTER ${config.provider}`)
      error.code = 'NO_ADAPTER'
      throw error
    }
    return config
  }
}

/** STUB agent registry. */
class StubAgents {
  constructor() { this.items = [] }
  list() { return this.items }
  get(id) { return this.items.find(agent => agent.id === id) }
}

/** STUB session registry. Inheritance looks up the same object the projection keyed. */
class StubSessions {
  constructor() { this.items = new Map() }
  get(id) { return this.items.get(id) }
}

/** STUB preset documents. */
class StubPresets {
  async readDocument(id) { return { id, description: `${id} desc` } }
}

function capableProvider(overrides = {}) {
  return {
    name: 'subagent',
    inheritsParentContext: false,
    capabilities: {
      agentOptions: true,
      depthLimit: true,
      agentPreset: true,
      ...overrides.capabilities,
    },
    ...overrides,
    capabilities: {
      agentOptions: true,
      depthLimit: true,
      agentPreset: true,
      ...overrides.capabilities,
    },
  }
}

async function boot(options = {}) {
  const ctx = new Context()
  const fibers = []
  fibers.push(await ctx.plugin(SystemPrompt))
  fibers.push(await ctx.plugin(ToolRuntime))
  fibers.push(await ctx.plugin(SessionProjectionRegistry))
  fibers.push(await ctx.plugin(CollabUi, {}))
  const settings = new StubSettings(options.settingsValue)
  const subagents = new StubSubagents()
  const llm = new StubLlm()
  const agents = new StubAgents()
  const sessions = new StubSessions()
  fibers.push(await ctx.plugin((pluginCtx) => {
    subagents.bind(pluginCtx)
    if (options.settings !== false) pluginCtx.reflect.provide('subagentModelSelection', settings)
    pluginCtx.reflect.provide('subagents', subagents)
    pluginCtx.reflect.provide('llm', llm)
    pluginCtx.reflect.provide('agents', agents)
    pluginCtx.reflect.provide('sessions', sessions)
    pluginCtx.reflect.provide('agentPresets', new StubPresets())
  }))
  const scopes = []
  return {
    ctx,
    settings,
    subagents,
    llm,
    agents,
    sessions,
    scope(key, parent) {
      const scoped = createScope(ctx, key, parent === undefined ? undefined : { parent })
      scopes.push(scoped)
      return scoped
    },
    adopt(scoped) {
      scopes.push(scoped)
      return scoped
    },
    async dispose() {
      for (const scoped of scopes.reverse()) await scoped.dispose()
      for (const fiber of fibers.reverse()) await fiber.dispose()
    },
  }
}

function injected(harness, body) {
  return new Promise((resolve, reject) => {
    try {
      harness.ctx.plugin({
        inject: [
          'tools', 'subagents', 'systemPrompt', 'sessionProjections',
          'agents', 'sessions', 'llm', 'agentPresets', 'subagentModelSelection',
        ],
        apply(pluginCtx) {
          Promise.resolve()
            .then(() => body(pluginCtx))
            .then(resolve, reject)
        },
      })
    } catch (error) {
      reject(error)
    }
  })
}

async function until(read, label) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const value = read()
    if (value) return value
    await new Promise(resolve => setTimeout(resolve, 15))
  }
  throw new Error(`timed out waiting for ${label}`)
}

function signal() {
  return new AbortController().signal
}

async function call(tool, agent, args, execSignal = signal()) {
  return tool.execute({ description: 'do work', prompt: 'work', ...args }, { agent, signal: execSignal })
}

test('llmProvider is display-only and does not replace the backend provider field', async () => {
  const ownFields = own.rosterModelFields({
    ownModel: 'own-m',
    ownProvider: 'own-p',
    agentLive: true,
    creationModel: 'create-m',
    creationProvider: 'create-p',
  })
  assert.deepEqual(ownFields, { model: 'own-m', modelSource: 'own-request', llmProvider: 'own-p' })
  assert.equal(Object.hasOwn(ownFields, 'provider'), false)
  assert.deepEqual(own.rosterModelFields({
    agentLive: true,
    creationModel: 'create-m',
    creationProvider: 'create-p',
  }), { model: 'create-m', modelSource: 'creation-default', llmProvider: 'create-p' })
  assert.deepEqual(own.rosterModelFields({ agentLive: false }), {})
  const ignored = own.applyOwnModel(own.initOwnModel({}, 2), {
    type: 'request/header',
    seq: 1,
    data: { header: { config: { provider: 'old', model: 'old-m' } } },
  })
  assert.equal(ignored.model, undefined)
  const recorded = own.applyOwnModel(own.initOwnModel({}, 2), {
    type: 'request/header',
    seq: 2,
    data: { header: { config: { provider: 'own-p', model: 'own-m' } } },
  })
  assert.equal(recorded.provider, 'own-p')
  assert.equal(recorded.model, 'own-m')
  const roster = await readFile(new URL('../packages/agent-team/src/roster.ts', import.meta.url), 'utf8')
  const toolSource = await readFile(new URL('../packages/tool-agent-team/src/index.ts', import.meta.url), 'utf8')
  assert.match(roster, /provider: member\.provider/)
  assert.match(roster, /ownProvider/)
  assert.match(roster, /creationProvider/)
  assert.match(toolSource, /llmProvider: \{ type: 'string' \}/)
  assert.match(toolSource, /provider: \{ type: 'string' \}/)
})

test('OFF unscoped apply registers a real tool with output.render and no Session', async () => {
  const harness = await boot()
  try {
    harness.subagents.registerProvider(capableProvider())
    await applyDerivedDelegation(harness.ctx, {
      provider: 'subagent',
      toolName: 'subagent',
      ownsDiscovery: true,
      nativeModelSelectionCompatibility: false,
    })
    const tool = harness.ctx.tools.get('subagent')
    assert.equal(typeof tool.output.render, 'function')
    assert.equal(tool.parameters.type, 'object')
    assert.equal(tool.parameters.properties.prompt.type, 'string')
    assert.equal(tool.parameters.properties.provider.type, 'string')
    assert.equal(typeof harness.ctx.tools.get('list_subagent_models').execute, 'function')
    const rendered = tool.output.render({}, { kind: 'activation', subagentId: 'stub-child' })
    assert.equal(rendered[0].text, 'started subagent stub-child')
    assert.equal(harness.settings.reads, 0)
  } finally {
    await harness.dispose()
  }
})

test('OFF live allowlist, unlisted id, removal, enabled false, and NO_ADAPTER do not fallback', async () => {
  const harness = await boot()
  try {
    harness.subagents.registerProvider(capableProvider())
    await freshEntry.apply(harness.ctx, { provider: 'subagent', nativeModelSelectionCompatibility: false })
    const tool = harness.ctx.tools.get('subagent')
    const list = harness.ctx.tools.get('list_subagent_models')
    const agent = stubAgent('parent', harness.ctx, stubSession(), { provider: 'backend', model: 'parent-model', maxTokens: 64 })
    const listedText = await list.execute({ provider: 'p' }, { agent, signal: signal() })
    assert.match(listedText, /p\/unlisted — unadvertised/)
    assert.match(listedText, /p\/listed — Listed/)
    const execSignal = signal()
    const started = await call(tool, agent, { cwd: 'child-dir', provider: 'p', model: 'unlisted' }, execSignal)
    assert.deepEqual(started, { kind: 'activation', subagentId: 'stub-child' })
    const spec = harness.subagents.activations[0]
    assert.equal(spec.delivery, 'parent')
    assert.equal(spec.signal, execSignal)
    assert.equal(spec.request.parent, agent)
    assert.equal(spec.request.cwd, 'child-dir')
    assert.equal(spec.request.prompt[0].text, 'work')
    assert.equal(spec.request.agentOptions.provider, 'p')
    assert.equal(spec.request.agentOptions.model, 'unlisted')
    assert.equal(spec.provider, 'subagent')
    const before = harness.subagents.activations.length
    harness.settings.value = { enabled: true, allowedModels: [listed] }
    await assert.rejects(call(tool, agent, { provider: 'p', model: 'unlisted' }), /not allowed for this Session/)
    assert.equal(harness.subagents.activations.length, before)
    assert.equal(harness.subagents.activations[0].request.agentOptions.model, 'unlisted')
    harness.settings.value = { enabled: false, allowedModels: [listed, unlisted] }
    await assert.rejects(call(tool, agent, { provider: 'p', model: 'listed' }), /disabled by the current host setting/)
    const omitted = await call(tool, agent, {})
    assert.equal(omitted.subagentId, 'stub-child')
    assert.equal(harness.subagents.activations.at(-1).request.agentOptions, undefined)
    harness.llm.missing.add('p')
    harness.settings.value = { enabled: true, allowedModels: [listed] }
    await assert.rejects(call(tool, agent, { provider: 'p', model: 'listed' }), /NO_ADAPTER p/)
    assert.equal(harness.llm.calls.at(-1).provider, 'p')
    assert.equal(harness.llm.calls.at(-1).model, 'listed')
    assert.equal(harness.subagents.activations.at(-1).request.agentOptions, undefined)
  } finally {
    await harness.dispose()
  }
})

test('provider add and remove mounts and unmounts the real registry entry', async () => {
  const harness = await boot()
  try {
    await applyDerivedDelegation(harness.ctx, {
      provider: 'subagent',
      ownsDiscovery: true,
      nativeModelSelectionCompatibility: false,
    })
    assert.equal(harness.ctx.tools.get('subagent'), undefined)
    const remove = harness.subagents.registerProvider(capableProvider())
    const tool = await until(() => harness.ctx.tools.get('subagent'), 'provider-added mount')
    assert.equal(typeof tool.output.render, 'function')
    remove()
    await until(() => harness.ctx.tools.get('subagent') === undefined, 'provider-removed unmount')
    harness.subagents.registerProvider(capableProvider())
    await until(() => harness.ctx.tools.get('subagent'), 'provider-added remount')
  } finally {
    await harness.dispose()
  }
})

test('fork entry has no discovery and ignores the compatibility flag', async () => {
  const harness = await boot({ settings: false })
  try {
    harness.subagents.registerProvider(capableProvider({ capabilities: { agentOptions: false, agentPreset: false } }))
    await forkEntry.apply(harness.ctx, {
      provider: 'subagent',
      nativeModelSelectionCompatibility: true,
    })
    const tool = harness.ctx.tools.get('subagent_fork')
    assert.equal(tool.name, 'subagent_fork')
    assert.equal(tool.parameters.properties.provider, undefined)
    assert.equal(harness.ctx.tools.get('list_subagent_models'), undefined)
    const agent = stubAgent('parent', harness.ctx, stubSession())
    await assert.rejects(call(tool, agent, { provider: 'p', model: 'listed' }), /disabled for this tool instance/)
    const started = await call(tool, agent, { cwd: 'fork-dir' })
    assert.equal(started.kind, 'activation')
    assert.equal(harness.subagents.activations[0].delivery, 'parent')
    assert.equal(harness.subagents.activations[0].request.cwd, 'fork-dir')
    assert.equal(harness.subagents.activations[0].request.agentOptions, undefined)
  } finally {
    await harness.dispose()
  }
})

test('ON unscoped standing refuses and does not register', async () => {
  const harness = await boot()
  try {
    harness.subagents.registerProvider(capableProvider())
    await assert.rejects(applyDerivedDelegation(harness.ctx, {
      provider: 'subagent',
      ownsDiscovery: true,
      nativeModelSelectionCompatibility: true,
    }), /standing nativeModelSelectionCompatibility requires a scoped preset Context/)
    assert.equal(harness.ctx.tools.get('subagent'), undefined)
    assert.equal(harness.settings.reads, 0)
  } finally {
    await harness.dispose()
  }
})

test('ON standing captures per Agent, inherits, restores, and does not follow a later allowlist', async () => {
  const harness = await boot({ settingsValue: { enabled: true, allowedModels: [listed] } })
  try {
    harness.subagents.registerProvider(capableProvider())
    const compositionKey = {}
    const freshKey = {}
    const oldKey = {}
    const childKey = {}
    const restoredKey = {}
    const foreignKey = {}
    let composition
    let freshScope
    let oldScope
    let childScope
    let restoredScope
    let foreignScope
    const freshSession = stubSession({ id: 'fresh' })
    const oldSession = stubSession({ id: 'old', endSeed: true })
    const parentSession = stubSession({ id: 'parent', policy: [{ provider: 'p', model: 'parent-route' }] })
    const childSession = stubSession({
      id: 'child',
      header: { origin: 'subagent', parentSession: 'parent' },
    })
    const restoredSession = stubSession({ id: 'restored', policy: [{ provider: 'p', model: 'restored-route' }] })
    harness.sessions.items.set('parent', parentSession)
    const freshAgent = stubAgent('fresh', harness.ctx, freshSession)
    const oldAgent = stubAgent('old', harness.ctx, oldSession)
    const childAgent = stubAgent('child', harness.ctx, childSession)
    const restoredAgent = stubAgent('restored', harness.ctx, restoredSession)
    const foreignAgent = stubAgent('foreign', harness.ctx, stubSession({ id: 'foreign' }))
    await injected(harness, async (pluginCtx) => {
      composition = harness.adopt(createScope(pluginCtx, compositionKey))
      freshScope = harness.adopt(createScope(pluginCtx, freshKey, { parent: compositionKey }))
      oldScope = harness.adopt(createScope(pluginCtx, oldKey, { parent: compositionKey }))
      childScope = harness.adopt(createScope(pluginCtx, childKey, { parent: compositionKey }))
      restoredScope = harness.adopt(createScope(pluginCtx, restoredKey, { parent: compositionKey }))
      foreignScope = harness.adopt(createScope(pluginCtx, foreignKey))
      freshAgent.ctx = freshScope.ctx
      oldAgent.ctx = oldScope.ctx
      childAgent.ctx = childScope.ctx
      restoredAgent.ctx = restoredScope.ctx
      foreignAgent.ctx = foreignScope.ctx
      harness.agents.items.push(freshAgent, oldAgent, childAgent, restoredAgent, foreignAgent)
      await applyDerivedDelegation(composition.ctx, {
        provider: 'subagent',
        ownsDiscovery: true,
        nativeModelSelectionCompatibility: true,
      })
    })
    const freshTool = await until(() => harness.ctx.tools.get('subagent', freshKey), 'fresh scoped tool')
    const oldTool = await until(() => harness.ctx.tools.get('subagent', oldKey), 'historical scoped tool')
    const childTool = await until(() => harness.ctx.tools.get('subagent', childKey), 'child scoped tool')
    const restoredTool = await until(() => harness.ctx.tools.get('subagent', restoredKey), 'restored scoped tool')
    assert.equal(harness.ctx.tools.get('subagent'), undefined)
    assert.equal(harness.ctx.tools.get('subagent', foreignKey), undefined)
    assert.equal(harness.settings.reads, 1)
    assert.equal(freshSession.appends(), 1)
    assert.equal(oldSession.appends(), oldSession.seedAppends)
    assert.equal(childSession.appends(), 1)
    assert.equal(restoredSession.appends(), restoredSession.seedAppends)
    assert.equal(freshTool.parameters.properties.provider.type, 'string')
    assert.equal(oldTool.parameters.properties.provider, undefined)
    assert.equal(typeof harness.ctx.tools.get('list_subagent_models', freshKey).execute, 'function')
    assert.equal(harness.ctx.tools.get('list_subagent_models', oldKey), undefined)
    harness.settings.value = { enabled: true, allowedModels: [{ provider: 'p', model: 'later' }] }
    const started = await call(freshTool, freshAgent, { provider: 'p', model: 'listed' })
    assert.equal(started.kind, 'activation')
    await assert.rejects(call(freshTool, freshAgent, { provider: 'p', model: 'later' }), /not allowed for this Session/)
    assert.equal(harness.settings.reads, 1)
    await assert.rejects(call(oldTool, oldAgent, { provider: 'p', model: 'listed' }), /disabled for this tool instance/)
    const inherited = await call(childTool, childAgent, { provider: 'p', model: 'parent-route' })
    assert.equal(inherited.kind, 'activation')
    await assert.rejects(call(childTool, childAgent, { provider: 'p', model: 'listed' }), /not allowed for this Session/)
    const restored = await call(restoredTool, restoredAgent, { provider: 'p', model: 'restored-route' })
    assert.equal(restored.kind, 'activation')
    const nextKey = {}
    const nextScope = harness.adopt(createScope(composition.ctx, nextKey, { parent: compositionKey }))
    const nextSession = stubSession({ id: 'next' })
    const nextAgent = stubAgent('next', nextScope.ctx, nextSession)
    harness.agents.items.push(nextAgent)
    composition.ctx.emit('agent/created', { agent: nextAgent })
    const nextTool = await until(() => harness.ctx.tools.get('subagent', nextKey), 'new agent tool')
    assert.equal(harness.settings.reads, 2)
    const later = await call(nextTool, nextAgent, { provider: 'p', model: 'later' })
    assert.equal(later.kind, 'activation')
    await assert.rejects(call(freshTool, freshAgent, { provider: 'p', model: 'later' }), /not allowed for this Session/)
  } finally {
    await harness.dispose()
  }
})

test('OFF standing still installs without a Session and reads the live allowlist', async () => {
  const harness = await boot({ settingsValue: { enabled: true, allowedModels: [listed] } })
  try {
    harness.subagents.registerProvider(capableProvider())
    const key = {}
    let scoped
    const agent = stubAgent('live', harness.ctx, stubSession())
    await injected(harness, async (pluginCtx) => {
      scoped = harness.adopt(createScope(pluginCtx, key))
      agent.ctx = scoped.ctx
      harness.agents.items.push(agent)
      await applyDerivedDelegation(scoped.ctx, {
        provider: 'subagent',
        ownsDiscovery: true,
        nativeModelSelectionCompatibility: false,
      })
    })
    const tool = await until(() => harness.ctx.tools.get('subagent', key), 'live standing tool')
    assert.equal(harness.settings.reads, 0)
    await call(tool, agent, { provider: 'p', model: 'listed' })
    assert.equal(harness.settings.reads, 1)
    harness.settings.value = { enabled: true, allowedModels: [unlisted] }
    await assert.rejects(call(tool, agent, { provider: 'p', model: 'listed' }), /not allowed for this Session/)
    await call(tool, agent, { provider: 'p', model: 'unlisted' })
    assert.equal(harness.ctx.tools.get('subagent'), undefined)
  } finally {
    await harness.dispose()
  }
})

test('agentOptions, cwd, preset, and depth are forwarded or rejected by capability', async () => {
  const harness = await boot()
  try {
    harness.subagents.registerProvider(capableProvider())
    await applyDerivedDelegation(harness.ctx, {
      provider: 'subagent',
      ownsDiscovery: true,
      nativeModelSelectionCompatibility: false,
      agentOptions: { provider: 'p', model: 'listed', maxTokens: 32 },
      allowedAgentPresets: ['alpha', 'beta'],
      agentPreset: 'alpha',
      maxDepth: 2,
    })
    const tool = harness.ctx.tools.get('subagent')
    assert.deepEqual(tool.parameters.properties.agent_preset.enum, ['alpha', 'beta'])
    const agent = stubAgent('parent', harness.ctx, stubSession())
    await call(tool, agent, { cwd: 'from-call', agent_preset: 'beta' })
    const spec = harness.subagents.activations[0]
    assert.equal(spec.request.cwd, 'from-call')
    assert.equal(spec.request.agentPreset, 'beta')
    assert.equal(spec.request.maxDepth, 2)
    assert.equal(spec.request.agentOptions.provider, 'p')
    assert.equal(spec.request.agentOptions.model, 'listed')
    assert.equal(spec.request.agentOptions.maxTokens, 32)
    assert.equal(spec.delivery, 'parent')
    await call(tool, agent, {})
    assert.equal(harness.subagents.activations[1].request.agentPreset, 'alpha')
  } finally {
    await harness.dispose()
  }
})

test('capability and same-scope collisions fail closed', async () => {
  const missingSelection = await boot()
  try {
    missingSelection.subagents.registerProvider(capableProvider({ capabilities: { agentOptions: false } }))
    await assert.rejects(applyDerivedDelegation(missingSelection.ctx, {
      provider: 'subagent',
      ownsDiscovery: true,
      nativeModelSelectionCompatibility: false,
    }), /does not support child model selection/)
    assert.equal(missingSelection.ctx.tools.get('subagent'), undefined)
  } finally {
    await missingSelection.dispose()
  }
  const missingDepth = await boot()
  try {
    missingDepth.subagents.registerProvider(capableProvider({ capabilities: { depthLimit: false } }))
    await assert.rejects(applyDerivedDelegation(missingDepth.ctx, {
      provider: 'subagent',
      ownsDiscovery: false,
      maxDepth: 2,
    }), /cannot enforce maxDepth/)
  } finally {
    await missingDepth.dispose()
  }
  const managed = await boot({ settings: false })
  try {
    managed.subagents.registerProvider(capableProvider({ capabilities: { depthLimit: false, agentOptions: false } }))
    await applyDerivedDelegation(managed.ctx, {
      provider: 'subagent',
      ownsDiscovery: false,
      maxDepth: 'provider-managed',
    })
    const agent = stubAgent('parent', managed.ctx, stubSession())
    await call(managed.ctx.tools.get('subagent'), agent, {})
    assert.equal(managed.subagents.activations[0].request.maxDepth, undefined)
  } finally {
    await managed.dispose()
  }
  const collision = await boot()
  try {
    collision.subagents.registerProvider(capableProvider())
    collision.ctx.tools.register(defineTool({
      name: 'subagent',
      description: 'already mounted',
      parameters: { prompt: { type: 'string', required: true } },
      output: { schema: { type: 'string' }, render: () => [] },
      execute: async () => 'original',
    }))
    await assert.rejects(applyDerivedDelegation(collision.ctx, {
      provider: 'subagent',
      ownsDiscovery: true,
      nativeModelSelectionCompatibility: false,
    }), /already registered/)
    assert.equal(collision.ctx.tools.get('subagent').description, 'already mounted')
  } finally {
    await collision.dispose()
  }
})
