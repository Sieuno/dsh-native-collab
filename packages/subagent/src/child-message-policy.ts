/** Parent-to-child model messages; human follow-ups and child-to-parent replies stay native. */
export interface ChildMessagePolicy {
  readonly running: boolean
  readonly continuation: boolean
}

/** Freeze sub-options without changing native behavior when the master enhancement is off. */
export function resolveChildMessagePolicy(snapshot: {
  readonly communicationEnhancement?: boolean
  readonly runningChildGuidance?: boolean
  readonly completedChildContinuation?: boolean
}): ChildMessagePolicy {
  return Object.freeze({
    running: snapshot.communicationEnhancement !== true || snapshot.runningChildGuidance !== false,
    continuation: snapshot.communicationEnhancement !== true || snapshot.completedChildContinuation !== false,
  })
}

/** A deny is checked at admission, not inferred from tool visibility. */
export function childMessageDenied(policy: ChildMessagePolicy, running: boolean): string | undefined {
  if (running && !policy.running) return 'Parent guidance to a running child is disabled by the next-assembly communication setting'
  if (!running && !policy.continuation) return 'Parent continuation of an idle or completed child is disabled by the next-assembly communication setting'
  return undefined
}
