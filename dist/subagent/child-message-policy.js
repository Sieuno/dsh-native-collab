/** Freeze sub-options without changing native behavior when the master enhancement is off. */
export function resolveChildMessagePolicy(snapshot) {
    return Object.freeze({
        running: snapshot.communicationEnhancement !== true || snapshot.runningChildGuidance !== false,
        continuation: snapshot.communicationEnhancement !== true || snapshot.completedChildContinuation !== false,
    });
}
/** A deny is checked at admission, not inferred from tool visibility. */
export function childMessageDenied(policy, running) {
    if (running && !policy.running)
        return 'Parent guidance to a running child is disabled by the next-assembly communication setting';
    if (!running && !policy.continuation)
        return 'Parent continuation of an idle or completed child is disabled by the next-assembly communication setting';
    return undefined;
}
