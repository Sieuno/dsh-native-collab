/**
 * Context-owned startup snapshot for the collaboration control service.
 * Consumers freeze the value at their own construction or apply.
 * Most overlay values are next-assembly preferences; the two parent-message
 * sub-options stay live because the loader commits volatile-only changes into
 * the running references.
 * There is no process-global copy. A missing control service is not an unset overlay.
 */
/** Instance brand. It identifies the service; it is not a process-wide data slot. */
export const COLLAB_UI_BRAND = Symbol.for('@sieuno/dsh-native-collab.collabUi');
const MISSING = 'collabUi assembly snapshot is required before collaboration consumers start';
function flag(value) {
    return typeof value === 'boolean' ? value : undefined;
}
export function isAssemblySnapshot(value) {
    if (typeof value !== 'object' || value === null || !('present' in value) || value.present !== true)
        return false;
    const row = value;
    return flag(row.modelEnhancement) === row.modelEnhancement
        && flag(row.communicationEnhancement) === row.communicationEnhancement
        && flag(row.nativeModelSelectionCompatibility) === row.nativeModelSelectionCompatibility
        && (row.modelSource === undefined || row.modelSource === 'conversation' || row.modelSource === 'settings' || row.modelSource === 'all')
        && flag(row.runningChildGuidance) === row.runningChildGuidance
        && flag(row.completedChildContinuation) === row.completedChildContinuation
        && (row.teamRequestLimit === undefined || (Number.isSafeInteger(row.teamRequestLimit) && row.teamRequestLimit > 0));
}
function brandedService(ctx) {
    const service = ctx && typeof ctx.get === 'function' ? ctx.get('collabUi') : undefined;
    if (!service || typeof service !== 'object')
        return undefined;
    if (Reflect.get(service, COLLAB_UI_BRAND) !== true)
        return undefined;
    return service;
}
/**
 * Read the live parent-message sub-options from this Context's branded service.
 * `undefined` means the service is absent, illegal, or exposes no live reader.
 */
export function readChildMessageFlags(ctx) {
    const service = brandedService(ctx);
    if (!service || typeof service.childMessageFlags !== 'function')
        return undefined;
    const value = service.childMessageFlags.call(service);
    if (typeof value !== 'object' || value === null)
        return undefined;
    const row = value;
    const running = flag(row.runningChildGuidance);
    const continuation = flag(row.completedChildContinuation);
    if (row.runningChildGuidance !== undefined && running === undefined)
        return undefined;
    if (row.completedChildContinuation !== undefined && continuation === undefined)
        return undefined;
    return { runningChildGuidance: running, completedChildContinuation: continuation };
}
/**
 * Read this Context's branded control service only.
 * `undefined` means the service is absent or illegal. It is not an unset overlay.
 */
export function readAssemblySnapshot(ctx) {
    const service = brandedService(ctx);
    if (!service || typeof service.assemblySnapshot !== 'function')
        return undefined;
    const value = service.assemblySnapshot.call(service);
    return isAssemblySnapshot(value) ? value : undefined;
}
/** Read live native limits without freezing a second settings copy in this runtime. */
export function readCurrentSubagentLimits(ctx) {
    const service = brandedService(ctx);
    if (typeof service?.currentSubagentLimits !== 'function')
        return undefined;
    const value = service.currentSubagentLimits();
    if (value === undefined)
        return undefined;
    if (typeof value !== 'object' || value === null)
        throw new Error('native-limits-invalid');
    const depth = Reflect.get(value, 'maxDepth');
    const capacity = Reflect.get(value, 'maxActiveSubagents');
    if (!Number.isSafeInteger(depth) || depth < 0 || Object.is(depth, -0)
        || !Number.isSafeInteger(capacity) || capacity < 1)
        throw new Error('native-limits-invalid');
    return { maxDepth: depth, maxActiveSubagents: capacity };
}
/** Fail before `super()` when this Context has no legal captured snapshot. */
export function readCurrentModelSource(ctx) {
    const service = brandedService(ctx);
    if (!service || typeof service.currentModelSource !== 'function')
        return undefined;
    const value = service.currentModelSource.call(service);
    return value === 'conversation' || value === 'settings' || value === 'all' ? value : undefined;
}
export function requireAssemblySnapshot(ctx) {
    const snapshot = readAssemblySnapshot(ctx);
    if (!snapshot)
        throw new Error(MISSING);
    return snapshot;
}
function requireSnapshot(snapshot, name) {
    if (!isAssemblySnapshot(snapshot)) {
        throw new Error(`${name} requires a captured assembly snapshot; a missing control service is not an unset overlay`);
    }
    return snapshot;
}
/**
 * Team model and communication flags for one assembly.
 * Unset communication follows the row model flag because Team has no separate delivery row.
 * The snapshot argument must already be a captured object.
 */
export function resolveTeamFlags(rowEnhanced, snapshot) {
    const captured = requireSnapshot(snapshot, 'resolveTeamFlags');
    const row = rowEnhanced !== false;
    return {
        selectionEnhanced: captured.modelEnhancement ?? row,
        communicationEnhanced: captured.communicationEnhancement ?? row,
    };
}
/** Explicit delivery admission. Unset overlay keeps the row delivery flag. */
export function resolveCommunicationAdmission(rowDelivery, snapshot) {
    const captured = requireSnapshot(snapshot, 'resolveCommunicationAdmission');
    if (captured.communicationEnhancement !== undefined)
        return captured.communicationEnhancement;
    return rowDelivery !== false;
}
/**
 * Ordinary subagent selection kind.
 * Fork stays none. Model off returns native, not none.
 * Model on uses the overlay compat flag, then the tool-row flag.
 * An unset model overlay ignores the overlay compat flag.
 */
export function resolveOrdinarySelectionKind(ownsDiscovery, rowNativeCompat, snapshot) {
    const captured = requireSnapshot(snapshot, 'resolveOrdinarySelectionKind');
    if (ownsDiscovery === false)
        return 'none';
    if (captured.modelEnhancement === false)
        return 'native';
    const compat = captured.modelEnhancement === true
        ? captured.nativeModelSelectionCompatibility ?? rowNativeCompat
        : rowNativeCompat;
    return compat === true ? 'native' : 'live';
}
