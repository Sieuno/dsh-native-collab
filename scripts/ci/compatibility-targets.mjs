import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SDK_TARGETS } from '../host-compatibility.mjs'

/** One reviewed inventory feeds both executable SDK and source-contract matrices. */
export function compatibilityMatrix(targets = SDK_TARGETS) {
  const versions = new Set(), directories = new Set()
  const include = Object.entries(targets).map(([target, lane]) => {
    assert.match(target, /^[a-z][a-z0-9-]*$/)
    assert.match(lane.version, /^\d+[.]\d+[.]\d+(?:-[0-9A-Za-z.-]+)?$/)
    assert.match(lane.node, /^\d+[.]\d+[.]\d+$/)
    assert.match(lane.sdkDirectory, /^[.]github\/sdk(?:\/[a-z][a-z0-9-]*)?$/)
    assert.match(lane.source?.ref ?? '', /^[0-9a-f]{40}$/)
    assert.match(lane.source?.rosterSha256 ?? '', /^[0-9a-f]{64}$/)
    assert.ok(['single', 'batch'].includes(lane.execution), 'Unimplemented executor contract: ' + target)
    assert.ok(!versions.has(lane.version) && !directories.has(lane.sdkDirectory), 'Targets need separate versions and SDK locks')
    versions.add(lane.version); directories.add(lane.sdkDirectory)
    return { target, node: lane.node, version: lane.version, sdkDirectory: lane.sdkDirectory, sourceRef: lane.source.ref }
  })
  assert.ok(include.length, 'No reviewed compatibility targets')
  return { include }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--github-output'), 'Usage: compatibility-targets.mjs [--github-output]')
  console.log((process.argv[2] ? 'matrix=' : '') + JSON.stringify(compatibilityMatrix()))
}
