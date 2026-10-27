export const POLICY_KEY = 'subagentModelSelectionPolicy';
export const POLICY_EVENT = 'subagent/model-selection-policy';
export const POLICY_STATE_VERSION = 1;
export function initPolicy() {
    return null;
}
/** First write wins. Later policy events do not replace a recorded snapshot. */
export function applyPolicy(policy, event) {
    if (policy !== null || event.type !== POLICY_EVENT)
        return policy;
    const data = event.data;
    const allowedModels = data !== null && typeof data === 'object' && 'allowedModels' in data
        ? data.allowedModels
        : undefined;
    if (!Array.isArray(allowedModels) || allowedModels.length === 0) {
        throw new Error('subagent/model-selection-policy requires at least one route');
    }
    return allowedModels.map(route => {
        if (route === null || typeof route !== 'object' || typeof route.provider !== 'string' || typeof route.model !== 'string' || route.provider.length === 0 || route.model.length === 0) {
            throw new Error('subagent/model-selection-policy route is malformed');
        }
        return { provider: route.provider, model: route.model };
    });
}
/**
 * Append the policy once. A second call does not append.
 * @param session - Session that will store the event.
 * @param alreadyRecorded - true when the projection already has routes.
 */
export function recordPolicy(session, alreadyRecorded, allowedModels) {
    if (alreadyRecorded)
        return false;
    session.append(POLICY_EVENT, {
        allowedModels: allowedModels.map(route => ({ provider: route.provider, model: route.model })),
    });
    return true;
}
