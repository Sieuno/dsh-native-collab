import type { FiberState, Context } from '@deepseek-ai/cordis'
import { ASSEMBLY_ROLES, type RuntimeRole } from './assembly-layout.ts'

// Cordis 4.0.5 declares FiberState as a const enum: it has NO runtime export.
// Single-file transpilation cannot inline an external enum. The build verifies
// this local compatibility table against the installed declaration, without
// importing or starting the host. Do not swap DISPOSED (4) and UNLOADING (5).
const CORDIS_FIBER_STATE = Object.freeze({
  PENDING: 0,
  LOADING: 1,
  ACTIVE: 2,
  FAILED: 3,
  DISPOSED: 4,
  UNLOADING: 5,
} as const)

export type ManagedPhase = 'not-requested' | 'loading' | 'ready' | 'failed' | 'disposing' | 'disposed'
export interface ManagedRuntimeStatus {
  readonly mode: 'native' | 'managed'
  readonly phase: ManagedPhase
  readonly services: ReadonlyArray<{ role: RuntimeRole; phase: ManagedPhase; failure: string | null }>
}

type ManagedFiber = { dispose(): Promise<void> | void; state: FiberState }
type PluginContext = Context & { plugin(plugin: unknown, config?: unknown): PromiseLike<ManagedFiber> }
const ROLE_CONFIG: Partial<Record<RuntimeRole, Record<string, unknown>>> = {
  'agent-team': { enhancedSelection: true },
  'team-tools': { interrupt: true, freshProvider: 'spawn', forkProvider: 'fork' },
}

/** The root owns one child fiber per non-preset runtime role; readiness follows CORDIS_FIBER_STATE. */
export class ManagedRuntime {
  private readonly statuses = new Map<RuntimeRole, { phase: ManagedPhase; failure: string | null }>()
  private readonly disposers: Array<{ role: RuntimeRole; fiber: ManagedFiber }> = []
  private phase: ManagedPhase
  private readonly mode: 'native' | 'managed'
  private closed = false
  private epoch = 0
  private disposePromise: Promise<void> | undefined

  constructor(private readonly ctx: Context, mode: 'native' | 'managed') {
    this.mode = mode
    this.phase = mode === 'managed' ? 'loading' : 'not-requested'
    for (const { role, placement } of ASSEMBLY_ROLES) {
      if (placement === 'runtime') this.statuses.set(role, { phase: mode === 'managed' ? 'loading' : 'not-requested', failure: null })
    }
    if (mode === 'managed') void this.start()
  }

  status(): ManagedRuntimeStatus {
    return { mode: this.mode, phase: this.phase, services: [...this.statuses].map(([role, value]) => ({ role, ...value })) }
  }

  private syncPhase(): void {
    if (this.closed) return
    const phases = [...this.statuses.values()].map(value => value.phase)
    this.phase = phases.includes('failed') ? 'failed' : phases.every(value => value === 'ready') ? 'ready' : 'loading'
  }

  private applyFiberState(role: RuntimeRole, fiber: ManagedFiber): void {
    const status = this.statuses.get(role)
    if (!status || this.closed) return
    switch (fiber.state) {
      case CORDIS_FIBER_STATE.ACTIVE: status.phase = 'ready'; status.failure = null; break
      case CORDIS_FIBER_STATE.FAILED: status.phase = 'failed'; status.failure ??= 'plugin-start-failed'; break
      case CORDIS_FIBER_STATE.PENDING:
      case CORDIS_FIBER_STATE.LOADING: status.phase = 'loading'; break
      case CORDIS_FIBER_STATE.UNLOADING: status.phase = 'disposing'; break
      case CORDIS_FIBER_STATE.DISPOSED: status.phase = 'disposed'; break
    }
    this.syncPhase()
  }

  private async start(): Promise<void> {
    const host = this.ctx as PluginContext
    const epoch = this.epoch
    const inheritedConfigs = new Map<RuntimeRole, Record<string, unknown>>()
    // Fail closed before creating *any* child. A hand-edited runtimeMode must not
    // recreate the duplicate native/managed providers seen in the trial build.
    try {
      const manager = this.ctx.get('pluginManager') as { listPlugins?: () => Promise<unknown> } | undefined
      if (typeof manager?.listPlugins !== 'function') throw new Error('inventory-unavailable')
      const inventory = await manager.listPlugins()
      if (!Array.isArray(inventory)) throw new Error('inventory-unavailable')
      // Preset-scoped legacy tools must not survive as independently enabled root entries.
      if (ASSEMBLY_ROLES.some(spec => inventory.some(row => row && typeof row === 'object' && row.moduleName === spec.moduleName && row.enabled !== false))) throw new Error('ownership-not-released')
      for (const spec of ASSEMBLY_ROLES.filter(role => role.placement === 'runtime')) {
        const native = inventory.filter(row => row && typeof row === 'object' && row.moduleName === spec.nativeModuleName)
        if (native.length !== 1 || native[0].enabled !== false) throw new Error('ownership-not-released')
      }
      if (ASSEMBLY_ROLES.filter(role => role.placement === 'preset').some(spec => inventory.some(row => row && typeof row === 'object' && row.moduleName === spec.nativeModuleName && row.enabled !== false))) throw new Error('ownership-not-released')
      if (this.ctx.get('subagents') !== undefined || this.ctx.get('agentTeams') !== undefined) throw new Error('ownership-not-released')
      // Retain supported native role settings without copying/pinning their YAML.
      const loader = this.ctx.get('loader') as { entries?: () => Iterable<{ options: { name?: string; config?: unknown } }> } | undefined
      if (typeof loader?.entries === 'function') {
        const entries = [...loader.entries()]
        for (const spec of ASSEMBLY_ROLES.filter(role => role.placement === 'runtime')) {
          const matches = entries.filter(entry => entry.options.name === spec.nativeModuleName)
          if (matches.length !== 1) throw new Error('ownership-not-released')
          const raw = matches[0]!.options.config
          if (raw !== undefined && (raw === null || typeof raw !== 'object' || Array.isArray(raw) || '__jsExpr' in raw)) throw new Error('ownership-not-released')
          inheritedConfigs.set(spec.role as RuntimeRole, { ...(raw as Record<string, unknown> | undefined) })
        }
      }
    } catch {
      if (this.closed || epoch !== this.epoch) return
      for (const status of this.statuses.values()) { status.phase = 'failed'; status.failure = 'ownership-unverified' }
      this.phase = 'failed'
      return
    }
    if (this.closed || epoch !== this.epoch) return
    for (const spec of ASSEMBLY_ROLES) {
      if (this.closed || epoch !== this.epoch) return
      if (spec.placement !== 'runtime') continue
      const role = spec.role as RuntimeRole
      const status = this.statuses.get(role)!
      try {
        const module = await import(spec.moduleName) as { default?: unknown; apply?: unknown }
        if (this.closed || epoch !== this.epoch) return
        const plugin = module.default ?? module
        // Cordis returns a Fiber & PromiseLike synchronously. Record it before awaiting:
        // disposal can now cancel/unload even while its dependency gate is pending.
        const fiber = host.plugin(plugin, { ...inheritedConfigs.get(role), ...ROLE_CONFIG[role] }) as ManagedFiber & PromiseLike<ManagedFiber>
        this.disposers.push({ role, fiber })
        this.ctx.on('internal/status', (changed: ManagedFiber) => {
          if (changed === fiber) this.applyFiberState(role, fiber)
        })
        this.applyFiberState(role, fiber)
        await fiber
        if (this.closed || epoch !== this.epoch) return
        this.applyFiberState(role, fiber)
        if (fiber.state === CORDIS_FIBER_STATE.FAILED) throw new Error('plugin-start-failed')
      } catch {
        if (this.closed || epoch !== this.epoch) return
        if (status.phase !== 'failed') status.phase = 'failed'
        status.failure = 'plugin-start-failed'
        this.syncPhase()
        await this.disposeChildren()
        return
      }
    }
    this.syncPhase()
  }

  private disposeChildren(): Promise<void> {
    if (this.disposePromise) return this.disposePromise
    this.closed = true
    this.epoch++
    this.phase = 'disposing'
    for (const value of this.statuses.values()) if (value.phase !== 'not-requested' && value.phase !== 'failed') value.phase = 'disposing'
    this.disposePromise = (async () => {
      const failures: unknown[] = []
      for (const { role, fiber } of this.disposers.splice(0).reverse()) {
        try { await fiber.dispose() } catch (error) {
          failures.push(error)
          const status = this.statuses.get(role)
          if (status) { status.phase = 'failed'; status.failure = 'plugin-cleanup-failed' }
        }
      }
      for (const value of this.statuses.values()) if (value.phase === 'disposing' || value.phase === 'loading' || value.phase === 'ready') value.phase = 'disposed'
      this.phase = this.statusesHasFailure() ? 'failed' : 'disposed'
      if (failures.length) this.ctx.logger?.error?.('Managed runtime cleanup failed', failures)
    })()
    return this.disposePromise
  }

  private statusesHasFailure(): boolean { return [...this.statuses.values()].some(value => value.phase === 'failed') }

  dispose(): Promise<void> { return this.disposeChildren() }
}
