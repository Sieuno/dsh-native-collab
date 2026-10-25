import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const delegation = await import(new URL('../dist/tool-subagent/delegation.js', import.meta.url))
const state = await import(new URL('../dist/tool-subagent/state.js', import.meta.url))
const own = await import(new URL('../dist/agent-team/own-model.js', import.meta.url))

const allowed = [{ provider: 'p', model: 'listed' }, { provider: 'p', model: 'unlisted' }]
const advertised = [{ provider: 'p', id: 'listed', name: 'Listed' }]

test('native ON keeps an existing snapshot and does not resample settings', () => {
  const decision = delegation.resolveNativePolicy(allowed, [{ provider: 'other', model: 'x' }], true, { enabled: false, allowedModels: [] })
  assert.deepEqual(decision.policy, allowed)
  assert.equal(decision.shouldRecord, false)
})

test('native ON inherits a parent policy and records it on the child', () => {
  const parent = [{ provider: 'p', model: 'parent' }]
  const decision = delegation.resolveNativePolicy(undefined, parent, false, undefined)
  assert.deepEqual(decision.policy, parent)
  assert.equal(decision.shouldRecord, true)
})

test('native ON samples only a fresh top-level session and skips a historical one', () => {
  const fresh = delegation.resolveNativePolicy(undefined, undefined, true, { enabled: true, allowedModels: allowed })
  assert.deepEqual(fresh.policy, allowed)
  assert.equal(fresh.shouldRecord, true)
  const historical = delegation.resolveNativePolicy(undefined, undefined, false, { enabled: true, allowedModels: allowed })
  assert.equal(historical.policy, undefined)
  assert.equal(historical.shouldRecord, false)
  const disabled = delegation.resolveNativePolicy(undefined, undefined, true, { enabled: false, allowedModels: [] })
  assert.equal(disabled.policy, undefined)
  assert.equal(disabled.shouldRecord, false)
  const session = { firstLiveSeq: 0, eventAt: () => ({ type: 'session/end-seed' }) }
  assert.equal(delegation.isFreshTopLevel(session), false)
  assert.equal(delegation.isFreshTopLevel({ firstLiveSeq: 0, eventAt: () => ({ type: 'turn/start' }) }), true)
})

test('policy projection restores the first record and ignores a later rewrite', () => {
  let folded = state.initPolicy()
  folded = state.applyPolicy(folded, { type: 'subagent/model-selection-policy', data: { allowedModels: allowed } })
  folded = state.applyPolicy(folded, { type: 'subagent/model-selection-policy', data: { allowedModels: [{ provider: 'p', model: 'later' }] } })
  assert.deepEqual(folded, allowed)
  const session = { events: [], append(type, data) { this.events.push({ type, data }) } }
  assert.equal(state.recordPolicy(session, false, allowed), true)
  assert.equal(state.recordPolicy(session, true, allowed), false)
  assert.equal(session.events.length, 1)
  assert.equal(session.events[0].type, 'subagent/model-selection-policy')
})

test('OFF reads the current allowlist, rejects a disabled explicit route, and does not record', () => {
  let settings = { enabled: true, allowedModels: allowed }
  const first = delegation.authorizeLiveSelection(settings, { provider: 'p', model: 'unlisted' }, advertised)
  assert.equal(first.kind, 'accept')
  assert.equal(first.advertised, false)
  settings = { enabled: true, allowedModels: [{ provider: 'p', model: 'listed' }] }
  const revoked = delegation.authorizeLiveSelection(settings, { provider: 'p', model: 'unlisted' }, advertised)
  assert.equal(revoked.kind, 'reject')
  settings = { enabled: false, allowedModels: allowed }
  assert.equal(delegation.authorizeLiveSelection(settings, { provider: 'p', model: 'listed' }, advertised).kind, 'reject')
  assert.equal(delegation.authorizeLiveSelection(settings, {}, advertised).kind, 'omit')
  assert.equal(delegation.discoverLiveRoutes(settings, [], advertised).includes('disabled'), true)
  const enabled = { enabled: true, allowedModels: allowed }
  const listed = delegation.discoverLiveRoutes(enabled, [{ id: 'p', name: 'P' }], advertised, { provider: 'p' })
  assert.match(listed, /unlisted — unadvertised/)
  assert.match(listed, /listed — Listed/)
})

test('explicit rejection and omission do not start a child; provider loss stays NO_ADAPTER', async () => {
  const calls = []
  const llm = {
    async resolveCallConfig(config) {
      calls.push(config)
      if (config.provider === 'gone') {
        const error = new Error('no adapter registered for provider "gone"')
        error.code = 'NO_ADAPTER'
        throw error
      }
    },
  }
  const omitted = await delegation.resolveDelegation('live', {}, undefined, () => ({ enabled: true, allowedModels: allowed }), advertised, llm, AbortSignal.timeout(1000))
  assert.equal(omitted.kind, 'omit')
  assert.equal(omitted.agentOptions, undefined)
  assert.equal(calls.length, 0)
  const accepted = await delegation.resolveDelegation('live', { provider: 'p', model: 'unlisted' }, undefined, () => ({ enabled: true, allowedModels: allowed }), advertised, llm, AbortSignal.timeout(1000))
  assert.equal(accepted.kind, 'accept')
  assert.deepEqual(calls, [{ provider: 'p', model: 'unlisted' }])
  await assert.rejects(
    () => delegation.resolveDelegation('live', { provider: 'gone', model: 'x' }, undefined, () => ({ enabled: true, allowedModels: [{ provider: 'gone', model: 'x' }] }), [], llm, AbortSignal.timeout(1000)),
    error => error.code === 'NO_ADAPTER',
  )
  const fork = await delegation.resolveDelegation('none', {}, undefined, () => { throw new Error('fork must not read settings') }, [], llm, AbortSignal.timeout(1000))
  assert.equal(fork.kind, 'omit')
  const rejected = await delegation.resolveDelegation('none', { provider: 'p', model: 'listed' }, undefined, () => allowed, [], undefined, AbortSignal.timeout(1000))
  assert.equal(rejected.kind, 'reject')
})

test('fork does not own discovery and schema fields match the handler', () => {
  const fork = delegation.planTools({ toolName: 'subagent_fork', ownsDiscovery: false, compatibility: true, policyDefined: true })
  assert.equal(fork.ownsDiscovery, false)
  assert.equal(fork.selectionKind, 'none')
  assert.deepEqual(delegation.selectionFields(fork.selectionKind), {})
  const off = delegation.planTools({ toolName: 'subagent', ownsDiscovery: true, compatibility: false, policyDefined: false })
  assert.equal(off.selectionKind, 'live')
  assert.equal(off.recordsPolicy, false)
  assert.ok(delegation.selectionFields('live').provider)
  const on = delegation.planTools({ toolName: 'subagent', ownsDiscovery: true, compatibility: true, policyDefined: false })
  assert.equal(on.selectionKind, 'none')
  assert.equal(on.ownsDiscovery, false)
  const captured = delegation.planTools({ toolName: 'subagent', ownsDiscovery: true, compatibility: true, policyDefined: true })
  assert.equal(captured.selectionKind, 'captured')
  assert.equal(captured.ownsDiscovery, true)
  assert.equal(delegation.hasExplicitSelection({}), false)
  assert.equal(delegation.hasExplicitSelection({ reasoning_effort: 'high' }), true)
})

test('own-model projection ignores the inherited cut and does not use firstLiveSeq', () => {
  const header = { firstLiveSeq: 0, config: { model: 'must-not-be-read' } }
  let state = own.initOwnModel(header, 2)
  state = own.applyOwnModel(state, { type: 'request/header', seq: 0, data: { header: { config: { provider: 'parent', model: 'parent-model' } } } })
  state = own.applyOwnModel(state, { type: 'request/header', seq: 1, data: { header: { config: { model: 'still-parent' } } } })
  assert.equal(state.model, undefined)
  state = own.applyOwnModel(state, { type: 'request/header', seq: 4, data: { header: { config: { provider: 'child', model: 'child-model', reasoningEffort: 'high' } } } })
  assert.equal(state.model, 'child-model')
  assert.equal(state.provider, 'child')
  assert.deepEqual(own.rosterModelFields({
    ownModel: state.model,
    ownProvider: state.provider,
    agentLive: true,
    creationModel: 'old-options',
    creationProvider: 'backend-must-stay',
  }), { model: 'child-model', modelSource: 'own-request', llmProvider: 'child' })
  assert.deepEqual(own.rosterModelFields({ agentLive: true, creationModel: 'old-options', creationProvider: 'created' }), {
    model: 'old-options',
    modelSource: 'creation-default',
    llmProvider: 'created',
  })
  assert.deepEqual(own.rosterModelFields({ agentLive: false, creationModel: 'old-options', creationProvider: 'created' }), {})
  assert.deepEqual(own.rosterModelFields({ ownModel: 'own', agentLive: true, creationModel: 'created', creationProvider: 'created' }), {
    model: 'own',
    modelSource: 'own-request',
  })
})

test('production roster and install do not use the rejected shortcuts', async () => {
  const roster = await readFile(join(root, 'packages', 'agent-team', 'src', 'roster.ts'), 'utf8')
  const fieldsStart = roster.indexOf('private modelFields')
  const fieldsEnd = roster.indexOf('List the runtime-enriched roster')
  const fieldsBody = roster.slice(fieldsStart, fieldsEnd)
  const listStart = roster.indexOf('list(membership: TeamMembership)')
  const listEnd = roster.indexOf('async spawn(caller: Agent')
  const listBody = roster.slice(listStart, listEnd)
  assert.ok(listStart >= 0 && listEnd > listStart && fieldsStart >= 0 && fieldsEnd > fieldsStart)
  assert.equal(listBody.includes('requestHeader('), false)
  assert.equal(fieldsBody.includes('requestHeader('), false)
  assert.match(fieldsBody, /rosterModelFields/)
  assert.match(roster, /prepareSelection/)
  const flow = await readFile(join(root, 'packages', 'tool-subagent', 'src', 'flow.ts'), 'utf8')
  assert.equal(flow.includes('.append('), false)
  assert.equal(flow.includes('appendPluginRecord'), false)
  assert.match(flow, /recordSubagentModelSelection/)
  assert.match(flow, /selectForSession/)
  assert.match(flow, /authorizeLiveSelection|settingsService\.current\(\)/)
  assert.match(flow, /delivery: 'parent'/)
  assert.match(flow, /subagent\/provider-added/)
  assert.match(flow, /subagent\/provider-removed/)
})
