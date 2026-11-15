import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export function assertNativeHost() {
    let expected;
    for (const name of ['subagent', 'tool-subagent', 'tool-subagent-control']) {
        const { version } = require(`@deepseek-ai/dsh-${name}/package.json`);
        if (version !== '0.2.2-rc.2' && version !== '0.2.2-rc.3') {
            throw new Error(`Native collaboration extensions require DSH 0.2.2-rc.2 or rc.3; ${name} is ${version}`);
        }
        if (expected !== undefined && version !== expected)
            throw new Error('Native collaboration packages must use the same DSH release');
        expected = version;
    }
}
