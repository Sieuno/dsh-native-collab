/**
 * Positive production regression for the Context-owned startup barrier.
 * Uses real Cordis plugin/dispose. A ctx.get helper is not the barrier.
 * FiberState numbers match the installed Cordis const enum: PENDING 0, ACTIVE 2, FAILED 3.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const root = new URL('../', import.meta.url)
const require = createRequire(root)
const { Context } = await import(pathToFileURL(require.resolve('@deepseek-ai/cordis')))
const CollabUi = (await import(new URL('../dist/agent-team/bootstrap.js', import.meta.url))).default
const { TeamService } = await import(new URL('../dist/agent-team/index.js', import.meta.url))
const { SubagentRuntime, requireAssemblySnapshot } = await import(new URL('../dist/subagent/index.js', import.meta.url))

const PENDING = 0
const ACTIVE = 2
const FAILED = 3
const OLD_KEY = Symbol.for('@sieuno/dsh-native-collab.assemblySnapshot')

function tick() {
  return new Promise(resolve => setTimeout(resolve, 30))
}

async function close(fibers) {
  for (const fiber of [...fibers].reverse()) {
    try { await fiber?.dispose?.() } catch { /* stub disposers are not the barrier */ }
  }
}

async function dependencies(ctx, options = {}) {
  return ctx.plugin(inner => {
    inner.reflect.provide('agents', { list() { return [] }, get() {} })
    inner.reflect.provide('sessions', { get() {} })
    inner.reflect.provide('sessionPersistence', {})
    inner.reflect.provide('sessionProjections', { register() { return () => {} } })
    inner.reflect.provide('workingDirectory', { cwd() { return 'synthetic' } })
    if (options.subagents) inner.reflect.provide('subagents', { modelDeliverySelection: false })
  })
}

test('source keeps the snapshot off the process object', async () => {
  const snapshot = await readFile(new URL('../packages/subagent/src/assembly-snapshot.ts', import.meta.url), 'utf8')
  const ui = await readFile(new URL('../packages/agent-team/src/collab-ui.ts', import.meta.url), 'utf8')
  assert.equal(snapshot.includes('globalThis'), false)
  assert.equal(ui.includes('globalThis'), false)
  assert.equal(snapshot.includes('publishAssemblySnapshot'), false)
})

test('consumer waits for the control service, then freezes that Context only', async () => {
  const symbols = new Set(Object.getOwnPropertySymbols(globalThis))
  const ctx = new Context()
  const fibers = [await dependencies(ctx)]
  let seen
  const consumer = ctx.plugin({
    inject: ['collabUi'],
    apply(inner) { seen = requireAssemblySnapshot(inner) },
  })
  const team = ctx.plugin(TeamService, { enhancedSelection: true })
  const runtime = ctx.plugin(SubagentRuntime, { deliverySelection: true })
  fibers.push(consumer, team, runtime)
  try {
    await tick()
    assert.equal(consumer.state, PENDING)
    assert.equal(team.state, PENDING)
    assert.equal(runtime.state, PENDING)
    assert.equal(seen, undefined)
    assert.equal(ctx.get('agentTeams'), undefined)
    assert.equal(ctx.get('subagents'), undefined)

    fibers.push(await ctx.plugin(CollabUi, { modelEnhancement: false, communicationEnhancement: true }))
    await Promise.all([consumer, runtime, team])
    assert.equal(consumer.state, ACTIVE)
    assert.equal(runtime.state, ACTIVE)
    assert.equal(team.state, ACTIVE)
    assert.equal(seen.modelEnhancement, false)
    assert.equal(seen.communicationEnhancement, true)
    assert.equal(ctx.agentTeams.selectionEnhanced, false)
    assert.equal(ctx.agentTeams.communicationEnhanced, true)
    assert.equal(ctx.subagents.modelDeliverySelection, true)
    const added = Object.getOwnPropertySymbols(globalThis).filter(symbol => !symbols.has(symbol))
    assert.deepEqual(added, [])
    assert.equal(globalThis[OLD_KEY], undefined)
  } finally {
    await close(fibers)
  }
})

test('control service first still freezes the same snapshot and unset follows the row', async () => {
  const ctx = new Context()
  const fibers = [await dependencies(ctx)]
  try {
    fibers.push(await ctx.plugin(CollabUi, {}))
    const runtime = await ctx.plugin(SubagentRuntime, { deliverySelection: false })
    const team = await ctx.plugin(TeamService, { enhancedSelection: true })
    fibers.push(runtime, team)
    assert.equal(team.state, ACTIVE)
    assert.equal(runtime.state, ACTIVE)
    assert.equal(ctx.agentTeams.selectionEnhanced, true)
    assert.equal(ctx.agentTeams.communicationEnhanced, true)
    assert.equal(ctx.subagents.modelDeliverySelection, false)
  } finally {
    await close(fibers)
  }
})

test('missing or unbranded control service does not apply another row or a planted global', async () => {
  globalThis[OLD_KEY] = Object.freeze({
    present: true,
    modelEnhancement: false,
    communicationEnhancement: false,
    nativeModelSelectionCompatibility: false,
  })
  const fibers = []
  try {
    const missing = new Context()
    fibers.push(await dependencies(missing, { subagents: true }))
    const team = missing.plugin(TeamService, { enhancedSelection: true })
    fibers.push(team)
    await tick()
    assert.equal(team.state, PENDING)
    assert.equal(missing.get('agentTeams'), undefined)

    const fake = new Context()
    fibers.push(await dependencies(fake, { subagents: true }))
    fibers.push(await fake.plugin(inner => {
      inner.reflect.provide('collabUi', {
        assemblySnapshot() {
          return {
            present: true,
            modelEnhancement: false,
            communicationEnhancement: false,
            nativeModelSelectionCompatibility: false,
          }
        },
      })
    }))
    const failed = fake.plugin(TeamService, { enhancedSelection: true })
    fibers.push(failed)
    await assert.rejects(async () => { await failed }, /collabUi assembly snapshot is required/)
    assert.equal(failed.state, FAILED)
    assert.equal(fake.get('agentTeams'), undefined)
  } finally {
    delete globalThis[OLD_KEY]
    await close(fibers)
  }
})

test('two Contexts do not leak, and disposing one does not affect the other or a later Context', async () => {
  const a = new Context()
  const b = new Context()
  const aFibers = [await dependencies(a)]
  const bFibers = [await dependencies(b)]
  try {
    aFibers.push(await a.plugin(CollabUi, { modelEnhancement: false, communicationEnhancement: false }))
    bFibers.push(await b.plugin(CollabUi, { modelEnhancement: true, communicationEnhancement: true }))
    aFibers.push(await a.plugin(SubagentRuntime, { deliverySelection: true }))
    bFibers.push(await b.plugin(SubagentRuntime, { deliverySelection: false }))
    aFibers.push(await a.plugin(TeamService, { enhancedSelection: true }))
    bFibers.push(await b.plugin(TeamService, { enhancedSelection: false }))
    const aSnap = a.get('collabUi').assemblySnapshot()
    const bSnap = b.get('collabUi').assemblySnapshot()
    assert.notEqual(aSnap, bSnap)
    assert.equal(a.agentTeams.selectionEnhanced, false)
    assert.equal(a.agentTeams.communicationEnhanced, false)
    assert.equal(a.subagents.modelDeliverySelection, false)
    assert.equal(b.agentTeams.selectionEnhanced, true)
    assert.equal(b.agentTeams.communicationEnhanced, true)
    assert.equal(b.subagents.modelDeliverySelection, true)
    await close(aFibers)
    assert.equal(b.get('collabUi').assemblySnapshot(), bSnap)
    assert.equal(b.agentTeams.selectionEnhanced, true)
    assert.equal(b.subagents.modelDeliverySelection, true)
    assert.equal(globalThis[OLD_KEY], undefined)

    const c = new Context()
    const cFibers = [await dependencies(c, { subagents: true })]
    try {
      const waiting = c.plugin(TeamService, { enhancedSelection: true })
      cFibers.push(waiting)
      await tick()
      assert.equal(waiting.state, PENDING)
      cFibers.push(await c.plugin(CollabUi, {}))
      await waiting
      assert.equal(c.agentTeams.selectionEnhanced, true)
      assert.equal(c.agentTeams.communicationEnhanced, true)
      assert.notEqual(c.get('collabUi').assemblySnapshot(), bSnap)
    } finally {
      await close(cFibers)
    }
  } finally {
    await close(bFibers)
    assert.equal(globalThis[OLD_KEY], undefined)
  }
})
