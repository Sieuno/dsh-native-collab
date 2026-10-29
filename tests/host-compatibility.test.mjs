import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { compatibilityMatrix } from '../scripts/ci/compatibility-targets.mjs'
import { validateSourceContract } from './source-contract-fixture.mjs'
import { checkHostCompatibility, DSH_RANGE, CORDIS_RANGE, SCHEMASTERY_RANGE, SDK_TARGETS } from '../scripts/host-compatibility.mjs'

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

test('compatibility policy admits both supported series while regression targets remain pinned', () => {
  assert.equal(DSH_RANGE, '>=0.2.1-rc.1 <0.2.2-0 || >=0.2.2-0 <0.2.3-0')
  assert.equal(CORDIS_RANGE, '4.0.5 || =4.0.6-alpha.1')
  assert.equal(SCHEMASTERY_RANGE, '3.18.5 || =3.18.6-alpha.1')
  assert.deepEqual(checkHostCompatibility(manifest), [])
  assert.deepEqual(Object.keys(SDK_TARGETS), ['rc2', 'alpha2'])
  assert.equal(SDK_TARGETS.rc2.version, '0.2.1-rc.2')
  assert.equal(SDK_TARGETS.alpha2.version, '0.2.2-alpha.2')
  assert.equal(SDK_TARGETS.rc2.execution, 'single')
  assert.equal(SDK_TARGETS.alpha2.execution, 'batch')
})

test('declaration checks reject unbounded ranges, missing peers, and duplicate singleton installs', () => {
  for (const mutate of [
    pkg => { pkg.engines.dsh = '>=0.2.1-rc.1' },
    pkg => { pkg.engines.node = '>=24.9.0' },
    pkg => { pkg.peerDependencies['@deepseek-ai/cordis'] = '^4' },
    pkg => { delete pkg.peerDependencies['@deepseek-ai/dsh-subagent'] },
    pkg => { pkg.peerDependenciesMeta['@deepseek-ai/schemastery'].optional = false },
    pkg => { pkg.dependencies['@deepseek-ai/cordis'] = '4.0.5' },
    pkg => { pkg.peerDependencies['@deepseek-ai/dsh-unreviewed'] = '*' },
  ]) {
    const pkg = structuredClone(manifest)
    mutate(pkg)
    assert.ok(checkHostCompatibility(pkg).length > 0)
  }
})

test('CI matrices derive all targets and accept another explicitly reviewed lane without workflow edits', () => {
  const targets = structuredClone(SDK_TARGETS)
  targets.next = { ...targets.alpha2, version: '0.2.2-alpha.3', sdkDirectory: '.github/sdk/next' }
  assert.deepEqual(compatibilityMatrix(targets).include.map(lane => lane.target), ['rc2', 'alpha2', 'next'])
  assert.deepEqual(compatibilityMatrix().include.map(lane => lane.sourceRef), Object.values(SDK_TARGETS).map(lane => lane.source.ref))
})

test('CI targets reject missing source pins, moving refs, unsafe paths and unimplemented API modes', () => {
  for (const mutate of [
    lane => { delete lane.source },
    lane => { lane.source.ref = 'main' },
    lane => { lane.source.rosterSha256 = 'unchecked' },
    lane => { lane.sdkDirectory = '../external' },
    lane => { lane.execution = 'guess' },
  ]) {
    const targets = structuredClone(SDK_TARGETS)
    mutate(targets.alpha2)
    assert.throws(() => compatibilityMatrix(targets))
  }
  assert.throws(() => compatibilityMatrix({}))
  assert.throws(() => compatibilityMatrix({ a: SDK_TARGETS.rc2, b: SDK_TARGETS.rc2 }))
})

test('source contracts reject mismatched SDK/source identities, changed text and unknown target selection', () => {
  const rosterSource = 'a small source-identity fixture, not an executable SDK'
  const lane = { version: '0.2.1-rc.2', source: { ref: '1'.repeat(40), rosterSha256: createHash('sha256').update(rosterSource).digest('hex') } }
  const targets = { reviewed: lane }
  const input = { target: 'reviewed', sourceVersion: lane.version, sdkVersion: lane.version, rosterSource, sourceHead: lane.source.ref, sourceStatus: '' }
  assert.equal(validateSourceContract(input, targets), lane)
  for (const patch of [
    { target: undefined }, { target: 'unknown' }, { sdkVersion: '0.2.2-alpha.2' },
    { sourceVersion: '0.2.2-alpha.2' }, { rosterSource: rosterSource + 'changed' },
    { sourceHead: '2'.repeat(40) }, { sourceStatus: ' M packages/settings/settings/src/index.ts' },
  ]) assert.throws(() => validateSourceContract({ ...input, ...patch }, targets))
})

test('release checker ships its dependency-free policy beside it', () => {
  assert.ok(manifest.files.includes('scripts/host-compatibility.mjs'))
  for (const target of Object.values(SDK_TARGETS)) {
    assert.match(target.version, /^0[.]2[.]/)
    assert.ok(Object.isFrozen(target))
  }
})
