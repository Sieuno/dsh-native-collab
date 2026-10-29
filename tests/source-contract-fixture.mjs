import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { SDK_TARGETS } from '../scripts/host-compatibility.mjs'
import { sdkEnvironment } from './sdk-execution-fixture.mjs'

export const ROSTER_PATH = 'packages/test-support/client-runtime/src/assembly/bundle-roster.ts'

/** Reject mixed SDK/source lines and changed source before executing official code. */
export function validateSourceContract({ target, sourceVersion, sdkVersion, rosterSource, sourceHead, sourceStatus }, targets = SDK_TARGETS) {
  assert.ok(Object.hasOwn(targets, target ?? ''), 'Set DSH_COMPAT_TARGET to a reviewed target; unknown targets must not fall back')
  const lane = targets[target]
  assert.equal(sourceHead, lane.source.ref, 'Official source checkout HEAD does not match reviewed commit')
  assert.equal(sourceStatus, '', 'Official source checkout must be clean before executing its code')
  assert.equal(sourceVersion, lane.version, 'Official source version does not match selected target')
  assert.equal(sdkVersion, lane.version, 'Installed SDK version does not match selected source target')
  assert.equal(createHash('sha256').update(rosterSource).digest('hex'), lane.source.rosterSha256, 'Official bundle-roster source differs from its reviewed SHA256')
  return lane
}

export async function sourceContract(sourceRoot) {
  assert.ok(sourceRoot, 'Official source root is required')
  const rosterSource = await readFile(join(sourceRoot, ROSTER_PATH), 'utf8')
  const pkg = JSON.parse(await readFile(join(sourceRoot, 'packages/core/tools/package.json'), 'utf8'))
  const sourceHead = execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  const sourceStatus = execFileSync('git', ['-C', sourceRoot, 'status', '--porcelain', '--untracked-files=all'], { encoding: 'utf8' }).trim()
  const sdk = sdkEnvironment()
  const lane = validateSourceContract({ target: process.env.DSH_COMPAT_TARGET, sourceVersion: pkg.version, sdkVersion: sdk.version, rosterSource, sourceHead, sourceStatus })
  return { lane, rosterSource }
}
