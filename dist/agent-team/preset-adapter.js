export const MANAGED_PRESET_IDS = Object.freeze(['preset-standard', 'preset-minimal', 'preset-ptc', 'preset-cordis']);
const PRESET_MODULE = '@deepseek-ai/dsh-agent-preset';
const TOOLS = Object.freeze({
    'tool-subagent-control': { native: '@deepseek-ai/dsh-tool-subagent-control', managed: '@sieuno/dsh-native-collab/tool-subagent-control' },
    'tool-subagent-list-agents': { native: '@deepseek-ai/dsh-tool-subagent-control/list-agents', managed: '@sieuno/dsh-native-collab/tool-subagent-control/list-agents' },
});
function record(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
/** Copy-on-write adaptation of one activation config; never writes or pins a preset. */
export function adaptPresetConfig(value, flags = { model: true, communication: true }) {
    if (!flags.model && !flags.communication)
        return value;
    if (!record(value) || !Array.isArray(value.plugins))
        return value;
    let changed = false;
    const visit = (input) => {
        if (!record(input))
            return input;
        if (input.group === true && Array.isArray(input.config)) {
            const children = input.config.map(visit);
            if (children.some((child, index) => child !== input.config[index])) {
                changed = true;
                return { ...input, config: children };
            }
            return input;
        }
        const name = input.name;
        if (typeof name !== 'string')
            return input;
        const control = typeof input.id === 'string' ? TOOLS[input.id] : undefined;
        if (flags.communication && control?.native === name) {
            changed = true;
            return { ...input, name: control.managed };
        }
        if (!flags.model || name !== '@deepseek-ai/dsh-tool-subagent')
            return input;
        if (input.config !== undefined && !record(input.config))
            return input;
        const config = record(input.config) ? input.config : {};
        // Match identity AND provider: custom/dynamic providers keep their meaning.
        const spawn = input.id === 'tool-subagent' && (config.provider === undefined || config.provider === 'spawn');
        const fork = input.id === 'tool-subagent-fork' && config.provider === 'fork';
        if (!spawn && !fork)
            return input;
        changed = true;
        return { ...input, name: fork
                ? '@sieuno/dsh-native-collab/tool-subagent/fork'
                : '@sieuno/dsh-native-collab/tool-subagent' };
    };
    const plugins = value.plugins.map(visit);
    return changed ? { ...value, plugins } : value;
}
/**
 * The package patch gates the four preset declarations on `subagents`.
 * With this entry enabled, its hook is installed before its child provides that
 * service. With this entry disabled, native subagents release the same gate and
 * this hook is absent: the original preset activates unchanged.
 */
export function installPresetAdapter(ctx, enhancements) {
    ctx.on('internal/config', function (_raw, next) {
        const value = next();
        const entry = this.entry;
        if (!entry || this.parent.fiber?.entry === entry || entry.options.name !== PRESET_MODULE || !MANAGED_PRESET_IDS.includes(entry.options.id ?? ''))
            return value;
        return adaptPresetConfig(value, enhancements());
    }, { global: true, prepend: true });
}
