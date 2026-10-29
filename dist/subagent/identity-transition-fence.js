/**
 * Process-local, per-Session identity-transition admission fence.
 *
 * The generation also invalidates a request that resolved an old Team route
 * before a transition began but reaches inbox admission after the fence closes.
 */
export class IdentityTransitionError extends Error {
    code;
    constructor(code) {
        super(code === 'IDENTITY_TRANSITION_IN_PROGRESS'
            ? 'subagent identity transition is in progress; retry after it completes'
            : 'subagent identity changed before message admission; retry after resolving the target again');
        this.code = code;
        this.name = 'IdentityTransitionError';
    }
}
/**
 * Linearizes identity transitions against message-route generations.
 * Call begin synchronously before the transition's first await.
 */
export class IdentityTransitionFence {
    active = new Map();
    generations = new Map();
    /** Capture a route generation only while no transition currently owns the id. */
    capture(id) {
        if (this.active.has(id))
            throw new IdentityTransitionError('IDENTITY_TRANSITION_IN_PROGRESS');
        return this.generations.get(id) ?? 0;
    }
    /** Return the current generation, including while a transition is active. */
    generation(id) {
        return this.generations.get(id) ?? 0;
    }
    /** Assert a previously captured route still names the current identity. */
    assertCurrent(id, expected) {
        if (this.active.has(id))
            throw new IdentityTransitionError('IDENTITY_TRANSITION_IN_PROGRESS');
        if (this.generation(id) !== expected)
            throw new IdentityTransitionError('IDENTITY_TRANSITION_STALE');
    }
    /**
     * Begin the exclusive transition and invalidate every pre-existing route token.
     * The returned release is idempotent and advances the generation again.
     */
    begin(id, parent) {
        if (this.active.has(id))
            throw new IdentityTransitionError('IDENTITY_TRANSITION_IN_PROGRESS');
        const entry = { parent };
        this.active.set(id, entry);
        this.advance(id);
        let released = false;
        return () => {
            if (released)
                return;
            released = true;
            if (this.active.get(id) === entry) {
                this.active.delete(id);
                this.advance(id);
            }
        };
    }
    /** Whether an active transition currently owns this id. */
    has(id) {
        return this.active.has(id);
    }
    /** The exact parent currently holding the transition, if any. */
    owner(id) {
        return this.active.get(id)?.parent;
    }
    /** Invalidate previously captured routes after an independent recovery-state change. */
    invalidate(id) {
        this.advance(id);
        return this.generation(id);
    }
    advance(id) {
        this.generations.set(id, this.generation(id) + 1);
    }
}
