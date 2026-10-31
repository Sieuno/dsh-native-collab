import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { withFileLock, writeFileAtomic } from '@deepseek-ai/dsh-atomic-write';
import { isMap, isSeq, parseDocument, Scalar, visit } from 'yaml';
const NATIVE_ID = 'subagent';
const NATIVE_NAME = '@deepseek-ai/dsh-subagent';
const DEFAULTS = Object.freeze({ maxDepth: 1, maxActiveSubagents: 8 });
const LIMIT_KEYS = ['maxDepth', 'maxActiveSubagents'];
const defaultIo = { readFile, withFileLock, writeFileAtomic };
class NativeLimitsError extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
    }
}
function fail(code) { throw new NativeLimitsError(code); }
function safeCode(error) {
    return error instanceof NativeLimitsError ? error.code : 'native-subagent-unavailable';
}
function service(ctx, name) {
    try {
        return ctx.get(name);
    }
    catch {
        return undefined;
    }
}
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function unwrap(value) {
    if (!record(value) || typeof value.get !== 'function')
        return value;
    return value.get.call(value);
}
function expression(value) {
    return record(value) && Object.keys(value).length === 1 && typeof value.__jsExpr === 'string';
}
function configRecord(value, label) {
    const current = unwrap(value);
    if (current === undefined)
        return {};
    if (!record(current) || expression(current))
        fail(`${label}-invalid-config`);
    return current;
}
function plainConfig(value, seen = new WeakSet()) {
    const current = unwrap(value);
    if (current === undefined || current === null || typeof current === 'string' || typeof current === 'boolean')
        return current;
    if (typeof current === 'number' && Number.isFinite(current))
        return current;
    if (typeof current !== 'object')
        fail('native-subagent-config-not-json');
    if (seen.has(current))
        fail('native-subagent-config-not-json');
    seen.add(current);
    if (Array.isArray(current)) {
        const result = current.map(item => plainConfig(item, seen));
        seen.delete(current);
        return result;
    }
    if (expression(current)) {
        seen.delete(current);
        return { __jsExpr: current.__jsExpr };
    }
    const prototype = Object.getPrototypeOf(current);
    if (prototype !== Object.prototype && prototype !== null)
        fail('native-subagent-config-not-json');
    const result = {};
    for (const [key, child] of Object.entries(current)) {
        const plain = plainConfig(child, seen);
        if (plain !== undefined)
            result[key] = plain;
    }
    seen.delete(current);
    return result;
}
function canonicalConfig(config) {
    const plain = plainConfig(config);
    const sort = (value) => {
        if (Array.isArray(value))
            return value.map(sort);
        if (!record(value))
            return value;
        return Object.fromEntries(Object.keys(value).sort().map(key => [key, sort(value[key])]));
    };
    return JSON.stringify(sort(plain)) ?? '';
}
function seedConfig(config, values) {
    const plain = plainConfig(config);
    if (!record(plain) || expression(plain))
        fail('native-subagent-config-not-json');
    return { ...plain, ...values };
}
function nativeConfigNode(document, config) {
    const node = document.createNode(config);
    // Only the newly seeded native config contains Loader expression markers.
    // Existing Profile nodes, including literal __jsExpr maps, remain untouched.
    visit(node, { Map(_key, map) {
            if (map.items.length !== 1 || typeof map.get('__jsExpr') !== 'string')
                return;
            const expressionNode = new Scalar(map.get('__jsExpr'));
            expressionNode.tag = 'tag:yaml.org,2002:js';
            return expressionNode;
        } });
    return node;
}
function integer(value, key) {
    const current = unwrap(value);
    const min = key === 'maxDepth' ? 0 : 1;
    if (typeof current !== 'number' || !Number.isSafeInteger(current) || Object.is(current, -0) || current < min) {
        fail(`${key}-invalid`);
    }
    return current;
}
function getLimits(config) {
    const values = configRecord(config, 'native-subagent');
    return {
        maxDepth: Object.hasOwn(values, 'maxDepth') ? integer(values.maxDepth, 'maxDepth') : DEFAULTS.maxDepth,
        maxActiveSubagents: Object.hasOwn(values, 'maxActiveSubagents')
            ? integer(values.maxActiveSubagents, 'maxActiveSubagents') : DEFAULTS.maxActiveSubagents,
    };
}
function entriesOf(ctx) {
    const loader = service(ctx, 'loader');
    if (typeof loader?.entries !== 'function')
        return [];
    const rows = [...loader.entries()];
    if (rows.some(row => !record(row) || !record(row.options)))
        fail('native-subagent-inventory-invalid');
    return rows;
}
function nativeEntry(ctx) {
    const rows = entriesOf(ctx);
    const idMatches = rows.filter(entry => entry.options.id === NATIVE_ID);
    if (idMatches.some(entry => entry.options.name !== NATIVE_NAME))
        fail('native-subagent-entry-name-mismatch');
    if (idMatches.length > 1)
        fail('native-subagent-entry-ambiguous');
    return idMatches[0];
}
/** Read the unique native loader entry's effective config synchronously, without starting it. */
export function currentNativeSubagentLimits(ctx) {
    const entry = nativeEntry(ctx);
    return entry === undefined ? undefined : getLimits(entry.options.config);
}
export const currentSubagentLimits = currentNativeSubagentLimits;
function exactEditorRow(ctx, entry) {
    const editor = service(ctx, 'configEditor');
    if (typeof editor?.configuration !== 'function')
        fail('native-subagent-config-editor-unavailable');
    const rows = editor.configuration();
    if (!Array.isArray(rows))
        fail('native-subagent-config-editor-invalid');
    const matches = rows.filter(row => record(row) && row.entry === entry);
    if (matches.length !== 1)
        fail('native-subagent-config-layer-unavailable');
    const match = matches[0];
    return { entry, inherited: match.inherited, override: match.override };
}
function higherOverlay(ctx) {
    const profile = service(ctx, 'profileContext');
    if (!Array.isArray(profile?.overlays))
        fail('native-subagent-overlay-source-unavailable');
    for (const row of profile.overlays) {
        if (!record(row))
            fail('native-subagent-overlay-source-invalid');
        // Any explicit higher-layer config replaces the entire object. An insert
        // with the same id also makes the native source ambiguous.
        if (row.id === NATIVE_ID && (row.insert !== undefined || Object.hasOwn(row, 'config')))
            return true;
    }
    return false;
}
function validateLayers(layer, profileHasConfig) {
    const inherited = configRecord(layer.inherited, 'native-subagent-inherited');
    const override = configRecord(layer.override, 'native-subagent-override');
    const current = configRecord(layer.entry.options.config, 'native-subagent-current');
    // Include applies a `config` patch by replacing the whole object, not merging
    // keys. An explicit empty config is still a replacement and hides inherited keys.
    const effective = profileHasConfig ? override : inherited;
    if (canonicalConfig(current) !== canonicalConfig(effective))
        fail('native-subagent-higher-priority-override');
    for (const key of LIMIT_KEYS) {
        const expected = Object.hasOwn(effective, key) ? integer(effective[key], key) : DEFAULTS[key];
        const actual = Object.hasOwn(current, key) ? integer(current[key], key) : DEFAULTS[key];
        if (actual !== expected)
            fail('native-subagent-higher-priority-override');
    }
    return getLimits(current);
}
function getProfile(ctx) {
    const profile = service(ctx, 'profileContext');
    if (typeof profile?.patchPath !== 'string' || profile.patchPath.length === 0 || typeof profile.dir !== 'string' || profile.dir.length === 0) {
        fail('native-subagent-profile-unavailable');
    }
    return { patchPath: profile.patchPath, dir: profile.dir };
}
async function readDocument(io, path) {
    try {
        return await io.readFile(path, 'utf8');
    }
    catch (error) {
        if (record(error) && error.code === 'ENOENT')
            return '[]\n';
        throw error;
    }
}
function parsePatch(source) {
    const document = parseDocument(source, { customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: (value) => value }] });
    if (document.errors.length > 0)
        fail('native-subagent-profile-yaml-invalid');
    if (!isSeq(document.contents))
        fail('native-subagent-profile-not-sequence');
    document.contents.flow = false;
    return document;
}
function yamlTarget(document) {
    const rows = document.contents.items;
    const matchingIds = [];
    const targets = [];
    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        if (!isMap(row))
            fail('native-subagent-profile-row-invalid');
        if (document.getIn([index, 'id']) !== NATIVE_ID || row.has('insert'))
            continue;
        matchingIds.push(index);
        const name = document.getIn([index, 'name']);
        if (name !== undefined && name !== NATIVE_NAME)
            fail('native-subagent-profile-name-mismatch');
        targets.push(index);
    }
    if (targets.length > 1 || matchingIds.length !== targets.length)
        fail('native-subagent-profile-row-ambiguous');
    if (!targets.length)
        return undefined;
    const index = targets[0];
    const config = document.getIn([index, 'config']);
    if (config !== undefined && !isMap(config))
        fail('native-subagent-profile-config-not-map');
    return { index, config: config ?? document.createNode({}), hasConfig: config !== undefined };
}
function validateRequest(request) {
    if (!record(request) || typeof request.revision !== 'string' || request.revision.length === 0)
        fail('native-subagent-request-invalid');
    return { maxDepth: integer(request.maxDepth, 'maxDepth'), maxActiveSubagents: integer(request.maxActiveSubagents, 'maxActiveSubagents') };
}
function digest(source, state) {
    let stateText;
    try {
        stateText = JSON.stringify(state) ?? '';
    }
    catch {
        fail('native-subagent-state-invalid');
    }
    return createHash('sha256').update(source).update('\0').update(stateText).digest('hex');
}
/** Read-only Profile adapter for the disabled native Subagent loader entry. */
export class NativeSubagentLimits {
    ctx;
    io;
    constructor(ctx, io = defaultIo) {
        this.ctx = ctx;
        this.io = io;
    }
    async snapshot() {
        const ctx = this.ctx;
        const entry = nativeEntry(ctx);
        if (entry === undefined)
            fail('native-subagent-entry-missing');
        if (entry.disabled !== true || entry.fiber !== undefined)
            fail('native-subagent-entry-not-disabled');
        const layer = exactEditorRow(ctx, entry);
        if (higherOverlay(ctx))
            fail('native-subagent-higher-priority-override');
        const { patchPath, dir } = getProfile(ctx);
        const editor = service(ctx, 'configEditor');
        if (editor?.documentPath !== patchPath)
            fail('native-subagent-profile-path-mismatch');
        const source = await readDocument(this.io, patchPath);
        const document = parsePatch(source);
        const target = yamlTarget(document);
        const values = validateLayers(layer, target?.hasConfig ?? false);
        const revision = digest(source, { values, profileHasConfig: target?.hasConfig ?? false, inherited: layer.inherited, override: layer.override, current: entry.options.config });
        const writable = true;
        return { view: { values, revision, writable }, entry, layer, source, path: patchPath, dir };
    }
    async read() {
        try {
            return (await this.snapshot()).view;
        }
        catch (error) {
            throw new NativeLimitsError(safeCode(error));
        }
    }
    async save(request) {
        const values = validateRequest(request);
        const ctx = this.ctx;
        const profile = getProfile(ctx);
        const run = async () => this.io.withFileLock(join(profile.dir, 'package.json'), async () => {
            const before = await this.snapshot();
            if (request.revision !== before.view.revision)
                fail('native-limits-conflict');
            const document = parsePatch(before.source);
            const target = yamlTarget(document);
            const oldConfig = before.entry.options.config;
            const seededConfig = seedConfig(oldConfig, values);
            if (target === undefined) {
                document.add(document.createNode({ id: NATIVE_ID, name: NATIVE_NAME, config: nativeConfigNode(document, seededConfig) }));
            }
            else {
                const row = document.contents.items[target.index];
                if (!isMap(row))
                    fail('native-subagent-profile-row-invalid');
                if (!target.hasConfig) {
                    row.set('config', nativeConfigNode(document, seededConfig));
                }
                else {
                    row.set('config', target.config);
                    for (const key of LIMIT_KEYS)
                        document.setIn([target.index, 'config', key], values[key]);
                }
            }
            const after = String(document);
            const nextConfig = { ...configRecord(oldConfig, 'native-subagent-current'), ...values };
            let written = false;
            try {
                await this.io.writeFileAtomic(before.path, after, { mode: 0o600 });
                written = true;
                if (typeof before.entry.update !== 'function')
                    fail('native-subagent-loader-update-unavailable');
                await before.entry.update({ config: nextConfig });
                const updated = await this.snapshot();
                if (updated.view.values.maxDepth !== values.maxDepth || updated.view.values.maxActiveSubagents !== values.maxActiveSubagents) {
                    fail('native-subagent-sync-mismatch');
                }
                return updated.view;
            }
            catch (error) {
                const rollbackFailures = [];
                if (written) {
                    try {
                        await this.io.writeFileAtomic(before.path, before.source, { mode: 0o600 });
                    }
                    catch (rollbackError) {
                        rollbackFailures.push(rollbackError);
                    }
                }
                try {
                    await before.entry.update?.({ config: oldConfig });
                }
                catch (rollbackError) {
                    rollbackFailures.push(rollbackError);
                }
                if (rollbackFailures.length)
                    throw new AggregateError([error, ...rollbackFailures], 'native-subagent-save-rollback-failed');
                throw error;
            }
        });
        try {
            const hmr = service(ctx, 'hmr');
            return await (typeof hmr?.runExclusive === 'function' ? hmr.runExclusive(run) : run());
        }
        catch (error) {
            throw new NativeLimitsError(safeCode(error));
        }
    }
}
