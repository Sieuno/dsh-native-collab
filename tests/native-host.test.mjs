import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import LlmRuntime, { LlmAdapter, createUserMessage } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import Projections from '@deepseek-ai/dsh-session-projection'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import Tools from '@deepseek-ai/dsh-tools'
import * as Executor from '@deepseek-ai/dsh-tool-executor-native'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import * as Persistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import Subagents from '@deepseek-ai/dsh-subagent'
import * as Spawn from '@deepseek-ai/dsh-subagent-spawn-in-process'
import * as Fork from '@deepseek-ai/dsh-subagent-fork-in-process'
import SessionQuery from '@deepseek-ai/dsh-session-query'
import * as Delegation from '@deepseek-ai/dsh-tool-subagent'
import * as Control from '@deepseek-ai/dsh-tool-subagent-control'
import NativeCollab from '../dist/native/index.js'
import Loader, { Group } from '@deepseek-ai/cordis-plugin-loader'
import Presets from '@deepseek-ai/dsh-agent-preset-registry'
import TeamService from '@deepseek-ai/dsh-agent-team'
import * as TeamTools from '@deepseek-ai/dsh-tool-agent-team'
import { text } from './native-fixture.mjs'

class Adapter extends LlmAdapter {
  requests = []
  resolveModel(provider, model) { return Promise.resolve({ provider, id: model, name: model }) }
  async *stream(options) {
    this.requests.push(options)
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text: 'Result with evidence' }
    yield { type: 'block-end', index: 0, block: { type: 'text', text: 'Result with evidence' } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}
class Query extends SessionQuery {
  searchSessions() { throw new Error('Search is outside this test') }
  searchEvents() { throw new Error('Search is outside this test') }
}
async function host(t, { preset = false } = {}) {
  await mkdir(resolve('.test-artifacts'), { recursive: true })
  const root = await mkdtemp(resolve('.test-artifacts/native-host-'))
  const ctx = new Context()
  t.after(async () => {
    await ctx.fiber.dispose()
    const checked = resolve(root)
    assert.ok(checked.startsWith(resolve('.test-artifacts') + '\\') || checked.startsWith(resolve('.test-artifacts') + '/'))
    await rm(checked, { recursive: true, force: true })
  })
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(SessionStore)
  await ctx.plugin(Projections)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(Tools)
  await ctx.plugin(Executor)
  await ctx.plugin(AgentRegistry)
  const directories = new WeakMap()
  await ctx.plugin(c => c.provide('workingDirectory', {
    defaultDirectory: process.cwd(), get: session => directories.get(session) ?? session.header.cwd ?? process.cwd(),
    ensure: async agent => directories.get(agent.session) ?? agent.session.header.cwd ?? process.cwd(),
    async set(agent, path, signal) { signal?.throwIfAborted(); directories.set(agent.session, path); return path },
  }))
  await ctx.plugin(Persistence, { root })
  await ctx.plugin(AgentLoop, { agents: [] })
  await ctx.plugin(Query)
  const runtime = await ctx.plugin(Subagents, { maxDepth: 3, maxActiveSubagents: 3 })
  await ctx.plugin(Spawn, { providerName: 'spawn' })
  await ctx.plugin(Fork, { providerName: 'fork' })
  await ctx.plugin(NativeCollab, { modelSource: 'all', teamRequestLimit: 1 })
  if (preset) {
    await ctx.plugin(Loader)
    ctx.loader.builtins.group = Group
    await ctx.plugin(Presets, { default: 'standard' })
    await ctx.loader.create({ id: 'preset-standard', name: '@deepseek-ai/dsh-agent-preset', inject: ['collabEnhancements'], config: {
      id: 'standard', plugins: [
        { id: 'delegation', name: 'cordis:group', group: true, config: [
          { id: 'tool-subagent', name: '@deepseek-ai/dsh-tool-subagent', config: { provider: 'spawn' } },
          { id: 'tool-subagent-control', name: '@deepseek-ai/dsh-tool-subagent-control', config: { interrupt: false } },
        ] },
      ],
    } })
    await ctx.loader.resolve('preset-standard').fiber.await()
    await ctx.plugin(TeamService)
    await ctx.plugin(TeamTools)
  } else {
    await ctx.plugin(Delegation, { provider: 'spawn' })
    await ctx.plugin(Control, { interrupt: false })
  }
  const adapter = new Adapter()
  ctx.llm.registerAdapter(['mock'], adapter)
  const parent = preset ? (await ctx.agents.create({
    sessionId: 'lead', agentOptions: { provider: 'mock', model: 'base' },
    async setup(agentCtx, agent) {
      await ctx.agentPresets.mount(agentCtx, 'standard')
      agent.session.append('agent-preset/selected', { agentPreset: 'standard' })
    },
  })).agent : await ctx.agentLoop.create('lead', { provider: 'mock', model: 'base' })
  let sequence = 0
  const call = async (name, args) => (await ctx.tools.execute({
    calls: [{ type: 'tool-call', id: `host-call-${++sequence}`, name, arguments: JSON.stringify(args) }],
    agent: parent, signal: new AbortController().signal,
  })).results[0].result
  const completed = () => {
    const result = Promise.withResolvers()
    const timer = setTimeout(() => { off(); result.reject(new Error('Native child did not settle')) }, 5000)
    const off = ctx.on('subagent/end', info => { clearTimeout(timer); off(); result.resolve(info) }, { global: true })
    t.after(() => { clearTimeout(timer); off() })
    return result.promise
  }
  return { ctx, parent, call, adapter, completed, runtime }
}

test('real official runtime owns creation, automatic completion, cold continuation, and limits', async t => {
  const f = await host(t)
  assert.ok(f.ctx.subagents instanceof Subagents)
  const end = f.completed()
  const receipt = await f.call('subagent', { name: 'reviewer', description: 'Review module', prompt: 'Return evidence', provider: 'mock', model: 'fast' })
  assert.equal(receipt.isError, false, text(receipt))
  assert.deepEqual(receipt.value, { kind: 'activation', name: 'reviewer' })
  const ended = await end
  await f.parent.whenIdle()
  const childId = await f.ctx.subagents.resolveName(f.parent, 'reviewer', new AbortController().signal)
  assert.equal(ended.id, childId)
  assert.equal(f.ctx.agents.get(childId), undefined)
  assert.ok(f.parent.session.snapshotEvents().some(event => event.type === 'agent/inbox/spliced'
    && event.data.inserted.some(message => message.source.kind === 'subagent-settled')))
  const secondEnd = f.completed()
  const followup = await f.call('send_message', { agent: 'reviewer', message: 'Continue the same review' })
  assert.equal(followup.isError, false, text(followup))
  await secondEnd
  await f.parent.whenIdle()
  const blocked = await f.call('send_message', { agent: 'reviewer', message: 'Do not auto-loop' })
  assert.match(text(blocked), /Automatic wake limit reached/)
  f.parent.followup(createUserMessage({ content: [{ type: 'text', text: 'Continue' }], source: { kind: 'user' } }))
  await f.parent.whenIdle()
  const thirdEnd = f.completed()
  assert.equal((await f.call('send_message', { agent: 'reviewer', message: 'New instruction after user input' })).isError, false)
  await thirdEnd
  await f.parent.whenIdle()
  assert.equal(f.runtime.state, 2)
  assert.ok(f.adapter.requests.some(request => request.model === 'fast'))
})

test('official preset composition inherits the extension and native Team task ownership', async t => {
  const f = await host(t, { preset: true })
  assert.equal(f.ctx.tools.get('subagent'), undefined)
  assert.ok(f.ctx.tools.get('subagent', f.parent))
  assert.ok(f.ctx.subagents instanceof Subagents)
  assert.ok(f.ctx.agentTeams instanceof TeamService)
  await f.ctx.agentTeams.setEnabled(f.parent, true)
  const end = f.completed()
  const started = await f.call('subagent', { name: 'reviewer', description: 'Review module', prompt: 'Review it', provider: 'mock', model: 'fast' })
  assert.equal(started.isError, false, text(started))
  await end
  await f.parent.whenIdle()
  const [child] = await f.ctx.subagents.listDescendants(f.parent.id)
  assert.equal(child.path, 'reviewer')
  assert.equal(f.ctx.tools.get('spawn_teammate', f.parent), undefined)
  const task = await f.ctx.agentTeams.createTask(f.parent, { subject: 'Review', description: 'Review evidence' })
  const assigned = await f.ctx.agentTeams.updateTask(f.parent, {
    taskId: task.id, expectedRevision: task.revision, action: 'reassign', owner: child.id,
  })
  assert.equal(assigned.ownerId, child.id)
})
