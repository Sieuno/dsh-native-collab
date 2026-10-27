import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const distRoot = resolve(process.env.DSH_NATIVE_COLLAB_DIST ?? join(repoRoot, 'dist'))
const { teamProjectionDefinition } = await import(pathToFileURL(join(distRoot, 'agent-team', 'projection.js')).href)

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
