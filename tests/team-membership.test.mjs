import test from 'node:test'
import assert from 'node:assert/strict'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const distRoot = resolve(process.env.DSH_NATIVE_COLLAB_DIST ?? join(repoRoot, 'dist'))
const { teamProjectionDefinition } = await import(pathToFileURL(join(distRoot, 'agent-team', 'projection.js')).href)

const member = (id, phase, epoch) => ({
  id, name: 'worker', description: 'helper', provider: 'mock', context: 'fork', phase,
  ...(epoch === undefined ? {} : { epoch }),
})
const apply = (state, data) => teamProjectionDefinition.apply(state, { type: 'team/member', data })

test('legacy v2 rows project at epoch zero, then leave and rejoin increment epochs', () => {
  let state = teamProjectionDefinition.init({ id: 'root' })
  state = apply(state, { version: 2, teamId: 'root', member: member('child', 'provisioning') })
  state = apply(state, { version: 2, teamId: 'root', member: member('child', 'active') })
  assert.equal(state.members[0].epoch, 0)

  state = apply(state, { version: 3, teamId: 'root', operationId: 'leave-1', action: 'leave', memberId: 'child', epoch: 1 })
  assert.equal(state.members[0].phase, 'departed')
  assert.equal(state.operations[0].epoch, 1)
  state = apply(state, { version: 3, teamId: 'root', operationId: 'join-2', action: 'join', memberId: 'child', epoch: 2, member: member('child', 'active') })
  assert.equal(state.members[0].phase, 'active')
  assert.equal(state.members[0].epoch, 2)
  assert.deepEqual(state.operations.map(item => item.to), ['subagent', 'teammate'])
  assert.equal(teamProjectionDefinition.stateSchema.parse(state).operations.length, 2)
})

test('first join begins at epoch one and malformed v3 transitions fail closed', () => {
  const empty = teamProjectionDefinition.init({ id: 'root' })
  const joined = apply(empty, { version: 3, teamId: 'root', operationId: 'join-1', action: 'join', memberId: 'child', epoch: 1, member: member('child', 'active') })
  assert.equal(joined.members[0].epoch, 1)
  assert.equal(joined.operations[0].replayed, false)

  const badEpoch = apply(empty, { version: 3, teamId: 'root', operationId: 'join-bad', action: 'join', memberId: 'child', epoch: 2, member: member('child', 'active') })
  assert.match(badEpoch.failure, /not next epoch/u)
  const duplicate = apply(joined, { version: 3, teamId: 'root', operationId: 'join-1', action: 'leave', memberId: 'child', epoch: 2 })
  assert.match(duplicate.failure, /recorded twice/u)
  const futureTask = teamProjectionDefinition.apply(empty, { type: 'team/task', data: { version: 3, teamId: 'root' } })
  assert.match(futureTask.failure, /unsupported Agent Teams event version 3/u)
})

test('failed flush preserves the in-memory edge and replay flushes without appending twice', async () => {
  const { TeamJournal } = await import(pathToFileURL(join(distRoot, 'agent-team', 'journal.js')).href)
  const events = []
  let fail = true
  let commits = 0
  const root = { id: 'root', session: { append(type, data) { events.push({ type, data }) } } }
  const journal = new TeamJournal({ sessions: { async flush() { if (fail) throw new Error('flush failed') } } }, () => { commits++ })
  const edge = { version: 3, teamId: 'root', operationId: 'join-1', action: 'join', memberId: 'child', epoch: 1, member: member('child', 'active', 1) }
  await assert.rejects(journal.appendAndFlush(root, 'team/member', edge), /flush failed/u)
  assert.equal(events.length, 1)
  assert.equal(commits, 0)
  fail = false
  await journal.flush(root)
  assert.equal(events.length, 1)
  assert.equal(commits, 1)
})
