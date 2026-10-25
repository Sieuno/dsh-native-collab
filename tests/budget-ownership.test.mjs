import test from 'node:test'
import assert from 'node:assert/strict'
import TeamService from '../dist/agent-team/index.js'
import { TeamRoster } from '../dist/agent-team/roster.js'

const emptyState = () => ({ members: [], tasks: [], messages: [] })

function makeAgent(id, parentSession, providerOwned = false) {
  const cancellations = []
  return {
    id,
    providerOwned,
    session: {
      header: { parentSession },
      inheritedEventCount: 0,
      snapshotEvents: () => [],
    },
    cancel: (cause, options) => cancellations.push({ cause, options }),
    cancellations,
  }
}

function makeEnvironment(rootId = 'root', limit = 2, used = 0, members = []) {
  const root = makeAgent(rootId, undefined)
  const agents = new Map([[root.id, root]])
  const states = new Map([[root.id, { ...emptyState(), members }]])
  const ledgers = new Map([[root.id, {
    ledgerVersion: 1, epoch: 1, rootSessionId: rootId, limit, used,
  }]])
  const tails = new Map()
  const journal = {
    state(agent) { return states.get(agent.id) ?? emptyState() },
    async transact(id, operation) {
      const previous = tails.get(id) ?? Promise.resolve()
      const result = previous.then(operation)
      tails.set(id, result.catch(() => {}))
      return await result
    },
  }
  const budget = {
    hasLedger(agent) { return ledgers.has(agent.id) },
    async reserve(rootAgent) {
      return await journal.transact(rootAgent.id, async () => {
        const ledger = ledgers.get(rootAgent.id)
        if (ledger === undefined) return { admitted: true, budget: { status: 'not-started', limit, used: 0 } }
        if (ledger.used >= ledger.limit) {
          return { admitted: false, budget: view(ledger) }
        }
        const next = { ...ledger, used: ledger.used + 1 }
        ledgers.set(rootAgent.id, next)
        return { admitted: true, budget: view(next) }
      })
    },
    async recordFirstDenial(rootAgent, agentId, turn, step) {
      return await journal.transact(rootAgent.id, async () => {
        const ledger = ledgers.get(rootAgent.id)
        if (ledger === undefined) throw Object.assign(new Error('ledger absent'), { code: 'TEAM_BUDGET_LEGACY' })
        if (ledger.firstDenied === undefined) {
          ledgers.set(rootAgent.id, { ...ledger, firstDenied: { agentId, turn, step } })
        }
      })
    },
  }
  const ctx = { agents: {
    get(id) { return agents.get(id) },
    list() { return [...agents.values()] },
  } }
  const roster = Object.create(TeamRoster.prototype)
  Object.assign(roster, { ctx, journal, budget })
  // Isolate lineage lookup from Session event encoding; the resolver itself is production code.
  roster.subagentDescriptor = agent => agent.providerOwned === true
  const service = Object.create(TeamService.prototype)
  Object.assign(service, { ctx, roster, budget })
  return { root, agents, states, ledgers, journal, roster, budget, service }
}

function view(ledger) {
  return {
    status: ledger.used >= ledger.limit ? 'exhausted' : 'active',
    limit: ledger.limit,
    used: ledger.used,
    ...(ledger.firstDenied === undefined ? {} : { firstDenied: ledger.firstDenied }),
  }
}

test('production resolver accounts direct and nested provider workers without granting Team roles', () => {
  const env = makeEnvironment('root', 2, 2, [{ id: 'member', name: 'worker', phase: 'active' }])
  const member = makeAgent('member', env.root.id)
  const direct = makeAgent('direct-worker', env.root.id, true)
  const nested = makeAgent('nested-worker', member.id, true)
  const hostFork = makeAgent('host-fork', env.root.id, false)
  for (const agent of [member, direct, nested, hostFork]) env.agents.set(agent.id, agent)

  assert.equal(env.roster.resolveBudgetRoot(member), env.root)
  assert.equal(env.roster.resolveBudgetRoot(direct), env.root)
  assert.equal(env.roster.resolveBudgetRoot(nested), env.root)
  assert.equal(env.roster.resolveBudgetRoot(hostFork), undefined)
  assert.equal(env.roster.requestMembership(direct), undefined)
  assert.equal(env.roster.requestMembership(nested), undefined)
})

test('production request guard enforces N/N+1 across root and ordinary child requests', async () => {
  const env = makeEnvironment('root', 2, 0)
  const child = makeAgent('worker', env.root.id, true)
  env.agents.set(child.id, child)
  let dispatches = 0
  const next = async () => { dispatches += 1; return 'prepared' }

  await env.service.admitRequest(env.root, 1, 1, next)
  await env.service.admitRequest(child, 1, 1, next)
  await assert.rejects(env.service.admitRequest(env.root, 2, 1, next), error => error.code === 'TEAM_BUDGET_EXHAUSTED')

  assert.equal(dispatches, 2)
  assert.equal(env.ledgers.get(env.root.id).used, 2)
  assert.equal(env.ledgers.get(env.root.id).firstDenied.agentId, env.root.id)
})

test('exhaustion cancels all same-budget descendants but preserves an independent host fork', async () => {
  const env = makeEnvironment('root', 1, 1, [{ id: 'member', name: 'worker', phase: 'active' }])
  const member = makeAgent('member', env.root.id)
  const direct = makeAgent('direct-worker', env.root.id, true)
  const nested = makeAgent('nested-worker', member.id, true)
  const hostFork = makeAgent('host-fork', env.root.id, false)
  for (const agent of [member, direct, nested, hostFork]) env.agents.set(agent.id, agent)

  await assert.rejects(env.service.admitRequest(nested, 4, 2, async () => assert.fail('exhausted request must not dispatch')),
    error => error.code === 'TEAM_BUDGET_EXHAUSTED')

  assert.ok(env.root.cancellations.length > 0)
  assert.ok(member.cancellations.length > 0)
  assert.ok(direct.cancellations.length > 0)
  assert.ok(nested.cancellations.length > 0)
  assert.equal(hostFork.cancellations.length, 0)
  assert.deepEqual(env.ledgers.get(env.root.id).firstDenied, { agentId: nested.id, turn: 4, step: 2 })
})

test('independent host fork uses its own started Team ledger and isolates descendants', async () => {
  const env = makeEnvironment('original-root', 8, 0)
  const fork = makeAgent('independent-fork', env.root.id, false)
  const worker = makeAgent('fork-worker', fork.id, true)
  env.agents.set(fork.id, fork)
  env.agents.set(worker.id, worker)
  env.ledgers.set(fork.id, {
    ledgerVersion: 1, epoch: 1, rootSessionId: fork.id, limit: 2, used: 0,
  })

  assert.equal(env.roster.resolveBudgetRoot(fork), fork)
  assert.equal(env.roster.resolveBudgetRoot(worker), fork)
  await env.service.admitRequest(worker, 1, 1, async () => 'fork request admitted')
  assert.equal(env.ledgers.get(fork.id).used, 1)
  assert.equal(env.ledgers.get(env.root.id).used, 0)

  env.roster.stopForBudget(fork)
  assert.ok(fork.cancellations.length > 0)
  assert.ok(worker.cancellations.length > 0)
  assert.equal(env.root.cancellations.length, 0)
})

test('provider-owned missing parent, cycles, and stale actors fail closed', () => {
  const env = makeEnvironment()
  const orphan = makeAgent('orphan', 'missing-parent', true)
  env.agents.set(orphan.id, orphan)
  assert.throws(() => env.roster.resolveBudgetRoot(orphan), error => error.code === 'TEAM_BUDGET_SCOPE_UNKNOWN')

  const first = makeAgent('cycle-a', 'cycle-b', true)
  const second = makeAgent('cycle-b', 'cycle-a', true)
  env.agents.set(first.id, first)
  env.agents.set(second.id, second)
  assert.throws(() => env.roster.resolveBudgetRoot(first), error => error.code === 'TEAM_BUDGET_SCOPE_UNKNOWN')

  const stale = makeAgent(env.root.id, undefined)
  assert.throws(() => env.roster.resolveBudgetRoot(stale), error => error.code === 'TEAM_BUDGET_SCOPE_UNKNOWN')
})
