import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('delegation guidance distinguishes bounded independent work from named Team coordination', async () => {
  const [team, subagent] = await Promise.all([
    read('packages/tool-agent-team/src/index.ts'), read('packages/tool-subagent/src/flow.ts'),
  ])
  for (const source of [team, subagent]) {
    assert.match(source, /subagent_fork/)
    assert.match(source, /spawn_teammate/)
    assert.match(source, /subagent id/)
  }
  assert.match(team, /prefer spawn_teammate when the work needs a long-lived collaborator/)
  assert.match(team, /shares the Team task board/)
  assert.match(team, /temporary or phase-scoped tasks/)
  assert.match(team, /keeps its own independent task scope/)
  assert.match(team, /Team teammate is found by its member name/)
  assert.match(team, /Do not treat Agent Teams as the default for every delegation/)
  assert.match(team, /Ask each delegate to report progress at checkpoints/)
  assert.match(team, /Use wait_agent only when you specifically must pause all other activity/)
  assert.match(subagent, /Team members join a named roster and/)
  assert.match(subagent, /shared-task lifecycle/)
  assert.match(subagent, /For a self-contained bounded task, use subagent/)
  assert.match(subagent, /without joining a Team roster/)
})
