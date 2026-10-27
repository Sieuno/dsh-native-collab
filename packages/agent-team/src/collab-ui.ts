/**
 * Profile status surface for the collaboration bundle's client page.
 * Status and the legacy preview endpoint are read-only; no endpoint writes files
 * or changes the active assembly.
 * The volatile Config and immutable assembly snapshot remain owned by this Context.
 */
import { Context } from '@deepseek-ai/cordis'
import type Schema from '@deepseek-ai/schemastery'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'

import { ASSEMBLY_ROLES, classifyAssembly } from './assembly-layout.ts'
import { ManagedRuntime, type ManagedRuntimeStatus } from './managed-runtime.ts'
import { installPresetAdapter } from './preset-adapter.ts'

const ROWS = ASSEMBLY_ROLES
const ENABLE_LINKED = new Set<string>(ASSEMBLY_ROLES.filter(row => row.placement === 'runtime').map(row => row.legacyId))

type CurrentState = 'enabled' | 'disabled' | 'unknown'
export interface CollabUiStatus {
  profileName: string | null
  hmrEnabled: boolean | null
  /** @deprecated Legacy PluginManager root inventory; runtime.services is authoritative for managed children. */
  rows: Array<{ id: string; moduleName: string; current: CurrentState; sourceLayer: 'unknown'; runtimePhase: string | null }>
  desired: 'unchanged'
  pendingRestart: 'unknown'
  writeSupport: 'unsupported'
  operationError: 'transaction-unavailable'
  error: 'profile-unavailable' | 'inventory-unavailable' | null
  assembly: AssemblySnapshot | null
  runtime: ManagedRuntimeStatus
  diagnosis: 'native' | 'managed' | 'legacy-mixed' | 'unknown'
}

const COLLAB_UI_BRAND = Symbol.for('@sieuno/dsh-native-collab.collabUi')

interface AssemblySnapshot {
  readonly present: true
  readonly modelEnhancement: boolean | undefined
  readonly communicationEnhancement: boolean | undefined
  readonly nativeModelSelectionCompatibility: boolean | undefined
  readonly modelSource?: 'conversation' | 'settings' | 'all'
  readonly runningChildGuidance?: boolean
  readonly completedChildContinuation?: boolean
  readonly teamRequestLimit?: number
}

function readModelSource(value: unknown): 'conversation' | 'settings' | 'all' | undefined {
  const current = typeof value === 'object' && value !== null && 'get' in value && typeof value.get === 'function'
    ? value.get() : value
  return current === 'conversation' || current === 'settings' || current === 'all' ? current : undefined
}

function readOverlayFlag(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value === 'object' && value !== null && 'get' in value && typeof value.get === 'function') {
    const current = value.get()
    return typeof current === 'boolean' ? current : undefined
  }
  return undefined
}

function readRequestLimit(value: unknown, allowLegacyNull = false): number | undefined {
  const current = typeof value === 'object' && value !== null && 'get' in value && typeof value.get === 'function'
    ? value.get() : value
  // RC6 could persist null through Schemastery's optional number schema.
  // Recover that existing config as unset, without rewriting the profile or ledger.
  if (current === undefined || allowLegacyNull && current === null) return undefined
  if (typeof current !== 'number' || !Number.isSafeInteger(current) || current < 1) {
    throw new Error('teamRequestLimit must be a positive safe integer')
  }
  return current
}

function captureAssembly(config: Record<string, unknown> | undefined): AssemblySnapshot {
  return Object.freeze({
    present: true,
    modelEnhancement: readOverlayFlag(config?.modelEnhancement),
    communicationEnhancement: readOverlayFlag(config?.communicationEnhancement),
    nativeModelSelectionCompatibility: readOverlayFlag(config?.nativeModelSelectionCompatibility),
    modelSource: readModelSource(config?.modelSource),
    runningChildGuidance: readOverlayFlag(config?.runningChildGuidance),
    completedChildContinuation: readOverlayFlag(config?.completedChildContinuation),
    teamRequestLimit: readRequestLimit(config?.teamRequestLimit, true),
  })
}

export interface CollabUiPreview {
  action: string
  accepted: false
  current: CollabUiStatus['rows']
  desired: Array<{ id: string; state: 'enabled' | 'unknown' }>
  pendingRestart: 'unknown'
  error: 'transaction-unavailable'
  reasons: string[]
}

type PluginRow = { moduleName: string; enabled: boolean; fiberPhase?: string | null }
type PluginManagerLike = { listPlugins?: () => Promise<unknown> }

function service(ctx: Context, name: string): unknown {
  try { return ctx.get(name) } catch { return undefined }
}

function profileNameOf(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || !('name' in value)) return null
  return typeof value.name === 'string' && value.name.length > 0 ? value.name : null
}

function inventoryRows(value: unknown): PluginRow[] | undefined {
  if (!Array.isArray(value)) return undefined
  const rows: PluginRow[] = []
  for (const item of value) {
    if (typeof item !== 'object' || item === null || !('moduleName' in item) || typeof item.moduleName !== 'string'
      || !('enabled' in item) || typeof item.enabled !== 'boolean') return undefined
    rows.push({ moduleName: item.moduleName, enabled: item.enabled,
      fiberPhase: 'fiberPhase' in item && (typeof item.fiberPhase === 'string' || item.fiberPhase === null) ? item.fiberPhase : null })
  }
  return rows
}

/** No client-selected paths, patch payloads, or module names are accepted by this service. */
export class CollabUiService extends TypertRemoteService {
  // Root entries are imported concurrently. Do not inspect an inventory service
  // before its provider has activated and fail permanently on a startup race.
  static inject = ['pluginManager', 'loader']
  declare static Config: Schema
  assembly: AssemblySnapshot | undefined
  private readonly managedRuntime: ManagedRuntime
  private readonly currentModelSourceReader: () => 'conversation' | 'settings' | 'all' | undefined
  private readonly liveChildMessageFlags: () => {
    runningChildGuidance: boolean | undefined
    completedChildContinuation: boolean | undefined
  }

  constructor(ctx: Context, config?: Record<string, unknown>) {
    super(ctx, 'collabUi')
    Object.defineProperty(this, COLLAB_UI_BRAND, { value: true })
    this.assembly = captureAssembly(config)
    this.currentModelSourceReader = () => {
      const explicit = readModelSource(config?.modelSource)
      if (explicit !== undefined) return explicit
      return readOverlayFlag(config?.nativeModelSelectionCompatibility) === false ? 'settings' : 'conversation'
    }
    // Volatile-only settings are committed into the running references by the
    // loader, so the two parent-message sub-options are read per admission
    // instead of being frozen with the rest of the assembly snapshot.
    this.liveChildMessageFlags = () => ({
      runningChildGuidance: readOverlayFlag(config?.runningChildGuidance),
      completedChildContinuation: readOverlayFlag(config?.completedChildContinuation),
    })
    // Runtime ownership belongs to this installed entry, not a hidden preference.
    // Older saved runtimeMode:native must not keep every enhancement inert.
    installPresetAdapter(ctx, () => ({ model: this.assembly?.modelEnhancement === true, communication: this.assembly?.communicationEnhancement === true }))
    this.managedRuntime = new ManagedRuntime(ctx, 'managed')
    ctx.effect(() => () => this.managedRuntime.dispose(), 'collabUi.managedRuntime()')
    // ConfigEditor calls this waterfall before writing YAML. Schemastery treats
    // optional null as absent, so enforce the numeric write contract here, scoped
    // to this exact plugin fiber. Clearing uses the official op:unset path.
    ctx.on('internal/config', function (this: import('@deepseek-ai/cordis').Fiber, _raw, next) {
      const raw: unknown = next()
      // Cordis may expose a reflected Fiber proxy to listeners; uid identifies
      // the exact lifetime within this Context tree without proxy identity drift.
      if (this.uid !== ctx.fiber.uid) return raw
      if (typeof raw === 'object' && raw !== null) {
        // runtimeMode is a deprecated compatibility field, never a separate
        // activation switch or a requirement for saving ordinary preferences.
        if ('teamRequestLimit' in raw) readRequestLimit(raw.teamRequestLimit)
      }
      return raw
    })
  }

  /** Startup snapshot frozen by this construction. Not a live subscription. */
  assemblySnapshot(): AssemblySnapshot | null {
    return this.assembly ?? null
  }

  /** Latest volatile source choice; unlike assembly flags this is read per selection operation. */
  currentModelSource(): 'conversation' | 'settings' | 'all' | undefined {
    return this.currentModelSourceReader()
  }

  /** Live parent-message sub-options; volatile fields change without a restart. */
  childMessageFlags(): { runningChildGuidance: boolean | undefined; completedChildContinuation: boolean | undefined } {
    return this.liveChildMessageFlags()
  }

  @Remote
  async status(): Promise<CollabUiStatus> {
    const profile = service(this.ctx, 'profileContext')
    const profileName = profileNameOf(profile)
    const manager = service(this.ctx, 'pluginManager') as PluginManagerLike | undefined
    let inventory: PluginRow[] | undefined
    let error: CollabUiStatus['error'] = profileName === null ? 'profile-unavailable' : null
    try {
      const listPlugins = manager?.listPlugins
      if (typeof listPlugins !== 'function') throw new Error('plugin inventory unavailable')
      inventory = inventoryRows(await listPlugins.call(manager))
      if (inventory === undefined) throw new Error('invalid plugin inventory')
    } catch {
      error = 'inventory-unavailable'
    }
    const rows = ROWS.map(target => {
      const matches = inventory?.filter(row => row.moduleName === target.moduleName || row.moduleName === target.nativeModuleName) ?? []
      const row = matches.length === 1 ? matches[0] : undefined
      return {
        id: target.legacyId,
        moduleName: target.moduleName,
        current: row === undefined ? 'unknown' as const : row.enabled ? 'enabled' as const : 'disabled' as const,
        sourceLayer: 'unknown' as const,
        runtimePhase: row?.fiberPhase ?? null,
      }
    })
    const nativeEnabled = ROWS.filter(target => target.placement === 'runtime').filter(target => inventory?.some(row => row.moduleName === target.nativeModuleName && row.enabled)).length
    const managedEnabled = ROWS.filter(target => inventory?.some(row => row.moduleName === target.moduleName && row.enabled)).length
    const runtime = this.managedRuntime.status()
    const inventoryKnown = inventory !== undefined && ROWS.filter(target => target.placement === 'runtime')
      .every(target => inventory!.filter(row => row.moduleName === target.nativeModuleName).length === 1)
    const diagnosis = classifyAssembly(runtime.mode, nativeEnabled, managedEnabled, inventoryKnown,
      runtime.services.map(service => service.phase))
    return {
      profileName,
      hmrEnabled: service(this.ctx, 'hmr') !== undefined,
      rows,
      desired: 'unchanged',
      pendingRestart: 'unknown',
      writeSupport: 'unsupported',
      operationError: 'transaction-unavailable',
      error,
      assembly: this.assembly ?? null,
      runtime,
      diagnosis,
    }
  }

  /** Read-only preview; the profile is never written or snapshotted. */
  @Remote
  async preview(action: string): Promise<CollabUiPreview> {
    const status = await this.status()
    const echoed = typeof action === 'string' && action.length > 0 ? action : 'omitted'
    const validAction = action === 'enable' || action === 'restore'
    const reasons = [
      'transaction-unavailable',
      'source-layer-unknown',
      'preset-structure-unverified',
      'dynamic-config-unverified',
      'higher-priority-overrides-unverified',
      'next-start-not-proven',
    ]
    if (!validAction) reasons.unshift('invalid-action')
    if (status.hmrEnabled === true) reasons.push('hmr-active')
    if (status.error !== null) reasons.push(status.error)
    return {
      action: echoed,
      accepted: false,
      current: status.rows,
      desired: status.rows.map(row => ({ id: row.id, state: validAction && action === 'enable' && ENABLE_LINKED.has(row.id) ? 'enabled' : 'unknown' })),
      pendingRestart: 'unknown',
      error: 'transaction-unavailable',
      reasons,
    }
  }
}

export default CollabUiService
