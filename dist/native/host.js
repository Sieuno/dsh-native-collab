import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const supportedVersions = ['0.2.2-rc.2', '0.2.2-rc.3', '0.2.2-rc.4', '0.2.2-rc.5'];
export function assertNativeHost() {
    let expected;
    for (const name of ['subagent', 'tool-subagent', 'tool-subagent-control']) {
        const { version } = require(`@deepseek-ai/dsh-${name}/package.json`);
        if (!supportedVersions.includes(version)) {
            throw new Error(`Native collaboration extensions require one of DSH ${supportedVersions.join(', ')}. Found ${name} ${version}.`);
        }
        if (expected !== undefined && version !== expected)
            throw new Error('Native collaboration packages must use the same DSH release');
        expected = version;
    }
}
