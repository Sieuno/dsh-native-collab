import { Service } from '@deepseek-ai/cordis';
import * as delegation from '@deepseek-ai/dsh-tool-subagent';
import * as control from '@deepseek-ai/dsh-tool-subagent-control';
import { Config, preferences } from './config.js';
import { MessagePolicy } from './messages.js';
import { nativeToolContext } from './native-tools.js';
import { assertNativeHost } from './host.js';
/** Preferences and scoped adapters over the installed official tools. Owns no Agents or Team state. */
export default class NativeCollab extends Service {
    static Config = Config;
    static inject = [];
    enabled = true;
    constructor(ctx, config) {
        super(ctx, 'collabEnhancements');
        assertNativeHost();
        const current = () => preferences(config);
        current();
        const messages = new MessagePolicy(ctx, current);
        const adapted = new WeakSet();
        const contexts = new Set();
        const waitToolUpdates = new Set();
        ctx.on('loader/volatile-update', paths => {
            if (!paths.some(path => path[0] === 'disableWaitAgent'))
                return;
            for (const update of waitToolUpdates)
                update();
        });
        ctx.effect(() => () => {
            for (const dispose of contexts)
                dispose();
            contexts.clear();
        }, 'nativeCollab.nativeToolContexts()');
        ctx.on('internal/config', function (first, next) {
            const raw = next();
            const fiber = this ?? first;
            const callback = fiber?.runtime?.callback;
            if (!fiber || callback !== delegation.apply && callback !== control.apply)
                return raw;
            const value = raw !== null && typeof raw === 'object' ? raw : {};
            if (callback === delegation.apply
                && !((value.provider === 'spawn' && (value.toolName === undefined || value.toolName === 'subagent'))
                    || value.provider === 'fork' && value.toolName === 'subagent_fork'))
                return raw;
            if (!adapted.has(fiber)) {
                let dispose;
                dispose = nativeToolContext(fiber.ctx, callback === delegation.apply ? 'delegation' : 'control', current, messages, callback === control.apply || value.provider === 'spawn', waitToolUpdates, () => {
                    adapted.delete(fiber);
                    if (dispose)
                        contexts.delete(dispose);
                });
                contexts.add(dispose);
                adapted.add(fiber);
            }
            return callback === delegation.apply && value.provider === 'spawn'
                ? { ...value, modelSelection: true, modelDiscovery: true } : raw;
        }, { global: true, prepend: true });
    }
}
