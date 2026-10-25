/**
 * Context-owned startup snapshot for the collaboration control service.
 * Consumers freeze the value at their own construction or apply.
 * A later profile edit is the next assembly preference, not a hot update.
 * There is no process-global copy. A missing control service is not an unset overlay.
 */

/** Instance brand. It identifies the service; it is not a process-wide data slot. */
export const COLLAB_UI_BRAND = Symbol.for('@dsh-native-collab/derived.collabUi')

export interface AssemblySnapshot {
  readonly present: true
  readonly modelEnhancement: boolean | undefined
  readonly communicationEnhancement: boolean | undefined
  readonly nativeModelSelectionCompatibility: boolean | undefined
  readonly runningChildGuidance?: boolean
  readonly completedChildContinuation?: boolean
  readonly teamRequestLimit?: number
}

const MISSING = 'collabUi assembly snapshot is required before collaboration consumers start'

function flag(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

export function isAssemblySnapshot(value: unknown): value is AssemblySnapshot {
  if (typeof value !== 'object' || value === null || !('present' in value) || value.present !== true) return false
  const row = value as AssemblySnapshot
  return flag(row.modelEnhancement) === row.modelEnhancement
    && flag(row.communicationEnhancement) === row.communicationEnhancement
    && flag(row.nativeModelSelectionCompatibility) === row.nativeModelSelectionCompatibility
    && flag(row.runningChildGuidance) === row.runningChildGuidance
    && flag(row.completedChildContinuation) === row.completedChildContinuation
    && (row.teamRequestLimit === undefined || (Number.isSafeInteger(row.teamRequestLimit) && row.teamRequestLimit > 0))
}

function brandedService(ctx: { get?: (name: string) => unknown } | undefined): { assemblySnapshot?: () => unknown } | undefined {
  const service = ctx && typeof ctx.get === 'function' ? ctx.get('collabUi') : undefined
  if (!service || typeof service !== 'object') return undefined
  if (Reflect.get(service, COLLAB_UI_BRAND) !== true) return undefined
  return service as { assemblySnapshot?: () => unknown }
}

/**
 * Read this Context's branded control service only.
 * `undefined` means the service is absent or illegal. It is not an unset overlay.
 */
export function readAssemblySnapshot(ctx: { get?: (name: string) => unknown } | undefined): AssemblySnapshot | undefined {
  const service = brandedService(ctx)
  if (!service || typeof service.assemblySnapshot !== 'function') return undefined
  const value = service.assemblySnapshot.call(service)
  return isAssemblySnapshot(value) ? value : undefined
}

/** Fail before `super()` when this Context has no legal captured snapshot. */
export function requireAssemblySnapshot(ctx: { get?: (name: string) => unknown } | undefined): AssemblySnapshot {
  const snapshot = readAssemblySnapshot(ctx)
  if (!snapshot) throw new Error(MISSING)
  return snapshot
}

function requireSnapshot(snapshot: AssemblySnapshot, name: string): AssemblySnapshot {
  if (!isAssemblySnapshot(snapshot)) {
    throw new Error(`${name} requires a captured assembly snapshot; a missing control service is not an unset overlay`)
  }
  return snapshot
}

/**
 * Team model and communication flags for one assembly.
 * Unset communication follows the row model flag because Team has no separate delivery row.
 * The snapshot argument must already be a captured object.
 */
export function resolveTeamFlags(
  rowEnhanced: boolean,
  snapshot: AssemblySnapshot,
): { readonly selectionEnhanced: boolean; readonly communicationEnhanced: boolean } {
  const captured = requireSnapshot(snapshot, 'resolveTeamFlags')
  const row = rowEnhanced !== false
  return {
    selectionEnhanced: captured.modelEnhancement ?? row,
    communicationEnhanced: captured.communicationEnhancement ?? row,
  }
}

/** Explicit delivery admission. Unset overlay keeps the row delivery flag. */
export function resolveCommunicationAdmission(
  rowDelivery: boolean,
  snapshot: AssemblySnapshot,
): boolean {
  const captured = requireSnapshot(snapshot, 'resolveCommunicationAdmission')
  if (captured.communicationEnhancement !== undefined) return captured.communicationEnhancement
  return rowDelivery !== false
}

/**
 * Ordinary subagent selection kind.
 * Fork stays none. Model off returns native, not none.
 * Model on uses the overlay compat flag, then the tool-row flag.
 * An unset model overlay ignores the overlay compat flag.
 */
export function resolveOrdinarySelectionKind(
  ownsDiscovery: boolean | undefined,
  rowNativeCompat: boolean | undefined,
  snapshot: AssemblySnapshot,
): 'none' | 'native' | 'live' {
  const captured = requireSnapshot(snapshot, 'resolveOrdinarySelectionKind')
  if (ownsDiscovery === false) return 'none'
  if (captured.modelEnhancement === false) return 'native'
  const compat = captured.modelEnhancement === true
    ? captured.nativeModelSelectionCompatibility ?? rowNativeCompat
    : rowNativeCompat
  return compat === true ? 'native' : 'live'
}
