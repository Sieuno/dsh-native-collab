/** Reviewed compatibility policy, not a runtime version-detection heuristic.
 * Add exact prereleases deliberately; never promise future 0.2.2 releases.
 */
export const DSH_RANGE = '>=0.2.1-rc.1 <0.2.2-0 || =0.2.2-alpha.2'
export const NODE_RANGE = '>=22.19.0'
export const CORDIS_RANGE = '4.0.5 || =4.0.6-alpha.1'
export const SCHEMASTERY_RANGE = '3.18.5 || =3.18.6-alpha.1'

export const SDK_TARGETS = Object.freeze({
  rc2: Object.freeze({ version: '0.2.1-rc.2', node: '22.19.0', cordis: '4.0.5', loader: '1.0.6', schemastery: '3.18.5', execution: 'single' }),
  alpha2: Object.freeze({ version: '0.2.2-alpha.2', node: '24.19.0', cordis: '4.0.6-alpha.1', loader: '1.0.7-alpha.1', schemastery: '3.18.6-alpha.1', execution: 'batch' }),
})

// Independent inventory: dropping a required peer must not make validation pass.
const dshPeers = [
  'agent', 'agent-preset-registry', 'atomic-write', 'attachment', 'brand', 'chunked-list',
  'llm', 'permission-presets', 'sandbox', 'sandbox-policy', 'scope', 'session',
  'session-persistence', 'session-projection', 'session-query', 'storage', 'storage-domain',
  'subagent', 'system-prompt', 'tools', 'typert-protocol', 'util-time', 'util-values',
  'working-directory', 'workspace',
]
export const HOST_PEER_RANGES = Object.freeze({
  '@deepseek-ai/cordis': CORDIS_RANGE,
  ...Object.fromEntries(dshPeers.map(name => ['@deepseek-ai/dsh-' + name, DSH_RANGE])),
  '@deepseek-ai/schemastery': SCHEMASTERY_RANGE,
})

export function checkHostCompatibility(pkg) {
  const issues = []
  if (pkg.engines?.node !== NODE_RANGE || pkg.engines?.dsh !== DSH_RANGE) issues.push('engine compatibility range mismatch')
  for (const [name, range] of Object.entries(HOST_PEER_RANGES)) {
    if (pkg.peerDependencies?.[name] !== range) issues.push('host peer compatibility range mismatch: ' + name)
    if (pkg.peerDependenciesMeta?.[name]?.optional !== true) issues.push('host peer must be optional: ' + name)
    if (Object.hasOwn(pkg.dependencies ?? {}, name)) issues.push('host singleton must not be a runtime dependency: ' + name)
  }
  for (const name of Object.keys(pkg.peerDependencies ?? {})) {
    if (!Object.hasOwn(HOST_PEER_RANGES, name)) issues.push('unreviewed host peer: ' + name)
  }
  return issues
}
