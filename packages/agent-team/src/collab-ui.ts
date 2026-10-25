/**
 * Profile status surface for the collaboration bundle's client page.
 * Legacy status/preview stay read-only. Explicit bootStatus/bootPlan/bootApply
 * delegate to a separately loaded, Profile-bound next-start component.
 * The volatile Config and immutable assembly snapshot remain owned by this Context.
 */
import { Context } from '@deepseek-ai/cordis'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    'collab-ui/input-invalid': { endpoint: string; field: string }
  }
}

function invalidBootInput(method: 'bootPlan' | 'bootApply', field: string): never {
  // Use the public cross-realm Remote failure, not a generic TypeError that the
  // Gateway would turn into gateway/internal. This is owner-side validation,
  // independent of the browser's strict descriptor and generator availability.
  throw new RemoteError('collab-ui/input-invalid', `Invalid ${field}`, { endpoint: `collabUi/${method}`, field })
}
import type { BootSwitchManager, BootStatus, BootPlan, BootResult } from './boot-switch.ts'

const PACKAGE = '@dsh-native-collab/derived'
const ROWS = [
  { id: 'dsh-native-collab-subagent', moduleName: '@dsh-native-collab/derived/subagent' },
  { id: 'dsh-native-collab-tool-subagent-control', moduleName: '@dsh-native-collab/derived/tool-subagent-control' },
  { id: 'dsh-native-collab-tool-subagent-list-agents', moduleName: '@dsh-native-collab/derived/tool-subagent-control/list-agents' },
  { id: 'dsh-native-collab-agent-team', moduleName: '@dsh-native-collab/derived/agent-team' },
  { id: 'dsh-native-collab-tool-agent-team', moduleName: '@dsh-native-collab/derived/tool-agent-team' },
  { id: 'dsh-native-collab-tool-subagent', moduleName: '@dsh-native-collab/derived/tool-subagent' },
  { id: 'dsh-native-collab-tool-subagent-fork', moduleName: '@dsh-native-collab/derived/tool-subagent/fork' },
] as const
const ENABLE_LINKED = new Set<string>([
  'dsh-native-collab-subagent',
  'dsh-native-collab-tool-subagent-control',
  'dsh-native-collab-tool-subagent-list-agents',
  'dsh-native-collab-agent-team',
  'dsh-native-collab-tool-agent-team',
])

type CurrentState = 'enabled' | 'disabled' | 'unknown'
export interface CollabUiStatus {
  profileName: string | null
  hmrEnabled: boolean | null
  rows: Array<{ id: string; moduleName: string; current: CurrentState; sourceLayer: 'unknown'; runtimePhase: string | null }>
  desired: 'unchanged'
  pendingRestart: 'unknown'
  writeSupport: 'unsupported'
  operationError: 'transaction-unavailable'
  error: 'profile-unavailable' | 'inventory-unavailable' | null
  assembly: AssemblySnapshot | null
}

const COLLAB_UI_BRAND = Symbol.for('@dsh-native-collab/derived.collabUi')

interface AssemblySnapshot {
  readonly present: true
  readonly modelEnhancement: boolean | undefined
  readonly communicationEnhancement: boolean | undefined
  readonly nativeModelSelectionCompatibility: boolean | undefined
  readonly runningChildGuidance?: boolean
  readonly completedChildContinuation?: boolean
  readonly teamRequestLimit?: number
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
    runningChildGuidance: readOverlayFlag(config?.runningChildGuidance),
    completedChildContinuation: readOverlayFlag(config?.completedChildContinuation),
    teamRequestLimit: readRequestLimit(config?.teamRequestLimit, true),
  })
}

export type CollabUiAction = 'enable' | 'restore'
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
  assembly: AssemblySnapshot | undefined
  private readonly bootComponent: () => Promise<BootSwitchManager>

  constructor(ctx: Context, config?: Record<string, unknown>) {
    super(ctx, 'collabUi')
    Object.defineProperty(this, COLLAB_UI_BRAND, { value: true })
    this.assembly = captureAssembly(config)
    // Capture the owning plugin Context, never an ephemeral gateway invocation Context.
    let boot: Promise<BootSwitchManager> | undefined
    this.bootComponent = () => boot ??= import('./boot-switch.ts').then(module => new module.BootSwitchManager(ctx))
    // ConfigEditor calls this waterfall before writing YAML. Schemastery treats
    // optional null as absent, so enforce the numeric write contract here, scoped
    // to this exact plugin fiber. Clearing uses the official op:unset path.
    ctx.on('internal/config', function (this: import('@deepseek-ai/cordis').Fiber, _raw, next) {
      const raw: unknown = next()
      // Cordis may expose a reflected Fiber proxy to listeners; uid identifies
      // the exact lifetime within this Context tree without proxy identity drift.
      if (this.uid !== ctx.fiber.uid) return raw
      if (typeof raw === 'object' && raw !== null && 'teamRequestLimit' in raw) {
        readRequestLimit(raw.teamRequestLimit)
      }
      return raw
    })
  }

  /** Startup snapshot frozen by this construction. Not a live subscription. */
  assemblySnapshot(): AssemblySnapshot | null {
    return this.assembly ?? null
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
      const matches = inventory?.filter(row => row.moduleName === target.moduleName) ?? []
      const row = matches.length === 1 ? matches[0] : undefined
      return {
        ...target,
        current: row === undefined ? 'unknown' as const : row.enabled ? 'enabled' as const : 'disabled' as const,
        sourceLayer: 'unknown' as const,
        runtimePhase: row?.fiberPhase ?? null,
      }
    })
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
    }
  }

  /** Explicit next-start state; does not change an active Agent or service assembly. */
  @Remote
  async bootStatus(): Promise<BootStatus> { return (await this.bootComponent()).status() }

  /** Read-only, concrete target list plus a short-lived, one-shot confirmation token. */
  @Remote
  async bootPlan(action: CollabUiAction): Promise<BootPlan> {
    if (action !== 'enable' && action !== 'restore') invalidBootInput('bootPlan', 'action')
    return (await this.bootComponent()).plan(action)
  }

  /** The only startup-cover mutation endpoint: requires an issued, unchanged plan. */
  @Remote
  async bootApply(planId: string): Promise<BootResult> {
    if (typeof planId !== 'string' || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(planId)) invalidBootInput('bootApply', 'planId')
    return (await this.bootComponent()).apply(planId)
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
