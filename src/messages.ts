import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type { Preferences } from './config.ts'
import { AutoWakeGuard } from './auto-wake.ts'
import type {} from '@deepseek-ai/dsh-subagent'

/** Policy on model-authored messages. The native service still authorizes and delivers every accepted send. */
export class MessagePolicy {
  private readonly wakes = new AutoWakeGuard()

  constructor(private readonly ctx: Context, private readonly preferences: () => Preferences) {
    ctx.on('agent/inbox/inserted', ({ agent, message }) => {
      const kind: string = message.source.kind
      if (kind !== 'user' && kind !== 'user-question-reply') return
      const subagents = ctx.get('subagents')
      if (subagents) this.wakes.reset(subagents.rootOf(agent))
    }, { global: true })
  }

  async send<T>(sender: Agent, targetId: SessionId, taskResult: boolean, signal: AbortSignal, next: () => Promise<T>): Promise<T> {
    const subagents = this.ctx.get('subagents')
    if (!subagents) throw new Error('Native collaboration services are unavailable')
    const root = subagents.rootOf(sender)
    const preferences = this.preferences()
    if (taskResult && (sender === root || sender.session.header.parentSession !== targetId)) {
      throw new Error('task_result is only allowed for a completed-task report to your direct parent')
    }
    signal.throwIfAborted()
    const reservation = taskResult ? undefined : this.wakes.reserve(root, preferences.teamRequestLimit)
    try {
      const result = await next()
      reservation?.commit()
      return result
    } catch (error) {
      reservation?.refund()
      throw error
    }
  }
}
