/**
 * Model and host delivery selection for the derived subagent runtime.
 *
 * Queue and steer already exist on the official admission chain. This module
 * only decides which of those two branches a caller asked for, and rejects
 * values that are not one of them.
 *
 * @module @dsh-native-collab/subagent/delivery
 */
import { SubagentError } from "./error.js";
/**
 * Process-stable brand for the derived host delivery entry.
 * Distinct from `Symbol.for('dsh.subagent.deliverPrompt')`.
 */
export const collabHostDelivery = Symbol.for('dsh.native-collab.subagent.hostDelivery');
/**
 * Resolve a model-facing delivery value.
 * Omission is steer. Any other value is rejected.
 * @param value - omitted, `queue`, `steer`, or an illegal model/JSON value.
 * @returns the delivery the admission chain must use.
 * @throws {SubagentError} `INVALID_DELIVERY` when the value is present and not `queue` or `steer`.
 */
export function resolveModelDelivery(value) {
    if (value === undefined)
        return 'steer';
    if (value === 'queue' || value === 'steer')
        return value;
    throw new SubagentError('delivery must be "queue" or "steer"', 'INVALID_DELIVERY');
}
/**
 * Reject a present model delivery when selection is disabled.
 * Omission is not an enhancement parameter and is left for the steer default.
 * @param enabled - current `deliverySelection` flag.
 * @param value - the raw `delivery` field, including absence.
 * @throws {SubagentError} `DELIVERY_DISABLED` when selection is off and `delivery` is present.
 */
export function assertModelDeliveryEnabled(enabled, value) {
    if (!enabled && value !== undefined) {
        throw new SubagentError('delivery selection is disabled; the delivery parameter was rejected', 'DELIVERY_DISABLED');
    }
}
/**
 * Reject an illegal or disabled host delivery before the official prompt adapter runs.
 * Steer remains available when selection is off because that is the original host default.
 * @param delivery - caller-supplied delivery, validated at runtime because host callers may forward JSON.
 * @param enabled - current `deliverySelection` flag.
 * @throws {SubagentError} `INVALID_DELIVERY` or `DELIVERY_DISABLED`.
 */
export function assertHostDelivery(delivery, enabled) {
    if (delivery !== 'queue' && delivery !== 'steer') {
        throw new SubagentError('delivery must be "queue" or "steer"', 'INVALID_DELIVERY');
    }
    if (!enabled && delivery !== 'steer') {
        throw new SubagentError('delivery selection is disabled; queue was rejected', 'DELIVERY_DISABLED');
    }
}
/**
 * Whether `value` is the derived runtime that implements {@link CollabHostDelivery}.
 * The brand is the derived symbol, not a method-name check alone.
 * A match also requires `modelDeliverySelection` to be a boolean.
 * @param value - typically `ctx.get('subagents')`.
 * @returns whether the derived host delivery methods can be called.
 */
export function isCollabHostDelivery(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    if (!(collabHostDelivery in value))
        return false;
    return typeof Reflect.get(value, 'sendMessage') === 'function'
        && typeof Reflect.get(value, 'deliverHostPrompt') === 'function'
        && typeof Reflect.get(value, 'modelDeliverySelection') === 'boolean';
}
/**
 * Read the derived runtime from a Cordis context or fail loud.
 * @param ctx - context whose `subagents` service must be this derived runtime.
 * @returns the branded runtime.
 * @throws {SubagentError} `COLLAB_RUNTIME_UNAVAILABLE` when the mounted service is not this runtime.
 */
export function requireCollabSubagents(ctx) {
    const runtime = ctx.get('subagents');
    if (!isCollabHostDelivery(runtime)) {
        throw new SubagentError('derived collab subagent runtime is not registered', 'COLLAB_RUNTIME_UNAVAILABLE');
    }
    return runtime;
}
