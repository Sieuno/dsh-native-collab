import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const tiers = {
  unit: [
    'auto-wake-guard', 'auto-wake-routing', 'auto-wake-delivery', 'interrupt-routing', 'agent-routing', 'child-activity', 'model-source', 'model-selection', 'delegation-choice',
    'client-status', 'feature-settings', 'locale-coverage', 'managed-runtime', 'preset-adapter', 'startup-declaration',
    'team-membership',
    'host-compatibility', 'projection-compat', 'release-exports', 'ui-diagnostics', 'ui-locale-and-layout', 'user-docs',
  ],
  sdk: [
    'actual-projection', 'child-guidance', 'collab-ui-status', 'delegation-registration',
    'remote-namespace', 'runtime-integration', 'tool-routing-scope',
  ],
  source: ['settings-host-contract'],
  client: ['remote-protocol'],
  discovery: ['client-discovery'],
}
const selected = process.argv.slice(2)
if (!selected.length) selected.push('unit')
const all = Object.values(tiers).flat().map(name => `${name}.test.mjs`).sort()
const disk = readdirSync(new URL('../tests/', import.meta.url)).filter(name => name.endsWith('.test.mjs')).sort()
if (new Set(all).size !== all.length || JSON.stringify(all) !== JSON.stringify(disk)) {
  throw new Error('Every functional test must belong to exactly one tier. Update scripts/test.mjs when adding or removing tests.')
}
for (const tier of selected) {
  if (!(tier in tiers)) throw new Error(`Unknown test tier ${tier}; choose ${Object.keys(tiers).join(', ')}`)
}
const needs = new Set()
if (selected.includes('source')) needs.add('DSH_SOURCE_ROOT')
if (selected.includes('client')) needs.add('DSH_OFFICIAL_ASAR')
if (selected.includes('discovery')) needs.add('DSH_OFFICIAL_SOURCE_ROOT')
if (selected.includes('source') || selected.includes('discovery')) {
  needs.add('DSH_COMPAT_TARGET')
  needs.add('DSH_SDK_ENVIRONMENT')
}
for (const name of needs) if (!process.env[name]) throw new Error(`Selected test tier requires ${name}; see TESTING.md. No tests are silently skipped.`)
const tests = [...new Set(selected.flatMap(tier => tiers[tier]))].map(name => `tests/${name}.test.mjs`)
console.log(`Test tiers: ${selected.join(', ')} (${tests.length} functional files)`)
const child = spawnSync(process.execPath, ['--test', ...tests], { cwd: root, env: process.env, stdio: 'inherit' })
if (child.error) throw child.error
process.exit(child.status ?? 1)
