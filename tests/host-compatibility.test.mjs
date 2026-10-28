import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { checkHostCompatibility, DSH_RANGE, CORDIS_RANGE, SCHEMASTERY_RANGE, SDK_TARGETS } from '../scripts/host-compatibility.mjs'

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

test('compatibility policy admits the old line and only the reviewed new prerelease', () => {
  assert.equal(DSH_RANGE, '>=0.2.1-rc.1 <0.2.2-0 || =0.2.2-alpha.2')
  assert.equal(CORDIS_RANGE, '4.0.5 || =4.0.6-alpha.1')
  assert.equal(SCHEMASTERY_RANGE, '3.18.5 || =3.18.6-alpha.1')
  assert.deepEqual(checkHostCompatibility(manifest), [])
  assert.deepEqual(Object.keys(SDK_TARGETS), ['rc2', 'alpha2'])
  assert.equal(SDK_TARGETS.rc2.version, '0.2.1-rc.2')
  assert.equal(SDK_TARGETS.alpha2.version, '0.2.2-alpha.2')
  assert.equal(SDK_TARGETS.rc2.execution, 'single')
  assert.equal(SDK_TARGETS.alpha2.execution, 'batch')
})

test('declaration checks reject broad ranges, missing peers, and duplicate singleton installs', () => {
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

test('release checker ships its dependency-free policy beside it', () => {
  assert.ok(manifest.files.includes('scripts/host-compatibility.mjs'))
  for (const target of Object.values(SDK_TARGETS)) {
    assert.match(target.version, /^0[.]2[.]/)
    assert.ok(Object.isFrozen(target))
  }
})
