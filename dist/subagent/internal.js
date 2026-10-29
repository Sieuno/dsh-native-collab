/**
 * Continuation integration markers and host adapters outside the public
 * Service Definition and model-facing Agent messaging contract.
 * @module @deepseek-ai/dsh-subagent/internal
 */
export { projectionDisposer, readProjectionState } from "./projection-compat.js";
/** Process-stable identity carried only by the standard adjacent-Agent messaging tool. */
export const adjacentAgentSendMessageTool = Symbol.for('dsh.subagent.adjacentAgentSendMessageTool');
/**
 * Mark the standard adjacent-Agent messaging tool without changing its model-visible schema.
 * @param definition - the standard `send_message` definition.
 * @returns the same definition with its internal identity installed.
 */
export function markAdjacentAgentSendMessageTool(definition) {
    Object.defineProperty(definition, adjacentAgentSendMessageTool, { value: true });
    return definition;
}
/**
 * Test whether one visible definition is the standard adjacent-Agent messaging tool.
 * @param definition - the scope-resolved `send_message` candidate.
 * @returns whether the definition carries the internal standard-tool identity.
 */
export function isAdjacentAgentSendMessageTool(definition) {
    return definition !== undefined
        && definition[adjacentAgentSendMessageTool] === true;
}
/**
 * Process-stable symbol-keyed host delivery shared by the bundled runtime
 * entry and this unbundled internal subpath.
 * @internal
 */
export const deliverSubagentPrompt = Symbol.for('dsh.subagent.deliverPrompt');
/**
 * Queue one host-protocol message without exposing another Service operation.
 * @param runtime - subagent runtime owning continuation residency.
 * @param parent - exact live direct parent authorizing delivery.
 * @param childId - durable direct-child session id.
 * @param content - host-authored content to deliver.
 * @param source - durable host-protocol source descriptor.
 * @param signal - caller cancellation before inbox acceptance.
 * @returns the accepted message's inbox id.
 */
export function queueHostSubagentPrompt(runtime, parent, childId, content, source, signal) {
    return runtime[deliverSubagentPrompt](parent, childId, content, source, signal, 'queue');
}
/**
 * Steer one host-protocol message without exposing another Service operation.
 * @param runtime - subagent runtime owning continuation residency.
 * @param parent - exact live direct parent authorizing delivery.
 * @param childId - durable direct-child session id.
 * @param content - host-authored content to deliver.
 * @param source - durable host-protocol source descriptor.
 * @param signal - caller cancellation before inbox acceptance.
 * @returns the accepted message's inbox id.
 */
export function steerHostSubagentPrompt(runtime, parent, childId, content, source, signal) {
    return runtime[deliverSubagentPrompt](parent, childId, content, source, signal, 'steer');
}
/** Process-stable internal identity-transition operation; absent from the Service schema. */
export const withIdleContinuableInternal = Symbol.for('dsh.subagent.withIdleContinuable');
/** Process-stable fail-closed identity-transition assertion for Team callers. */
export const assertNoIdentityTransitionInternal = Symbol.for('dsh.subagent.assertNoIdentityTransition');
/** Capture a resolved route before any asynchronous work can stale its identity. */
export const captureIdentityTransitionGenerationInternal = Symbol.for('dsh.subagent.captureIdentityTransitionGeneration');
/** Recheck the captured route at its final admission boundary. */
export const assertIdentityTransitionGenerationInternal = Symbol.for('dsh.subagent.assertIdentityTransitionGeneration');
/** Block ordinary delivery while a durable identity transition needs recovery. */
export const setIdentityRecoveryInternal = Symbol.for('dsh.subagent.setIdentityRecovery');
/**
 * Hold an idle direct local continuable child through one identity transition.
 * The callback's signal composes the parent teardown and Agent maintenance lease.
 */
export function withIdleContinuable(runtime, parent, childId, operation) {
    const candidate = runtime;
    if (candidate === undefined || typeof candidate[withIdleContinuableInternal] !== 'function') {
        return Promise.reject(new Error('subagent runtime does not support idle identity transitions'));
    }
    return candidate[withIdleContinuableInternal](parent, childId, operation);
}
/** Fail closed when the runtime lacks the identity-transition guard. */
export function assertNoIdentityTransition(runtime, childId) {
    const candidate = runtime;
    const assert = candidate?.[assertNoIdentityTransitionInternal];
    if (typeof assert !== 'function')
        throw new Error('subagent runtime does not expose identity-transition admission');
    assert.call(candidate, childId);
}
/** Capture a Team target route generation immediately after resolving its identity. */
export function captureIdentityGeneration(runtime, childId) {
    const candidate = runtime;
    const capture = candidate?.[captureIdentityTransitionGenerationInternal];
    if (typeof capture !== 'function')
        throw new Error('subagent runtime does not expose identity-transition admission');
    return capture.call(candidate, childId);
}
/** Reject a previously resolved route after any transition began or completed. */
export function assertIdentityGeneration(runtime, childId, generation) {
    const candidate = runtime;
    const assert = candidate?.[assertIdentityTransitionGenerationInternal];
    if (typeof assert !== 'function')
        throw new Error('subagent runtime does not expose identity-transition admission');
    assert.call(candidate, childId, generation);
}
/** Block or repair one target after uncertain durable identity reconciliation. */
export function setIdentityRecovery(runtime, childId, blocked) {
    const candidate = runtime;
    const set = candidate?.[setIdentityRecoveryInternal];
    if (typeof set !== 'function')
        throw new Error('subagent runtime does not expose identity recovery admission');
    set.call(candidate, childId, blocked);
}
