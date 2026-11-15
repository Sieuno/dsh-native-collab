import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parse } from 'yaml'
import { validatePackage } from '../scripts/native-package.mjs'

test('package exposes the native extension without a disabled-mode gate', validatePackage)
test('startup patch preserves official service names, runtime settings, and preset definitions', async () => {
  const patch = parse(await readFile('cordis.patch.yml','utf8'), { customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: __jsExpr => ({ __jsExpr }) }] })
  const modifications = patch.filter(row => !row.insert)
  assert.ok(modifications.length)
  for (const row of modifications) {
    assert.equal(row.disabled, undefined)
    assert.equal(row.config, undefined)
    assert.deepEqual(row.inject, ['collabEnhancements'])
    assert.ok(row.name.startsWith('@deepseek-ai/'))
    assert.ok(!['subagent','agent-team','tool-agent-team'].includes(row.id))
  }
  assert.deepEqual(patch.flatMap(row => row.insert ?? []).map(row => row.id), ['dsh-native-collab-ui'])
  const pkg = JSON.parse(await readFile('package.json', 'utf8'))
  assert.equal(pkg.exports['./fallback'], undefined)
})
test('CI covers both supported SDKs and release waits for the required gates', async () => {
  const checks = parse(await readFile('.github/workflows/checks.yml','utf8'))
  const release = parse(await readFile('.github/workflows/release.yml','utf8'))
  assert.deepEqual(checks.jobs.native.strategy.matrix.sdk, ['native','native-rc2'])
  assert.ok(checks.jobs.native.steps.some(step => step.run === 'npm run test:sdk'))
  assert.ok(checks.jobs.native.steps.some(step => step.run === 'npm run check:types'))
  assert.equal(checks.jobs.attribution.steps.find(step => step.uses?.startsWith('actions/checkout@')).with['fetch-depth'], 0)
  assert.ok(checks.jobs.attribution.steps.some(step => step.run === 'node scripts/check-commit-attribution.mjs'))
  assert.ok(checks.jobs.attribution.steps.some(step => step.run === 'node --test tests/commit-attribution.test.mjs'))
  assert.equal(release.jobs.release.needs, 'checks')
  assert.equal(release.jobs.checks.permissions.contents, 'read')
})
