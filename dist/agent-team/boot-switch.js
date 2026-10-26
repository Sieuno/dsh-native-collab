import { createHash, randomUUID } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { bundlePatchPaths, composeEntries, evaluatePluginCompatibility, loadOverlayPatches, readProfileManifest, readProfilePatches, readProfileVersionExemptions, resolveBundleDir, } from '@deepseek-ai/dsh-app-boot';
import { withFileLock, writeFileAtomic } from '@deepseek-ai/dsh-atomic-write';
import { isMap, isSeq, parseDocument, Scalar, visit } from 'yaml';
const PACKAGE = '@sieuno/dsh-native-collab';
const JS_TAG = 'tag:yaml.org,2002:js';
const TTL_MS = 5 * 60_000;
const MAX_PLANS = 16;
const PRESET_NAME = '@deepseek-ai/dsh-agent-preset';
const PAIRS = [
    ['subagent', '@deepseek-ai/dsh-subagent', 'dsh-native-collab-subagent', `${PACKAGE}/subagent`],
    ['tool-subagent-control', '@deepseek-ai/dsh-tool-subagent-control', 'dsh-native-collab-tool-subagent-control', `${PACKAGE}/tool-subagent-control`],
    ['tool-subagent-list-agents', '@deepseek-ai/dsh-tool-subagent-control/list-agents', 'dsh-native-collab-tool-subagent-list-agents', `${PACKAGE}/tool-subagent-control/list-agents`],
    ['agent-team', '@deepseek-ai/dsh-experimental-agent-team', 'dsh-native-collab-agent-team', `${PACKAGE}/agent-team`],
    ['tool-agent-team', '@deepseek-ai/dsh-experimental-tool-agent-team', 'dsh-native-collab-tool-agent-team', `${PACKAGE}/tool-agent-team`],
];
// Spawn and fork are the same native module. Identity is the plugin id plus config.provider, never the module name.
const ORDINARY = [
    { role: 'spawn', nativeId: 'tool-subagent', derivedId: 'dsh-native-collab-tool-subagent', nativeName: '@deepseek-ai/dsh-tool-subagent', derivedName: `${PACKAGE}/tool-subagent`, provider: 'spawn' },
    { role: 'fork', nativeId: 'tool-subagent-fork', derivedId: 'dsh-native-collab-tool-subagent-fork', nativeName: '@deepseek-ai/dsh-tool-subagent', derivedName: `${PACKAGE}/tool-subagent/fork`, provider: 'fork' },
];
const PLACEHOLDERS = ['dsh-native-collab-tool-subagent', 'dsh-native-collab-tool-subagent-fork'];
const OWNED = new Map([
    ['dsh-native-collab-ui', PACKAGE],
    ...PAIRS.map(pair => [pair[2], pair[3]]),
    ['dsh-native-collab-tool-subagent', `${PACKAGE}/tool-subagent`],
    ['dsh-native-collab-tool-subagent-fork', `${PACKAGE}/tool-subagent/fork`],
]);
class Refusal extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
    }
}
function refuse(code) { throw new Refusal(code); }
function record(value) { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function checksum(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function codeOf(error) { return error instanceof Refusal ? error.code : 'configuration-unavailable'; }
function flatten(rows) {
    return rows.flatMap(row => [row, ...(row.group === true && Array.isArray(row.config) ? flatten(row.config) : [])]);
}
function rowsOf(value) {
    if (!Array.isArray(value) || !value.every(record))
        refuse('unsupported-entry-structure');
    return value;
}
function unique(rows, id, name) {
    const matches = rows.filter(row => row.id === id);
    if (matches.length !== 1 || matches[0].name !== name)
        refuse('missing-or-ambiguous-target');
    const row = matches[0];
    if (row.disabled !== undefined && typeof row.disabled !== 'boolean')
        refuse('dynamic-target');
    return row;
}
function parse(text) {
    const document = parseDocument(text, { customTags: [{ tag: JS_TAG, resolve: (value) => value }] });
    if (document.errors.length || !isSeq(document.contents))
        refuse('unsupported-patch-document');
    return document;
}
function rawPatches(document) {
    const clone = document.clone();
    visit(clone, { Scalar(_key, node) {
            if (node.tag !== JS_TAG)
                return;
            return clone.createNode({ __jsExpr: node.value });
        } });
    return rowsOf(clone.toJS({ maxAliasCount: 100 }));
}
function preserveExpressions(document) {
    visit(document, { Map(_key, node) {
            if (node.items.length !== 1 || typeof node.get('__jsExpr') !== 'string')
                return;
            const scalar = new Scalar(node.get('__jsExpr'));
            scalar.tag = JS_TAG;
            return scalar;
        } });
}
function deleteAt(document, index) {
    if (!isSeq(document.contents))
        refuse('unsupported-patch-document');
    const comment = document.contents.items[index]?.commentBefore;
    document.deleteIn([index]);
    const next = document.contents.items[index];
    if (comment && next)
        next.commentBefore = [comment, next.commentBefore].filter(Boolean).join('\n');
    else if (comment)
        document.comment = [document.comment, comment].filter(Boolean).join('\n');
}
function setDisabled(document, id, name, disabled) {
    if (!isSeq(document.contents))
        refuse('unsupported-patch-document');
    const index = document.contents.items.findLastIndex((node, index) => isMap(node)
        && document.getIn([index, 'id']) === id && !node.has('insert')
        && (!node.has('name') || document.getIn([index, 'name']) === name));
    if (index < 0)
        document.add(document.createNode({ id, name, disabled }));
    else
        document.setIn([index, 'disabled'], disabled);
}
function restoreNativeDisabled(document, id, name, disabled) {
    if (!isSeq(document.contents))
        refuse('unsupported-patch-document');
    for (let index = document.contents.items.length - 1; index >= 0; index -= 1) {
        const node = document.contents.items[index];
        if (!isMap(node) || node.has('insert') || document.getIn([index, 'id']) !== id)
            continue;
        if (node.has('name') && document.getIn([index, 'name']) !== name)
            refuse('unsupported-owned-override');
        const extra = node.items.some(item => {
            const key = item.key && 'value' in item.key ? item.key.value : undefined;
            return key !== 'id' && key !== 'name' && key !== 'disabled';
        });
        if (extra)
            document.setIn([index, 'disabled'], disabled);
        else
            deleteAt(document, index);
    }
}
function ordinaryOf(plugin) {
    if ((plugin.id !== undefined && typeof plugin.id !== 'string') || (plugin.name !== undefined && typeof plugin.name !== 'string'))
        return 'dynamic';
    const role = ORDINARY.find(item => plugin.id === item.nativeId || plugin.id === item.derivedId);
    if (!role) {
        const name = plugin.name;
        if (name === '@deepseek-ai/dsh-tool-subagent' || name === `${PACKAGE}/tool-subagent` || name === `${PACKAGE}/tool-subagent/fork`)
            return 'ambiguous';
        return 'unrelated';
    }
    if (plugin.disabled !== undefined && typeof plugin.disabled !== 'boolean')
        return 'dynamic';
    const provider = record(plugin.config) ? plugin.config.provider : undefined;
    if (provider !== role.provider)
        return 'ambiguous';
    if (plugin.name === role.nativeName)
        return { role, side: 'native' };
    if (plugin.name === role.derivedName)
        return { role, side: 'derived' };
    return 'ambiguous';
}
function presetRewrite(rows, action, targets) {
    const rewritten = new Map();
    for (const row of rows.filter(row => row.name === PRESET_NAME)) {
        if (typeof row.id !== 'string' || !record(row.config) || !Array.isArray(row.config.plugins))
            refuse('unsupported-preset-structure');
        const config = structuredClone(row.config);
        const plugins = flatten(rowsOf(config.plugins));
        const found = new Map();
        let relevant = false;
        for (const plugin of plugins) {
            const match = ordinaryOf(plugin);
            if (match === 'unrelated')
                continue;
            relevant = true;
            if (match === 'dynamic')
                refuse('dynamic-preset-target');
            if (match === 'ambiguous' || found.has(match.role.role))
                refuse('ambiguous-preset-target');
            found.set(match.role.role, { plugin, match });
        }
        if (!relevant)
            continue;
        if (found.size !== ORDINARY.length)
            refuse('incomplete-preset-targets');
        if (rows.filter(candidate => candidate.id === row.id).length !== 1)
            refuse('ambiguous-preset-target');
        for (const { plugin, match } of found.values()) {
            const nextName = action === 'enable' ? match.role.derivedName : match.role.nativeName;
            targets.push({ scope: `preset:${row.id}`, id: match.role.nativeId, moduleName: nextName, operation: 'replace', previousModule: String(plugin.name) });
            plugin.id = match.role.nativeId;
            plugin.name = nextName;
            if (plugin.disabled === true)
                plugin.disabled = false;
            if (!record(plugin.config))
                plugin.config = {};
            plugin.config.provider = match.role.provider;
        }
        rewritten.set(row.id, config);
    }
    if (rewritten.size === 0)
        refuse('preset-targets-unavailable');
    return rewritten;
}
function applyPreset(document, id, config) {
    if (!isSeq(document.contents))
        refuse('unsupported-patch-document');
    const name = '@deepseek-ai/dsh-agent-preset';
    const index = document.contents.items.findLastIndex((node, index) => isMap(node)
        && document.getIn([index, 'id']) === id && !node.has('insert')
        && (!node.has('name') || document.getIn([index, 'name']) === name));
    if (index < 0)
        document.add(document.createNode({ id, name, config }));
    else
        document.setIn([index, 'config'], document.createNode(config));
}
/** Profile-bound, one-shot consent plans; no client-selected paths, patches, modules, or config payloads. */
export class BootSwitchManager {
    ctx;
    plans = new Map();
    disposed = false;
    wrote = false;
    constructor(ctx) {
        this.ctx = ctx;
        ctx.on('dispose', () => { this.disposed = true; this.plans.clear(); });
    }
    profile() {
        if (this.disposed)
            refuse('component-disposed');
        const value = this.ctx.get('profileContext');
        if (!record(value) || typeof value.name !== 'string' || typeof value.dir !== 'string'
            || typeof value.patchPath !== 'string' || typeof value.home !== 'string'
            || typeof value.installAnchor !== 'string' || !Array.isArray(value.overlays))
            refuse('profile-unavailable');
        if (resolve(value.patchPath) !== resolve(value.dir, 'cordis.patch.yml'))
            refuse('unsupported-profile-path');
        return value;
    }
    async environment() {
        const profile = this.profile();
        // The public HMR queue does not suppress its patch-file watcher. Do not silently hot-replace running services.
        if (this.ctx.get('hmr') !== undefined)
            refuse('hmr-active');
        try {
            if ((await lstat(profile.patchPath)).isSymbolicLink())
                refuse('symlinked-profile-patch');
        }
        catch (error) {
            if (error.code !== 'ENOENT')
                throw error;
        }
        let before;
        try {
            before = await readFile(profile.patchPath, 'utf8');
        }
        catch (error) {
            if (error.code !== 'ENOENT')
                throw error;
            before = '[]\n';
        }
        parse(before);
        // loadProfileDirectory may prune retired bundles by rewriting package.json. Preview must never do that.
        const manifest = readProfileManifest('dsh', profile.dir);
        const bundleNames = manifest.dsh?.profile?.bundles;
        if (!Array.isArray(bundleNames) || !bundleNames.every(name => typeof name === 'string'))
            refuse('profile-bundles-unavailable');
        const exemptions = readProfileVersionExemptions(profile.dir);
        const loaded = { name: profile.name, dir: profile.dir, patchPath: profile.patchPath,
            patches: before === '[]\n' ? [] : loadOverlayPatches('dsh', profile.patchPath), layers: [], skippedBundles: [] };
        const bundleManifests = [];
        for (const packageName of bundleNames) {
            const packageDir = resolveBundleDir('dsh', packageName, profile.installAnchor, profile.dir);
            const bundleManifest = readProfileManifest('dsh', packageDir);
            const issue = evaluatePluginCompatibility(bundleManifest, exemptions);
            if (issue !== undefined && !issue.exempted)
                refuse('incompatible-profile-bundle');
            if (bundleManifest.dsh?.bundle === undefined)
                refuse('unsupported-profile-bundle');
            const patchPaths = bundlePatchPaths(packageDir, bundleManifest.dsh.bundle);
            const patches = patchPaths.flatMap(file => loadOverlayPatches('dsh', file));
            loaded.layers.push({ packageName, packageDir, patchPaths, patches });
            bundleManifests.push(bundleManifest);
        }
        const profileRows = flatten(rowsOf(composeEntries([...loaded.layers.map(layer => layer.patches), loaded.patches])));
        const effectiveRows = flatten(rowsOf(composeEntries([readProfilePatches('dsh', profile, loaded)])));
        const inputs = [before, loaded.patches, loaded.layers.map(layer => [layer.packageName, layer.patches]), bundleManifests, exemptions, profile.overlays];
        for (const file of [join(profile.dir, 'package.json'), join(profile.home, 'cordis.patch.yml')]) {
            try {
                inputs.push(await readFile(file, 'utf8'));
            }
            catch (error) {
                if (error.code !== 'ENOENT')
                    throw error;
                inputs.push(null);
            }
        }
        return { profile, before, loaded, profileRows, effectiveRows, fingerprint: checksum(inputs) };
    }
    rootSide(rows) {
        for (const id of PLACEHOLDERS) {
            const matches = rows.filter(row => row.id === id);
            if (matches.length !== 1 || matches[0].name !== OWNED.get(id) || matches[0].disabled !== true)
                return 'bad';
        }
        let derivedOn = true;
        let derivedOff = true;
        for (const pair of PAIRS) {
            const native = rows.filter(row => row.id === pair[0]);
            const derived = rows.filter(row => row.id === pair[2]);
            if (native.length !== 1 || native[0].name !== pair[1] || derived.length !== 1 || derived[0].name !== pair[3])
                return 'bad';
            if ((native[0].disabled !== undefined && typeof native[0].disabled !== 'boolean')
                || (derived[0].disabled !== undefined && typeof derived[0].disabled !== 'boolean'))
                return 'bad';
            if (native[0].disabled !== true && derived[0].disabled !== true)
                return 'bad';
            if (!(native[0].disabled === true && derived[0].disabled === false))
                derivedOn = false;
            if (derived[0].disabled !== true)
                derivedOff = false;
        }
        if (derivedOn === derivedOff)
            return 'bad';
        return derivedOn ? 'derived' : 'native';
    }
    presetSide(row) {
        if (!record(row.config) || !Array.isArray(row.config.plugins))
            return 'bad';
        let plugins;
        try {
            plugins = flatten(rowsOf(row.config.plugins));
        }
        catch {
            return 'bad';
        }
        const found = new Map();
        for (const plugin of plugins) {
            const match = ordinaryOf(plugin);
            if (match === 'unrelated')
                continue;
            if (match === 'dynamic' || match === 'ambiguous' || found.has(match.role.role) || plugin.disabled === true)
                return 'bad';
            found.set(match.role.role, match.side);
        }
        if (found.size === 0)
            return 'absent';
        if (found.size !== ORDINARY.length)
            return 'bad';
        const sides = [...found.values()];
        return sides.every(side => side === sides[0]) ? sides[0] : 'bad';
    }
    mode(rows) {
        const side = this.rootSide(rows);
        if (side === 'bad')
            return 'mixed';
        const presets = rows.filter(row => row.name === PRESET_NAME);
        if (presets.length === 0)
            return 'mixed';
        let relevant = 0;
        for (const preset of presets) {
            const presetSide = this.presetSide(preset);
            if (presetSide === 'bad')
                return 'mixed';
            if (presetSide === 'absent')
                continue;
            relevant += 1;
            if (presetSide !== side)
                return 'mixed';
        }
        return relevant === 0 ? 'mixed' : side === 'native' ? 'disabled' : 'enabled';
    }
    async status() {
        let profileName = null;
        try {
            profileName = this.profile().name;
            const environment = await this.environment();
            const configured = this.mode(environment.effectiveRows);
            let writeSupport = 'blocked';
            let error = null;
            try {
                await this.prepare('enable');
                await this.prepare('restore');
                writeSupport = 'available';
            }
            catch (error_) {
                error = codeOf(error_);
            }
            return { profileName, configured, writeSupport, pendingRestart: this.wrote ? 'required' : 'unknown', error };
        }
        catch (error) {
            return { profileName, configured: 'unknown', writeSupport: 'blocked', pendingRestart: this.wrote ? 'required' : 'unknown', error: codeOf(error) };
        }
    }
    async prepare(action) {
        const environment = await this.environment();
        const { profileRows, effectiveRows } = environment;
        const document = parse(environment.before);
        const targets = [];
        const bundled = flatten(rowsOf(composeEntries(environment.loaded.layers.map(layer => layer.patches))));
        for (const [nativeId, nativeName, derivedId, derivedName] of PAIRS) {
            unique(profileRows, nativeId, nativeName);
            unique(profileRows, derivedId, derivedName);
            unique(effectiveRows, nativeId, nativeName);
            unique(effectiveRows, derivedId, derivedName);
            targets.push({ scope: 'root', id: nativeId, moduleName: nativeName, operation: action === 'enable' ? 'disable' : 'enable', previousModule: null });
            targets.push({ scope: 'root', id: derivedId, moduleName: derivedName, operation: action === 'enable' ? 'enable' : 'disable', previousModule: null });
        }
        unique(profileRows, 'dsh-native-collab-ui', PACKAGE);
        const presetConfigs = presetRewrite(profileRows, action, targets);
        if (!isSeq(document.contents))
            refuse('unsupported-patch-document');
        if (action === 'restore') {
            // Leaving disabled overrides for removed bundle IDs would itself break a later composition.
            for (let index = document.contents.items.length - 1; index >= 0; index--) {
                const node = document.contents.items[index];
                const id = document.getIn([index, 'id']);
                if (typeof id !== 'string' || !OWNED.has(id))
                    continue;
                if (!isMap(node) || node.has('insert') || (node.has('name') && document.getIn([index, 'name']) !== OWNED.get(id)))
                    refuse('unsupported-owned-override');
                deleteAt(document, index);
            }
            targets.push({ scope: 'profile', id: 'dsh-native-collab-ui', moduleName: PACKAGE, operation: 'clear', previousModule: null });
        }
        if (action === 'enable') {
            for (const [nativeId, nativeName, derivedId, derivedName] of PAIRS) {
                setDisabled(document, nativeId, nativeName, true);
                setDisabled(document, derivedId, derivedName, false);
            }
        }
        else {
            for (const [nativeId, nativeName] of PAIRS) {
                // Human-approved fixed native state: enable all five targets, including
                // control/list rows disabled by the base bundle. This is not history restore.
                restoreNativeDisabled(document, nativeId, nativeName, false);
                if (unique(bundled, nativeId, nativeName).disabled === true)
                    setDisabled(document, nativeId, nativeName, false);
            }
        }
        // Ordinary tools stay preset-scoped; never activate the two root placeholders.
        for (const id of PLACEHOLDERS) {
            const name = OWNED.get(id);
            const row = unique(profileRows, id, name);
            if (action === 'enable' && row.disabled !== true)
                setDisabled(document, id, name, true);
            targets.push({ scope: 'root', id, moduleName: name, operation: 'disable', previousModule: null });
        }
        for (const [id, config] of presetConfigs)
            applyPreset(document, id, config);
        preserveExpressions(document);
        const next = String(document);
        const candidate = { ...environment.loaded, patches: rawPatches(document) };
        const expected = flatten(rowsOf(composeEntries([...candidate.layers.map(layer => layer.patches), candidate.patches])));
        const effective = flatten(rowsOf(composeEntries([readProfilePatches('dsh', environment.profile, candidate)])));
        const controlled = new Set([...PAIRS.flatMap(pair => [pair[0], pair[2]]), ...presetConfigs.keys(), 'dsh-native-collab-tool-subagent', 'dsh-native-collab-tool-subagent-fork']);
        for (const id of controlled) {
            const own = expected.filter(row => row.id === id);
            const actual = effective.filter(row => row.id === id);
            if (own.length !== 1 || actual.length !== 1 || !isDeepStrictEqual(own[0], actual[0]))
                refuse('higher-priority-override');
        }
        if (this.mode(effective) !== (action === 'enable' ? 'enabled' : 'disabled'))
            refuse('target-state-unverified');
        if (action === 'restore') {
            if (next.includes(PACKAGE))
                refuse('remaining-derived-reference');
            // An external enable overlay must be removed by its owner, even if another layer currently masks it.
            const highLayers = readProfilePatches('dsh', environment.profile, { ...environment.loaded, layers: [], patches: [] });
            if (JSON.stringify(highLayers).includes(PACKAGE) || JSON.stringify(highLayers).includes('dsh-native-collab-'))
                refuse('external-derived-reference');
        }
        return { environment, next, plan: { action, accepted: false, planId: null, targets, pendingRestart: 'required', error: null,
                warnings: ['fixed-state-not-history-restore', 'stop-agents-and-restart', 'remove-only-after-off-and-verification', ...(action === 'restore' ? ['native-features-will-be-enabled', 'own-profile-preferences-will-be-cleared'] : [])] } };
    }
    async plan(action) {
        if (action !== 'enable' && action !== 'restore')
            throw new TypeError('Invalid boot switch action');
        try {
            const prepared = await this.prepare(action);
            for (const [id, entry] of this.plans)
                if (entry.expires <= Date.now())
                    this.plans.delete(id);
            if (this.plans.size >= MAX_PLANS)
                this.plans.delete(this.plans.keys().next().value);
            const planId = randomUUID();
            this.plans.set(planId, { action, fingerprint: prepared.environment.fingerprint, expires: Date.now() + TTL_MS });
            return { ...prepared.plan, planId };
        }
        catch (error) {
            const code = codeOf(error);
            const warnings = code === 'higher-priority-override' || code === 'external-derived-reference' ? ['remove-external-overlay'] : [];
            return { action, accepted: false, planId: null, targets: [], pendingRestart: 'required', error: code, warnings };
        }
    }
    async apply(planId) {
        const entry = this.plans.get(planId);
        this.plans.delete(planId);
        const action = entry?.action ?? 'restore';
        if (entry === undefined || entry.expires <= Date.now())
            return { action, accepted: false, pendingRestart: 'required', error: 'plan-expired-or-used', configured: 'unknown' };
        try {
            const profile = this.profile();
            return await withFileLock(join(profile.dir, 'package.json'), async () => {
                const prepared = await this.prepare(action);
                if (prepared.environment.fingerprint !== entry.fingerprint)
                    refuse('configuration-changed-review-again');
                if (this.disposed)
                    refuse('component-disposed');
                await writeFileAtomic(profile.patchPath, prepared.next, { mode: 0o600 });
                this.wrote = true;
                return { action, accepted: true, pendingRestart: 'required', error: null, configured: action === 'enable' ? 'enabled' : 'disabled' };
            });
        }
        catch (error) {
            return { action, accepted: false, pendingRestart: 'required', error: codeOf(error), configured: 'unknown' };
        }
    }
}
