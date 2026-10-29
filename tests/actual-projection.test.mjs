import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const distRoot = resolve(process.env.DSH_NATIVE_COLLAB_DIST ?? join(repoRoot, 'dist'))
const { teamProjectionDefinition } = await import(pathToFileURL(join(distRoot, 'agent-team', 'projection.js')).href)

// Real compiled journal/roster/task commands; only Agent/Session persistence is a double.
const { TeamJournal } = await import(pathToFileURL(join(distRoot, 'agent-team', 'journal.js')).href)
const { TeamRoster } = await import(pathToFileURL(join(distRoot, 'agent-team', 'roster.js')).href)
const { TeamTaskBoard } = await import(pathToFileURL(join(distRoot, 'agent-team', 'task-board.js')).href)
function commandFixture() {
  let state = teamProjectionDefinition.init({ id: 'root' })
  const events = []
  let failFlush = false
  const root = { id: 'root', status: 'idle', options: {}, session: { header: {}, inheritedEventCount: 0,
    snapshotEvents: () => [], append(type, data) { events.push({ type, data }); state = teamProjectionDefinition.apply(state, { type, data }); assert.equal(state.failure, undefined) } } }
  const descriptor = { type: 'subagent/descriptor', data: { version: 3, mode: 'continuable', provider: 'local', label: 'worker' } }
  const child = { id: 'child', status: 'idle', options: {}, session: { header: { parentSession: 'root' }, inheritedEventCount: 0, snapshotEvents: () => [descriptor] } }
  const agents = new Map([[root.id, root], [child.id, child]])
  const ctx = { agents, sessions: { async flush() { if (failFlush) throw new Error('disk fault') }, get() {} },
    sessionProjections: { stateOf: () => state }, get() {} }
  const journal = new TeamJournal(ctx, () => {})
  const roster = new TeamRoster(ctx, journal, { disposed: false }, 8, {})
  const board = new TeamTaskBoard(journal, 20)
  const convert = (operationId, to) => roster.convertMembership(root, child, { operationId, to, name: 'worker' })
  return { root, child, journal, roster, board, convert, events, state: () => state, failFlush(value) { failFlush = value } }
}

test('real roster retains identity, excludes departed, rejoins, and repairs failed flush without duplicate append', async () => {
  const f = commandFixture()
  const joined = await f.convert('join', 'teammate')
  assert.equal(joined.epoch, 1)
  assert.equal(f.roster.membership(f.child).role, 'teammate')
  f.failFlush(true)
  await assert.rejects(f.convert('leave', 'subagent'), { code: 'TEAM_MEMBERSHIP_COMMIT_UNCERTAIN' })
  assert.equal(f.roster.tryMembership(f.child), undefined)
  assert.equal(teamProjectionDefinition.wire.view(f.state()).members.some(member => member.id === f.child.id), false, 'wire roster excludes departed identities too')
  assert.equal(f.roster.list(f.roster.membership(f.root)).some(row => row.id === f.child.id), false)
  f.failFlush(false)
  const repaired = await f.convert('leave', 'subagent')
  assert.equal(repaired.replayed, true)
  assert.equal(f.events.length, 2)
  await f.convert('rejoin', 'teammate')
  assert.equal(f.roster.membership(f.child).epoch, 3)
  assert.equal(f.state().members[0].id, f.child.id)
})

test('real roster refuses running targets and unfinished task owners', async () => {
  const f = commandFixture()
  f.child.status = 'running'
  await assert.rejects(f.convert('running', 'teammate'), { code: 'TEAM_MEMBER_RUNNING' })
  f.child.status = 'idle'
  await f.convert('join', 'teammate')
  const task = await f.board.create(f.roster.membership(f.child), { subject: 'work', description: 'work' })
  await f.board.update(f.child, f.roster.membership(f.child), { taskId: task.id, expectedRevision: task.revision, action: 'claim' })
  await assert.rejects(f.convert('leave', 'subagent'), { code: 'TEAM_MEMBER_HAS_TASKS' })
  assert.equal(f.roster.membership(f.child).role, 'teammate')
})

test('real queued create and update reject membership captured before leave/rejoin epoch change', async () => {
  const f = commandFixture()
  await f.convert('join', 'teammate')
  const stale = f.roster.membership(f.child)
  const task = await f.board.create(stale, { subject: 'work', description: 'work' })
  let release
  const gate = new Promise(resolve => { release = resolve })
  const hold = f.journal.transact(f.root.id, async () => gate)
  const leave = f.convert('leave', 'subagent')
  const rejoin = f.convert('rejoin', 'teammate')
  const create = assert.rejects(f.board.create(stale, { subject: 'stale', description: 'stale' }), { code: 'TEAM_TASK_UNAUTHORIZED' })
  const update = assert.rejects(f.board.update(f.child, stale, { taskId: task.id, expectedRevision: task.revision, action: 'claim' }), { code: 'TEAM_TASK_UNAUTHORIZED' })
  release()
  await Promise.all([hold, leave, rejoin, create, update])
  assert.equal(f.state().tasks.length, 1)
  assert.equal(f.state().tasks[0].status, 'pending')
})

test('real compiled Team projection contains only standard Team Session state', () => {
  const state = teamProjectionDefinition.init({ id: 'root' })
  const child = teamProjectionDefinition.apply(state, {
    type: 'team/member',
    data: {
      version: 2,
      teamId: 'root',
      member: {
        id: 'child', name: 'worker', description: 'test', provider: 'mock',
        context: 'fresh', phase: 'provisioning',
      },
    },
  })
  assert.equal(child.members.length, 1)
  assert.equal(child.members[0].id, 'child')
  assert.equal(Object.hasOwn(child, 'budget'), false)
  assert.equal(teamProjectionDefinition.stateSchema.parse(child).members.length, 1)
})

test('Team state and journal never persist a request-budget event', async () => {
  for (const relative of [
    'packages/agent-team/src/journal.ts',
    'packages/agent-team/src/projection.ts',
    'packages/agent-team/src/types.ts',
  ]) {
    const source = await readFile(join(repoRoot, relative), 'utf8')
    assert.doesNotMatch(source, /team\/budget/u, `${relative} must not persist the unknown bare event`)
  }
})
