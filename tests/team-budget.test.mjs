import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'

async function loadBudget() {
  const path = new URL('../packages/agent-team/src/budget.ts', import.meta.url)
  const zodPath = new URL('../node_modules/zod/index.js', import.meta.url).href
  let source = await readFile(path, 'utf8')
  source = source
    .replace(/^import type .*\n/gmu, '')
    .replace(/^import \{ errorMessage, TeamError \} from '\.\/error\.ts'$/mu,
      `const errorMessage = error => error instanceof Error ? error.message : String(error); const TeamError = class extends Error { constructor(message, code, options) { super(message, options); this.code = code } }`)
    .replace(/^import z from 'zod'$/mu, `import z from '${zodPath}'`)
  source = stripTypeScriptTypes(source, { mode: 'transform' })
  return (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).TeamBudget
}

class MemoryJournal {
  states = new Map()
  tails = new Map()
  committedEvents = 0
  corrupt = false

  state(root) {
    if (this.corrupt) throw new Error('corrupt projection')
    return this.states.get(root.id) ?? { members: [], tasks: [], messages: [] }
  }

  async transact(rootId, operation) {
    const previous = this.tails.get(rootId) ?? Promise.resolve()
    const result = previous.then(operation)
    this.tails.set(rootId, result.catch(() => {}))
    return await result
  }
}

class MemoryDomainFacility {
  records = new Map()
  schema
  active = false

  async open(spec) {
    assert.equal(spec.name, 'native_collab_team_budget')
    assert.equal(spec.layout, 'per-record')
    this.schema = spec.tables.ledgers.valueSchema
    if (this.active) throw Object.assign(new Error('domain already open'), { code: 'already-open' })
    this.active = true
    for (const [key, value] of this.records) {
      if (!this.schema.safeParse(value).success) {
        this.active = false
        throw Object.assign(new Error(`invalid record ${key}`), { code: 'invalid-record' })
      }
    }
    const copy = value => value === undefined ? undefined : structuredClone(value)
    const schema = this.schema
    return {
      table: name => {
        assert.equal(name, 'ledgers')
        return {
          get: key => copy(this.records.get(key)),
          put: async (key, value) => {
            const parsed = schema.parse(value)
            this.records.set(key, copy(parsed))
          },
          update: async (key, update) => {
            const current = this.records.get(key)
            if (current === undefined) throw Object.assign(new Error('record missing'), { code: 'missing-key' })
            const next = update(copy(current))
            schema.parse(next)
            this.records.set(key, copy(next))
            return copy(next)
          },
        }
      },
      close: async () => { this.active = false },
    }
  }
}

function context(facility) {
  return { get: name => name === 'storageDomain' ? facility : undefined }
}

function createRootJournal() {
  return new MemoryJournal()
}

async function openBudget(TeamBudget, journal, facility, limit) {
  const budget = new TeamBudget(context(facility), journal, limit)
  await budget.open()
  return budget
}

test('persisted per-Team admission cap is atomic across concurrent reservations and restart', async () => {
  const TeamBudget = await loadBudget()
  const journal = createRootJournal()
  const facility = new MemoryDomainFacility()
  const root = { id: 'team-A' }
  const budget = await openBudget(TeamBudget, journal, facility, 32)
  await journal.transact(root.id, () => budget.ensureStarted(root))

  const reservations = await Promise.all(Array.from({ length: 80 }, () => budget.reserve(root)))
  const admitted = reservations.filter(result => result.admitted)
  assert.equal(admitted.length, 32)
  assert.ok(admitted.every(result => result.budget.used <= 32))
  assert.equal(budget.get(root).used, 32)
  assert.equal(journal.committedEvents, 0, 'the quota is not persisted as a Session event')

  const denied = await budget.reserve(root)
  assert.equal(denied.admitted, false)
  await budget.recordFirstDenial(root, 'child-A', 7, 3)
  await budget.close()

  const reopened = await openBudget(TeamBudget, journal, facility, 100)
  assert.deepEqual(reopened.get(root), {
    status: 'exhausted', limit: 32, used: 32,
    firstDenied: { agentId: 'child-A', turn: 7, step: 3 },
  })
  const stillDenied = await reopened.reserve(root)
  assert.equal(stillDenied.admitted, false)
  await reopened.close()
})

test('Team ledgers are isolated and config changes do not refill an epoch', async () => {
  const TeamBudget = await loadBudget()
  const journal = createRootJournal()
  const facility = new MemoryDomainFacility()
  const first = { id: 'team-A' }
  const second = { id: 'team-B' }
  const budget = await openBudget(TeamBudget, journal, facility, 2)
  await journal.transact(first.id, () => budget.ensureStarted(first))
  await journal.transact(second.id, () => budget.ensureStarted(second))
  await budget.reserve(first)
  assert.equal(budget.get(first).used, 1)
  assert.equal(budget.get(second).used, 0)
  await budget.close()

  const changedConfig = await openBudget(TeamBudget, journal, facility, 50)
  assert.equal(changedConfig.get(first).limit, 2)
  assert.equal(changedConfig.get(first).used, 1)
  assert.equal(changedConfig.get(second).limit, 2)
  const newTeam = { id: 'team-C' }
  await journal.transact(newTeam.id, () => changedConfig.ensureStarted(newTeam))
  assert.equal(changedConfig.get(newTeam).limit, 50)
  assert.equal(changedConfig.get(newTeam).used, 0)
  await changedConfig.close()
})

test('legacy Team history and unreadable projection fail closed', async () => {
  const TeamBudget = await loadBudget()
  const journal = createRootJournal()
  const facility = new MemoryDomainFacility()
  const legacyRoot = { id: 'legacy' }
  journal.states.set('legacy', { members: [{ id: 'old-child' }], tasks: [], messages: [] })
  const budget = await openBudget(TeamBudget, journal, facility, 32)
  await assert.rejects(budget.reserve(legacyRoot), { code: 'TEAM_BUDGET_LEGACY' })
  journal.corrupt = true
  await assert.rejects(budget.reserve({ id: 'unknown' }), /corrupt projection/u)
  await budget.close()
})

test('missing Host storage and schema-invalid records fail closed', async () => {
  const TeamBudget = await loadBudget()
  const journal = createRootJournal()
  const absent = new TeamBudget(context(undefined), journal, 32)
  await assert.rejects(absent.open(), { code: 'TEAM_BUDGET_STORAGE_UNAVAILABLE' })

  const facility = new MemoryDomainFacility()
  facility.records.set('r-corrupt', { ledgerVersion: 1, epoch: 1, rootSessionId: 'other', limit: 32, used: 'invalid' })
  const corrupt = new TeamBudget(context(facility), journal, 32)
  await assert.rejects(corrupt.open(), { code: 'TEAM_BUDGET_STORAGE_INVALID' })
})
