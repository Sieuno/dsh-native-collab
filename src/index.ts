import { Service, type Context, type Fiber } from '@deepseek-ai/cordis'
import * as delegation from '@deepseek-ai/dsh-tool-subagent'
import * as control from '@deepseek-ai/dsh-tool-subagent-control'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import { Config, preferences } from './config.ts'
import type { Config as PreferencesConfig } from './config.ts'
import { MessagePolicy } from './messages.ts'
import { nativeToolContext } from './native-tools.ts'
import { assertNativeHost } from './host.ts'

declare module '@deepseek-ai/cordis' {
  interface Context { collabEnhancements: { readonly enabled: boolean } }
}

/** Preferences and scoped adapters over the installed official tools. Owns no Agents or Team state. */
export default class NativeCollab extends Service {
  static Config = Config
  static inject: string[] = []
  readonly enabled = true

  constructor(ctx: Context, config: PreferencesConfig) {
    super(ctx, 'collabEnhancements')
    assertNativeHost()
    const current = () => preferences(config)
    current()
    const messages = new MessagePolicy(ctx, current)
    const adapted = new WeakSet<Fiber>()
    const contexts = new Set<() => void>()
    const waitToolUpdates = new Set<() => void>()
    ctx.on('loader/volatile-update', paths => {
      if (!paths.some(path => path[0] === 'disableWaitAgent')) return
      for (const update of waitToolUpdates) update()
    })
    ctx.effect(() => () => {
      for (const dispose of contexts) dispose()
      contexts.clear()
    }, 'nativeCollab.nativeToolContexts()')
    ctx.on('internal/config', function (this: Fiber | null, first: unknown, next: () => unknown) {
      const raw = next()
      const fiber = this ?? first as Fiber | null
      const callback = fiber?.runtime?.callback
      if (!fiber || callback !== delegation.apply && callback !== control.apply) return raw
      const value = raw !== null && typeof raw === 'object' ? raw as Record<string, unknown> : {}
      if (callback === delegation.apply
        && !((value.provider === 'spawn' && (value.toolName === undefined || value.toolName === 'subagent'))
          || value.provider === 'fork' && value.toolName === 'subagent_fork')) return raw
      if (!adapted.has(fiber)) {
        let dispose: (() => void) | undefined
        dispose = nativeToolContext(fiber.ctx, callback === delegation.apply ? 'delegation' : 'control', current, messages,
          callback === control.apply || value.provider === 'spawn', waitToolUpdates, () => {
            adapted.delete(fiber)
            if (dispose) contexts.delete(dispose)
          })
        contexts.add(dispose)
        adapted.add(fiber)
      }
      return callback === delegation.apply && value.provider === 'spawn'
        ? { ...value, modelSelection: true, modelDiscovery: true } : raw
    }, { global: true, prepend: true })
  }
}
