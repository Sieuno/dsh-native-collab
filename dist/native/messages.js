import { AutoWakeGuard } from './auto-wake.js';
/** Policy on model-authored messages. The native service still authorizes and delivers every accepted send. */
export class MessagePolicy {
    ctx;
    preferences;
    wakes = new AutoWakeGuard();
    constructor(ctx, preferences) {
        this.ctx = ctx;
        this.preferences = preferences;
        ctx.on('agent/inbox/inserted', ({ agent, message }) => {
            const kind = message.source.kind;
            if (kind !== 'user' && kind !== 'user-question-reply')
                return;
            const subagents = ctx.get('subagents');
            if (subagents)
                this.wakes.reset(subagents.rootOf(agent));
        }, { global: true });
    }
    async send(sender, targetId, taskResult, signal, next) {
        const subagents = this.ctx.get('subagents');
        if (!subagents)
            throw new Error('Native collaboration services are unavailable');
        const root = subagents.rootOf(sender);
        const preferences = this.preferences();
        if (taskResult && (sender === root || sender.session.header.parentSession !== targetId)) {
            throw new Error('task_result is only allowed for a completed-task report to your direct parent');
        }
        signal.throwIfAborted();
        const reservation = taskResult ? undefined : this.wakes.reserve(root, preferences.teamRequestLimit);
        try {
            const result = await next();
            reservation?.commit();
            return result;
        }
        catch (error) {
            reservation?.refund();
            throw error;
        }
    }
}
