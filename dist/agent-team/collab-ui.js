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
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
function invalidBootInput(method, field) {
    // Use the public cross-realm Remote failure, not a generic TypeError that the
    // Gateway would turn into gateway/internal. This is owner-side validation,
    // independent of the browser's strict descriptor and generator availability.
    throw new RemoteError('collab-ui/input-invalid', `Invalid ${field}`, { endpoint: `collabUi/${method}`, field });
}
const PACKAGE = '@sieuno/dsh-native-collab';
const ROWS = [
    { id: 'dsh-native-collab-subagent', moduleName: '@sieuno/dsh-native-collab/subagent' },
    { id: 'dsh-native-collab-tool-subagent-control', moduleName: '@sieuno/dsh-native-collab/tool-subagent-control' },
    { id: 'dsh-native-collab-tool-subagent-list-agents', moduleName: '@sieuno/dsh-native-collab/tool-subagent-control/list-agents' },
    { id: 'dsh-native-collab-agent-team', moduleName: '@sieuno/dsh-native-collab/agent-team' },
    { id: 'dsh-native-collab-tool-agent-team', moduleName: '@sieuno/dsh-native-collab/tool-agent-team' },
    { id: 'dsh-native-collab-tool-subagent', moduleName: '@sieuno/dsh-native-collab/tool-subagent' },
    { id: 'dsh-native-collab-tool-subagent-fork', moduleName: '@sieuno/dsh-native-collab/tool-subagent/fork' },
];
const ENABLE_LINKED = new Set([
    'dsh-native-collab-subagent',
    'dsh-native-collab-tool-subagent-control',
    'dsh-native-collab-tool-subagent-list-agents',
    'dsh-native-collab-agent-team',
    'dsh-native-collab-tool-agent-team',
]);
const COLLAB_UI_BRAND = Symbol.for('@sieuno/dsh-native-collab.collabUi');
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
    let _bootStatus_decorators;
    let _bootPlan_decorators;
    let _bootApply_decorators;
    let _preview_decorators;
    return class CollabUiService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _status_decorators = [Remote];
            _bootStatus_decorators = [Remote];
            _bootPlan_decorators = [Remote];
            _bootApply_decorators = [Remote];
            _preview_decorators = [Remote];
            __esDecorate(this, null, _status_decorators, { kind: "method", name: "status", static: false, private: false, access: { has: obj => "status" in obj, get: obj => obj.status }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _bootStatus_decorators, { kind: "method", name: "bootStatus", static: false, private: false, access: { has: obj => "bootStatus" in obj, get: obj => obj.bootStatus }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _bootPlan_decorators, { kind: "method", name: "bootPlan", static: false, private: false, access: { has: obj => "bootPlan" in obj, get: obj => obj.bootPlan }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _bootApply_decorators, { kind: "method", name: "bootApply", static: false, private: false, access: { has: obj => "bootApply" in obj, get: obj => obj.bootApply }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _preview_decorators, { kind: "method", name: "preview", static: false, private: false, access: { has: obj => "preview" in obj, get: obj => obj.preview }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        assembly = __runInitializers(this, _instanceExtraInitializers);
        bootComponent;
        constructor(ctx, config) {
            super(ctx, 'collabUi');
            Object.defineProperty(this, COLLAB_UI_BRAND, { value: true });
            this.assembly = captureAssembly(config);
            // Capture the owning plugin Context, never an ephemeral gateway invocation Context.
            let boot;
            this.bootComponent = () => boot ??= import('./boot-switch.js').then(module => new module.BootSwitchManager(ctx));
            // ConfigEditor calls this waterfall before writing YAML. Schemastery treats
            // optional null as absent, so enforce the numeric write contract here, scoped
            // to this exact plugin fiber. Clearing uses the official op:unset path.
            ctx.on('internal/config', function (_raw, next) {
                const raw = next();
                // Cordis may expose a reflected Fiber proxy to listeners; uid identifies
                // the exact lifetime within this Context tree without proxy identity drift.
                if (this.uid !== ctx.fiber.uid)
                    return raw;
                if (typeof raw === 'object' && raw !== null && 'teamRequestLimit' in raw) {
                    readRequestLimit(raw.teamRequestLimit);
                }
                return raw;
            });
        }
        /** Startup snapshot frozen by this construction. Not a live subscription. */
        assemblySnapshot() {
            return this.assembly ?? null;
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
                const matches = inventory?.filter(row => row.moduleName === target.moduleName) ?? [];
                const row = matches.length === 1 ? matches[0] : undefined;
                return {
                    ...target,
                    current: row === undefined ? 'unknown' : row.enabled ? 'enabled' : 'disabled',
                    sourceLayer: 'unknown',
                    runtimePhase: row?.fiberPhase ?? null,
                };
            });
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
            };
        }
        /** Explicit next-start state; does not change an active Agent or service assembly. */
        async bootStatus() { return (await this.bootComponent()).status(); }
        /** Read-only, concrete target list plus a short-lived, one-shot confirmation token. */
        async bootPlan(action) {
            if (action !== 'enable' && action !== 'restore')
                invalidBootInput('bootPlan', 'action');
            return (await this.bootComponent()).plan(action);
        }
        /** The only startup-cover mutation endpoint: requires an issued, unchanged plan. */
        async bootApply(planId) {
            if (typeof planId !== 'string' || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(planId))
                invalidBootInput('bootApply', 'planId');
            return (await this.bootComponent()).apply(planId);
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
