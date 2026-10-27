var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { ASSEMBLY_ROLES, classifyAssembly } from "./assembly-layout.js";
import { ManagedRuntime } from "./managed-runtime.js";
import { installPresetAdapter } from "./preset-adapter.js";
const ROWS = ASSEMBLY_ROLES;
const ENABLE_LINKED = new Set(ASSEMBLY_ROLES.filter(row => row.placement === 'runtime').map(row => row.legacyId));
const COLLAB_UI_BRAND = Symbol.for('@sieuno/dsh-native-collab.collabUi');
function readModelSource(value) {
    const current = typeof value === 'object' && value !== null && 'get' in value && typeof value.get === 'function'
        ? value.get() : value;
    return current === 'conversation' || current === 'settings' || current === 'all' ? current : undefined;
}
function readOverlayFlag(value) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'object' && value !== null && 'get' in value && typeof value.get === 'function') {
        const current = value.get();
        return typeof current === 'boolean' ? current : undefined;
    }
    return undefined;
}
function readRequestLimit(value, allowLegacyNull = false) {
    const current = typeof value === 'object' && value !== null && 'get' in value && typeof value.get === 'function'
        ? value.get() : value;
    // RC6 could persist null through Schemastery's optional number schema.
    // Recover that existing config as unset, without rewriting the profile or ledger.
    if (current === undefined || allowLegacyNull && current === null)
        return undefined;
    if (typeof current !== 'number' || !Number.isSafeInteger(current) || current < 1) {
        throw new Error('teamRequestLimit must be a positive safe integer');
    }
    return current;
}
function captureAssembly(config) {
    return Object.freeze({
        present: true,
        modelEnhancement: readOverlayFlag(config?.modelEnhancement),
        communicationEnhancement: readOverlayFlag(config?.communicationEnhancement),
        nativeModelSelectionCompatibility: readOverlayFlag(config?.nativeModelSelectionCompatibility),
        modelSource: readModelSource(config?.modelSource),
        runningChildGuidance: readOverlayFlag(config?.runningChildGuidance),
        completedChildContinuation: readOverlayFlag(config?.completedChildContinuation),
        teamRequestLimit: readRequestLimit(config?.teamRequestLimit, true),
    });
}
function service(ctx, name) {
    try {
        return ctx.get(name);
    }
    catch {
        return undefined;
    }
}
function profileNameOf(value) {
    if (typeof value !== 'object' || value === null || !('name' in value))
        return null;
    return typeof value.name === 'string' && value.name.length > 0 ? value.name : null;
}
function inventoryRows(value) {
    if (!Array.isArray(value))
        return undefined;
    const rows = [];
    for (const item of value) {
        if (typeof item !== 'object' || item === null || !('moduleName' in item) || typeof item.moduleName !== 'string'
            || !('enabled' in item) || typeof item.enabled !== 'boolean')
            return undefined;
        rows.push({ moduleName: item.moduleName, enabled: item.enabled,
            fiberPhase: 'fiberPhase' in item && (typeof item.fiberPhase === 'string' || item.fiberPhase === null) ? item.fiberPhase : null });
    }
    return rows;
}
/** No client-selected paths, patch payloads, or module names are accepted by this service. */
let CollabUiService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _status_decorators;
    let _preview_decorators;
    return class CollabUiService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _status_decorators = [Remote];
            _preview_decorators = [Remote];
            __esDecorate(this, null, _status_decorators, { kind: "method", name: "status", static: false, private: false, access: { has: obj => "status" in obj, get: obj => obj.status }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _preview_decorators, { kind: "method", name: "preview", static: false, private: false, access: { has: obj => "preview" in obj, get: obj => obj.preview }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        // Root entries are imported concurrently. Do not inspect an inventory service
        // before its provider has activated and fail permanently on a startup race.
        static inject = ['pluginManager', 'loader'];
        assembly = __runInitializers(this, _instanceExtraInitializers);
        managedRuntime;
        currentModelSourceReader;
        liveChildMessageFlags;
        constructor(ctx, config) {
            super(ctx, 'collabUi');
            Object.defineProperty(this, COLLAB_UI_BRAND, { value: true });
            this.assembly = captureAssembly(config);
            this.currentModelSourceReader = () => {
                const explicit = readModelSource(config?.modelSource);
                if (explicit !== undefined)
                    return explicit;
                return readOverlayFlag(config?.nativeModelSelectionCompatibility) === false ? 'settings' : 'conversation';
            };
            // Volatile-only settings are committed into the running references by the
            // loader, so the two parent-message sub-options are read per admission
            // instead of being frozen with the rest of the assembly snapshot.
            this.liveChildMessageFlags = () => ({
                runningChildGuidance: readOverlayFlag(config?.runningChildGuidance),
                completedChildContinuation: readOverlayFlag(config?.completedChildContinuation),
            });
            // Runtime ownership belongs to this installed entry, not a hidden preference.
            // Older saved runtimeMode:native must not keep every enhancement inert.
            installPresetAdapter(ctx, () => ({ model: this.assembly?.modelEnhancement === true, communication: this.assembly?.communicationEnhancement === true }));
            this.managedRuntime = new ManagedRuntime(ctx, 'managed');
            ctx.effect(() => () => this.managedRuntime.dispose(), 'collabUi.managedRuntime()');
            // ConfigEditor calls this waterfall before writing YAML. Schemastery treats
            // optional null as absent, so enforce the numeric write contract here, scoped
            // to this exact plugin fiber. Clearing uses the official op:unset path.
            ctx.on('internal/config', function (_raw, next) {
                const raw = next();
                // Cordis may expose a reflected Fiber proxy to listeners; uid identifies
                // the exact lifetime within this Context tree without proxy identity drift.
                if (this.uid !== ctx.fiber.uid)
                    return raw;
                if (typeof raw === 'object' && raw !== null) {
                    // runtimeMode is a deprecated compatibility field, never a separate
                    // activation switch or a requirement for saving ordinary preferences.
                    if ('teamRequestLimit' in raw)
                        readRequestLimit(raw.teamRequestLimit);
                }
                return raw;
            });
        }
        /** Startup snapshot frozen by this construction. Not a live subscription. */
        assemblySnapshot() {
            return this.assembly ?? null;
        }
        /** Latest volatile source choice; unlike assembly flags this is read per selection operation. */
        currentModelSource() {
            return this.currentModelSourceReader();
        }
        /** Live parent-message sub-options; volatile fields change without a restart. */
        childMessageFlags() {
            return this.liveChildMessageFlags();
        }
        async status() {
            const profile = service(this.ctx, 'profileContext');
            const profileName = profileNameOf(profile);
            const manager = service(this.ctx, 'pluginManager');
            let inventory;
            let error = profileName === null ? 'profile-unavailable' : null;
            try {
                const listPlugins = manager?.listPlugins;
                if (typeof listPlugins !== 'function')
                    throw new Error('plugin inventory unavailable');
                inventory = inventoryRows(await listPlugins.call(manager));
                if (inventory === undefined)
                    throw new Error('invalid plugin inventory');
            }
            catch {
                error = 'inventory-unavailable';
            }
            const rows = ROWS.map(target => {
                const matches = inventory?.filter(row => row.moduleName === target.moduleName || row.moduleName === target.nativeModuleName) ?? [];
                const row = matches.length === 1 ? matches[0] : undefined;
                return {
                    id: target.legacyId,
                    moduleName: target.moduleName,
                    current: row === undefined ? 'unknown' : row.enabled ? 'enabled' : 'disabled',
                    sourceLayer: 'unknown',
                    runtimePhase: row?.fiberPhase ?? null,
                };
            });
            const nativeEnabled = ROWS.filter(target => target.placement === 'runtime').filter(target => inventory?.some(row => row.moduleName === target.nativeModuleName && row.enabled)).length;
            const managedEnabled = ROWS.filter(target => inventory?.some(row => row.moduleName === target.moduleName && row.enabled)).length;
            const runtime = this.managedRuntime.status();
            const inventoryKnown = inventory !== undefined && ROWS.filter(target => target.placement === 'runtime')
                .every(target => inventory.filter(row => row.moduleName === target.nativeModuleName).length === 1);
            const diagnosis = classifyAssembly(runtime.mode, nativeEnabled, managedEnabled, inventoryKnown, runtime.services.map(service => service.phase));
            return {
                profileName,
                hmrEnabled: service(this.ctx, 'hmr') !== undefined,
                rows,
                desired: 'unchanged',
                pendingRestart: 'unknown',
                writeSupport: 'unsupported',
                operationError: 'transaction-unavailable',
                error,
                assembly: this.assembly ?? null,
                runtime,
                diagnosis,
            };
        }
        /** Read-only preview; the profile is never written or snapshotted. */
        async preview(action) {
            const status = await this.status();
            const echoed = typeof action === 'string' && action.length > 0 ? action : 'omitted';
            const validAction = action === 'enable' || action === 'restore';
            const reasons = [
                'transaction-unavailable',
                'source-layer-unknown',
                'preset-structure-unverified',
                'dynamic-config-unverified',
                'higher-priority-overrides-unverified',
                'next-start-not-proven',
            ];
            if (!validAction)
                reasons.unshift('invalid-action');
            if (status.hmrEnabled === true)
                reasons.push('hmr-active');
            if (status.error !== null)
                reasons.push(status.error);
            return {
                action: echoed,
                accepted: false,
                current: status.rows,
                desired: status.rows.map(row => ({ id: row.id, state: validAction && action === 'enable' && ENABLE_LINKED.has(row.id) ? 'enabled' : 'unknown' })),
                pendingRestart: 'unknown',
                error: 'transaction-unavailable',
                reasons,
            };
        }
    };
})();
export { CollabUiService };
export default CollabUiService;
