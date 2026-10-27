/** Shared assembly identity map: runtime roles plus historical derived IDs. */
export type RuntimeRole = 'subagent' | 'agent-team' | 'team-tools'
export type LegacyPresetRole = 'subagent-control' | 'subagent-list' | 'spawn' | 'fork'

export const ASSEMBLY_ROLES = Object.freeze([
  { role: 'subagent', legacyId: 'dsh-native-collab-subagent', moduleName: '@sieuno/dsh-native-collab/subagent', nativeId: 'subagent', nativeModuleName: '@deepseek-ai/dsh-subagent', placement: 'runtime' },
  { role: 'subagent-control', legacyId: 'dsh-native-collab-tool-subagent-control', moduleName: '@sieuno/dsh-native-collab/tool-subagent-control', nativeId: 'tool-subagent-control', nativeModuleName: '@deepseek-ai/dsh-tool-subagent-control', placement: 'preset' },
  { role: 'subagent-list', legacyId: 'dsh-native-collab-tool-subagent-list-agents', moduleName: '@sieuno/dsh-native-collab/tool-subagent-control/list-agents', nativeId: 'tool-subagent-list-agents', nativeModuleName: '@deepseek-ai/dsh-tool-subagent-control/list-agents', placement: 'preset' },
  { role: 'agent-team', legacyId: 'dsh-native-collab-agent-team', moduleName: '@sieuno/dsh-native-collab/agent-team', nativeId: 'agent-team', nativeModuleName: '@deepseek-ai/dsh-experimental-agent-team', placement: 'runtime' },
  { role: 'team-tools', legacyId: 'dsh-native-collab-tool-agent-team', moduleName: '@sieuno/dsh-native-collab/tool-agent-team', nativeId: 'tool-agent-team', nativeModuleName: '@deepseek-ai/dsh-experimental-tool-agent-team', placement: 'runtime' },
  { role: 'spawn', legacyId: 'dsh-native-collab-tool-subagent', moduleName: '@sieuno/dsh-native-collab/tool-subagent', nativeId: 'tool-subagent', nativeModuleName: '@deepseek-ai/dsh-tool-subagent', placement: 'preset' },
  { role: 'fork', legacyId: 'dsh-native-collab-tool-subagent-fork', moduleName: '@sieuno/dsh-native-collab/tool-subagent/fork', nativeId: 'tool-subagent-fork', nativeModuleName: '@deepseek-ai/dsh-tool-subagent', placement: 'preset' },
] as const)

export type AssemblyMode = 'native' | 'managed'
export type RuntimeDiagnosis = 'native' | 'managed' | 'legacy-mixed' | 'unknown'

export function classifyAssembly(
  requestedMode: AssemblyMode,
  enabledNative: number,
  legacyEnabledManaged: number,
  inventoryKnown: boolean,
  childPhases: ReadonlyArray<string>,
): RuntimeDiagnosis {
  if (!inventoryKnown) return 'unknown'
  const childStarted = childPhases.some(phase => phase !== 'not-requested' && phase !== 'disposed')
  const runtimeCount = ASSEMBLY_ROLES.filter(role => role.placement === 'runtime').length
  const allChildrenReady = childPhases.length === runtimeCount && childPhases.every(phase => phase === 'ready')
  if (enabledNative > 0 && (legacyEnabledManaged > 0 || childStarted)) return 'legacy-mixed'
  if (legacyEnabledManaged > 0) return 'legacy-mixed'
  if (requestedMode === 'managed') return enabledNative === 0 && allChildrenReady ? 'managed' : 'unknown'
  // This identifies the selected provider set, not native Fiber readiness.
  return enabledNative === runtimeCount && !childStarted ? 'native' : 'unknown'
}
