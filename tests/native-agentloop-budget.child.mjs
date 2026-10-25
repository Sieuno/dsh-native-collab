import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { isAbsolute, join, resolve, sep } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import * as JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import SubagentService from '@deepseek-ai/dsh-subagent'
import * as SubagentFork from '@deepseek-ai/dsh-subagent-fork-in-process'
import * as SubagentSpawn from '@deepseek-ai/dsh-subagent-spawn-in-process'
import Storage from '@deepseek-ai/dsh-storage'
import * as JsonStorage from '@deepseek-ai/dsh-storage-json'
import * as StorageDomain from '@deepseek-ai/dsh-storage-domain'
import TeamService, { TeamError } from '../dist/agent-team/index.js'
import CollabUiService from '../dist/agent-team/bootstrap.js'
import * as TeamToolPlugin from '../dist/tool-agent-team/index.js'

function officialSourceRootUrl() {
  const configured = process.env.DSH_OFFICIAL_SOURCE_ROOT?.trim()
  if (!configured) {
    throw new Error('Host integration test requires DSH_OFFICIAL_SOURCE_ROOT (absolute path to the official source checkout); no fallback is provided')
  }
  if (!isAbsolute(configured)) {
    throw new Error('DSH_OFFICIAL_SOURCE_ROOT must be an absolute filesystem path to the official source checkout')
  }
  const rootPath = resolve(configured)
  const rootUrl = pathToFileURL(rootPath.endsWith(sep) ? rootPath : `${rootPath}${sep}`)
  const fixtures = [
    'packages/test-support/agent-loop-testkit/src/index.ts',
    'packages/core/agent-loop/tests/mock-adapter.ts',
    'packages/subagent/subagent/tests/working-directory-fixture.ts',
    'packages/experimental/agent-team/tests/test-session-query.ts',
  ]
  if (fixtures.some(path => !existsSync(fileURLToPath(new URL(path, rootUrl))))) {
    throw new Error('DSH_OFFICIAL_SOURCE_ROOT is missing one or more required official Host fixture files')
  }
  return rootUrl
}

const officialRootUrl = officialSourceRootUrl()
const [agentLoopTestkit, mockAdapterModule, workingDirectoryFixture, sessionQueryModule] = await Promise.all([
  import(new URL('packages/test-support/agent-loop-testkit/src/index.ts', officialRootUrl)),
  import(new URL('packages/core/agent-loop/tests/mock-adapter.ts', officialRootUrl)),
  import(new URL('packages/subagent/subagent/tests/working-directory-fixture.ts', officialRootUrl)),
  import(new URL('packages/experimental/agent-team/tests/test-session-query.ts', officialRootUrl)),
])
const { mountAgentLoopTestDependencies } = agentLoopTestkit
const { MockAdapter, textResponse } = mockAdapterModule
const { mountWorkingDirectoryFixture } = workingDirectoryFixture
const { TestSessionQuery } = sessionQueryModule

const [mode, sessionRoot, storageRoot, controlRoot] = process.argv.slice(2)
const ROOT_ID = SessionId('rc3-recovery-root')
const SIGNAL = new AbortController().signal

async function setup(adapterScript, maxLogicalRequests, withStorage = true, requestTrace) {
  const ctx = new Context()
  await mountAgentLoopTestDependencies(ctx)
  await mountWorkingDirectoryFixture(ctx)
  await ctx.plugin(JsonlSessionPersistence, { root: sessionRoot, compression: 'zstd' })
  if (withStorage) {
    await ctx.plugin(Storage)
    await ctx.plugin(JsonStorage, { root: storageRoot })
    await ctx.plugin(StorageDomain, { backend: 'json' })
  }
  await ctx.plugin(TestSessionQuery)
  await ctx.plugin(AgentLoop, { agents: [] })
  await ctx.plugin(SubagentService)
  await ctx.plugin(SubagentSpawn, { providerName: 'spawn' })
  await ctx.plugin(SubagentFork, { providerName: 'fork' })
  if (requestTrace !== undefined) {
    ctx.on('agent/request', async (_, next) => {
      requestTrace.entered += 1
      return await next()
    })
  }
  await ctx.plugin(CollabUiService, {})
  await ctx.plugin(TeamService, { maxLogicalRequests })
  if (requestTrace !== undefined) {
    ctx.on('agent/request', async (_, next) => {
      requestTrace.passedTeamGuard += 1
      return await next()
    })
  }
  await ctx.plugin(TeamToolPlugin)
  const adapter = new MockAdapter(adapterScript)
  ctx.llm.registerAdapter(['mock'], adapter)
  return { ctx, adapter }
}

function userText(text) {
  return createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } })
}

async function phaseA() {
  const { ctx, adapter } = await setup([
    textResponse('child first request'),
    textResponse('child second request'),
  ], 3)
  try {
    const lead = await ctx.agentLoop.create(ROOT_ID, { provider: 'mock', model: 'mock' })
    const spawnRequest = (name, prompt) => ctx.agentTeams.spawnTeammate(lead, {
      name,
      description: 'bounded persistent budget fixture',
      prompt: [{ type: 'text', text: prompt }],
      context: 'fresh',
      provider: 'spawn',
      signal: SIGNAL,
    })
    await spawnRequest('worker-one', 'answer the first fixture request')
    const firstChildRequests = adapter.requests.length
    assert.ok(firstChildRequests >= 1, 'the real child request must reach MockAdapter')
    const rootFeedbackDeadline = Date.now() + 5_000
    while (adapter.requests.length < 2 && Date.now() < rootFeedbackDeadline) {
      await new Promise(resolve => setTimeout(resolve, 25))
    }
    await lead.whenIdle()
    assert.equal(adapter.requests.length, 2, 'child completion feedback must trigger a second root turn')
    assert.ok(adapter.requests[1].messages.some(message => message.source.kind === 'subagent-settled'))
    const budget = ctx.agentTeams.getBudget(lead)
    assert.deepEqual(budget, { status: 'active', limit: 3, used: 2 })
    await mkdir(controlRoot, { recursive: true })
    await writeFile(join(controlRoot, 'phase-a-ready.json'), JSON.stringify({
      pid: process.pid,
      rootId: lead.id,
      budget,
      adapterRequests: adapter.requests.length,
    }))
    const deadline = Date.now() + 45_000
    while (Date.now() < deadline) {
      try { await readFile(join(controlRoot, 'dispose-a.flag')); break } catch { await new Promise(resolve => setTimeout(resolve, 25)) }
    }
    try { await readFile(join(controlRoot, 'dispose-a.flag')) } catch { throw new Error('bounded hold window elapsed before normal dispose signal') }
    await ctx.fiber.dispose()
    await writeFile(join(controlRoot, 'phase-a-exit.json'), JSON.stringify({ pid: process.pid, exit: 0 }))
  } catch (error) {
    await ctx.fiber.dispose().catch(() => {})
    throw error
  }
}

async function phaseProbe() {
  const { ctx } = await setup([], 99)
  let result
  try {
    try {
      await ctx.agents.resume({
        resumeSessionId: ROOT_ID,
        agentOptions: { provider: 'mock', model: 'mock' },
      })
      result = { pid: process.pid, acquired: true, error: null }
    } catch (error) {
      result = {
        pid: process.pid,
        acquired: false,
        error: {
          name: error instanceof Error ? error.name : typeof error,
          code: typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : null,
          message: error instanceof Error ? error.message : String(error),
        },
      }
    }
    await writeFile(join(controlRoot, 'phase-probe.json'), JSON.stringify(result))
  } finally {
    await ctx.fiber.dispose()
  }
}

async function phaseLegacy() {
  const { ctx, adapter } = await setup([textResponse('must not reach adapter')], 99)
  try {
    const resumed = await ctx.agents.resume({
      resumeSessionId: ROOT_ID,
      agentOptions: { provider: 'mock', model: 'mock' },
    })
    const lead = resumed.agent
    let error
    try { ctx.agentTeams.getBudget(lead) } catch (caught) { error = caught }
    assert.ok(error instanceof Error)
    assert.equal(error.code, 'TEAM_BUDGET_LEGACY')
    assert.match(error.message, /legacy Team/u)

    lead.followup(userText('legacy Team must fail closed'))
    await lead.whenIdle()
    assert.equal(adapter.requests.length, 0, 'legacy missing/corrupt record must deny before adapter dispatch')
    await writeFile(join(controlRoot, 'phase-legacy.json'), JSON.stringify({
      pid: process.pid,
      error: { name: error.name, code: error.code, message: error.message },
      adapterRequests: adapter.requests.length,
    }))
  } finally {
    await ctx.fiber.dispose()
  }
}

async function phaseMissingStorage() {
  const requestTrace = { entered: 0, passedTeamGuard: 0 }
  const { ctx, adapter } = await setup([textResponse('must not reach adapter')], 99, false, requestTrace)
  try {
    const resumed = await ctx.agents.resume({
      resumeSessionId: ROOT_ID,
      agentOptions: { provider: 'mock', model: 'mock' },
    })
    const lead = resumed.agent
    let error
    try { ctx.agentTeams.getBudget(lead) } catch (caught) { error = caught }
    assert.ok(error instanceof Error, 'storage failure must remain a standard Error')
    assert.equal(error.code, 'TEAM_BUDGET_STORAGE_UNAVAILABLE')
    assert.match(error.message, /storage-domain service/u)

    lead.followup(userText('storage is absent; guard must not fail open'))
    await lead.whenIdle()
    assert.equal(requestTrace.entered, 1, 'the resumed existing Team Agent must reach agent/request')
    assert.equal(requestTrace.passedTeamGuard, 0, 'the storage-failure guard must reject before downstream request hooks')
    assert.equal(adapter.requests.length, 0, 'request guard stays mounted and denies before adapter dispatch')

    // Exercise the real send_message execute -> ToolRuntime formatter path.
    // TeamError is passed through with stable info; a plain object rejection is
    // normalized at this tool boundary instead of rendering as [object Object].
    const sendMessage = ctx.agentTeams.sendMessage
    const toolErrors = []
    try {
      for (const code of [
        'TEAM_BUDGET_EXHAUSTED',
        'TEAM_BUDGET_LEGACY',
        'TEAM_BUDGET_STORAGE_UNAVAILABLE',
        'TEAM_BUDGET_SCOPE_UNKNOWN',
      ]) {
        ctx.agentTeams.sendMessage = async () => { throw new TeamError(`fixture ${code}`, code) }
        const result = await ctx.tools.execute({
          callId: `send-${code}`,
          name: 'send_message',
          arguments: { target: 'worker-one', message: 'formatter probe' },
          agent: lead,
          signal: new AbortController().signal,
        })
        assert.equal(result.isError, true)
        assert.equal(result.content[0].text, `Error: fixture ${code}`)
        assert.deepEqual(result.error.info, { name: 'TeamError', code })
        toolErrors.push(result.error.info)
      }
      ctx.agentTeams.sendMessage = async () => { throw { detail: 'plain object rejection' } }
      const plain = await ctx.tools.execute({
        callId: 'send-plain-object',
        name: 'send_message',
        arguments: { target: 'worker-one', message: 'formatter probe' },
        agent: lead,
        signal: new AbortController().signal,
      })
      assert.equal(plain.isError, true)
      assert.match(plain.content[0].text, /plain object rejection/u)
      assert.doesNotMatch(plain.content[0].text, /\[object Object\]/u)
      assert.deepEqual(plain.error.info, { name: 'TeamError', code: 'TEAM_SEND_FAILURE' })
      toolErrors.push(plain.error.info)
    } finally {
      ctx.agentTeams.sendMessage = sendMessage
    }
    await writeFile(join(controlRoot, 'phase-missing-storage.json'), JSON.stringify({
      pid: process.pid,
      error: { name: error.name, code: error.code, message: error.message },
      requestTrace,
      adapterRequests: adapter.requests.length,
      toolErrors,
    }))
  } finally {
    await ctx.fiber.dispose()
  }
}

async function phaseB() {
  const { ctx, adapter } = await setup([textResponse('root third request')], 99)
  try {
    const resumed = await ctx.agents.resume({
      resumeSessionId: ROOT_ID,
      agentOptions: { provider: 'mock', model: 'mock' },
    })
    const lead = resumed.agent
    const before = ctx.agentTeams.getBudget(lead)
    assert.deepEqual(before, { status: 'active', limit: 3, used: 2 }, 'normal restart must restore the persisted ledger, not the new config limit')

    lead.followup(userText('root third logical request'))
    await lead.whenIdle()
    assert.equal(adapter.requests.length, 1, 'the last allowed request reaches MockAdapter')
    assert.deepEqual(ctx.agentTeams.getBudget(lead), { status: 'exhausted', limit: 3, used: 3 })

    lead.followup(userText('root N+1 denied'))
    await lead.whenIdle()
    const afterDenied = ctx.agentTeams.getBudget(lead)
    assert.equal(adapter.requests.length, 1, 'N+1 must be denied before adapter dispatch')
    assert.equal(afterDenied.status, 'exhausted')
    assert.deepEqual(afterDenied.firstDenied, { agentId: lead.id, turn: 3, step: 1 })
    await writeFile(join(controlRoot, 'phase-b.json'), JSON.stringify({
      pid: process.pid,
      before,
      afterAllowed: { limit: 3, used: 3 },
      afterDenied,
      adapterRequests: adapter.requests.length,
    }))
  } finally {
    await ctx.fiber.dispose()
  }
}

if (mode === 'A') await phaseA()
else if (mode === 'probe') await phaseProbe()
else if (mode === 'B') await phaseB()
else if (mode === 'legacy') await phaseLegacy()
else if (mode === 'missing-storage') await phaseMissingStorage()
else throw new Error(`unknown native budget phase: ${String(mode)}`)
