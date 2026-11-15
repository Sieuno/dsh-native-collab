import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { SystemPrompt } from '@deepseek-ai/dsh-system-prompt'
import Tools from '@deepseek-ai/dsh-tools'
import Projections from '@deepseek-ai/dsh-session-projection'
import { Session } from '@deepseek-ai/dsh-session'
import * as Executor from '@deepseek-ai/dsh-tool-executor-native'
import * as Delegation from '@deepseek-ai/dsh-tool-subagent'
import * as Control from '@deepseek-ai/dsh-tool-subagent-control'
import NativeCollab from '../dist/native/index.js'
import { readFile } from 'node:fs/promises'
import { parse } from 'yaml'

let sequence = 0
export const text = result => result.content.map(block => block.text ?? '').join('\n')
export async function fixture(config = {}, { startup = false, bundleEnabled = true } = {}) {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(Tools)
  await ctx.plugin(Executor)
  await ctx.plugin(Projections)
  await ctx.plugin(Loader)
  const parent = { id: 'lead', session: Session.create('lead'), options: { provider: 'mock', model: 'base' }, status: 'running' }
  const child = { id: 'child', session: Session.create('child', undefined, { ...parent.session.header, id: 'child', origin: 'subagent', parentSession: 'lead' }), status: 'running' }
  const peer = { id: 'peer', session: Session.create('peer', undefined, { ...parent.session.header, id: 'peer', origin: 'subagent', parentSession: 'lead' }), status: 'running' }
  const unrelated = { id: 'other', session: Session.create('other'), status: 'running' }
  const agents = new Map([parent, child, peer, unrelated].map(agent => [agent.id, agent]))
  const starts = [], sends = [], preflights = []
  const state = { settings: { enabled: true, allowedModels: [{ provider: 'mock', model: 'a' }] }, sendFailure: false, invalidModel: false }
  const providers = ['spawn', 'fork'].map(name => ({ name, capabilities: { agentOptions: true, depthLimit: true }, inheritsParentContext: name === 'fork', prepareContinuable() {} }))
  const runtime = {
    getProvider: name => providers.find(provider => provider.name === name),
    resolveMaxDepth: () => 2,
    namesOf: agent => ({ self: agent === parent ? 'lead' : agent.id, ...agent === parent ? {} : { parent: 'lead' } }),
    rootOf: agent => {
      if (agents.get(agent.id) !== agent) throw new Error('stale caller')
      return agent === unrelated ? unrelated : parent
    },
    listDescendants: async () => [child, peer].map(agent => ({ kind: 'child', id: agent.id, parentId: 'lead', path: agent.id, depth: 1, mode: 'continuable', activity: 'running' })),
    resolveName: async (_sender, name) => name,
    async startActivation(request) { starts.push(request); return { name: 'worker', childId: 'child', result: Promise.resolve({}), dispose: async () => {} } },
    async sendMessage(sender, target, content) {
      if (target === 'other' && sender !== unrelated) throw new Error('native unauthorized target')
      if (state.sendFailure) throw new Error('native delivery failed')
      sends.push({ sender, target, content }); return `message-${sends.length}`
    },
    interrupt() {},
  }
  const llm = {
    listProviders: () => [{ id: 'mock', name: 'Mock' }, { id: 'empty', name: 'Empty' }],
    listModels: async provider => provider === 'empty' ? [] : [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
    resolveModelInfo: async (provider, model) => ({ id: model, provider, name: model }),
    async resolveCallConfig(config) { preflights.push(config); if (state.invalidModel) throw new Error('adapter rejected model'); return config },
  }
  await ctx.plugin(c => {
    c.provide('agents', { get: id => agents.get(id) })
    c.provide('subagents', runtime)
    c.provide('llm', llm)
    c.provide('settings', { describe: () => [{ ns: 'subagent-model-selection-settings', value: state.settings }] })
  })
  let entry, tool, fork, control
  if (startup) {
    const patch = parse(await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8'), {
      customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: __jsExpr => ({ __jsExpr }) }],
    })
    const declarations = [
      { id: 'tool-subagent', name: '@deepseek-ai/dsh-tool-subagent', config: { provider: 'spawn' } },
      { id: 'tool-subagent-fork', name: '@deepseek-ai/dsh-tool-subagent', config: { provider: 'fork', toolName: 'subagent_fork' } },
      { id: 'tool-subagent-control', name: '@deepseek-ai/dsh-tool-subagent-control', config: { interrupt: false } },
    ]
    for (const declaration of declarations) {
      await ctx.loader.create({ ...declaration, ...bundleEnabled ? patch.find(row => row.id === declaration.id) : {} })
    }
    if (bundleEnabled) {
      if (ctx.tools.get('subagent')) throw new Error('Startup dependency failed to order extension before native tools')
      for (const insert of patch.find(row => row.insert).insert) {
        await ctx.loader.create({ ...insert, config })
      }
      entry = ctx.loader.resolve('dsh-native-collab-ui')
    }
    tool = ctx.loader.resolve('tool-subagent').fiber
    fork = ctx.loader.resolve('tool-subagent-fork').fiber
    control = ctx.loader.resolve('tool-subagent-control').fiber
    await Promise.all([tool.await(), fork.await(), control.await()])
  } else {
    ctx.loader.builtins.collab = NativeCollab
    const id = await ctx.loader.create({ id: 'dsh-native-collab-ui', name: 'cordis:collab', config })
    entry = ctx.loader.resolve(id)
    await entry.fiber.await()
    tool = await ctx.plugin(Delegation, { provider: 'spawn', modelSelection: true, modelDiscovery: true })
    fork = await ctx.plugin(Delegation, { provider: 'fork', toolName: 'subagent_fork' })
    control = await ctx.plugin(Control, { interrupt: false })
  }
  const call = async (name, args, agent = parent, signal = new AbortController().signal) => {
    const batch = await ctx.tools.execute({ calls: [{ type: 'tool-call', id: `call-${++sequence}`, name, arguments: JSON.stringify(args) }], agent, signal })
    return batch.results[0].result
  }
  return {
    ctx, parent, child, peer, unrelated, agents, starts, sends, preflights, state, runtime, entry, tool, fork, control, call,
    async update(patch) { await entry.update({ config: { ...entry.options.config, ...patch } }); await entry.fiber.await() },
    async dispose() { await ctx.fiber.dispose() },
  }
}
