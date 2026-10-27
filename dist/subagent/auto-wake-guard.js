const AUTO_WAKE_LIMIT_MESSAGE = 'Automatic wake limit reached; message send failed.';
const USER_RESET_HINT = 'Wait for user input before retrying to reset the automatic wake count.';
export class AutoWakeLimitError extends Error {
    code = 'automatic-wake-limit-reached';
    constructor(options) {
        super(options?.includeUserResetHint
            ? `${AUTO_WAKE_LIMIT_MESSAGE}\n${USER_RESET_HINT}`
            : AUTO_WAKE_LIMIT_MESSAGE);
        this.name = 'AutoWakeLimitError';
    }
}
const NOOP_RESERVATION = Object.freeze({
    commit() { },
    refund() { },
});
/**
 * Synchronous, in-memory accounting for explicit automatic wake reservations.
 * Callers must not reserve for task completion/settlement or user-initiated work.
 */
export class AutoWakeGuard {
    families = new Map();
    reserve(familyKey, limit) {
        if (familyKey === undefined || !Number.isSafeInteger(limit) || limit <= 0) {
            return NOOP_RESERVATION;
        }
        let state = this.families.get(familyKey);
        if (!state) {
            state = { used: 0, generation: 0, epoch: {}, seenInterventions: new Set() };
            this.families.set(familyKey, state);
        }
        if (state.used >= limit) {
            throw new AutoWakeLimitError();
        }
        // Since limit is a positive safe integer and used < limit, this stays safe.
        state.used += 1;
        const reservedState = state;
        const reservedEpoch = state.epoch;
        let pending = true;
        return {
            commit() {
                pending = false;
            },
            refund() {
                if (!pending)
                    return;
                pending = false;
                if (reservedState.epoch === reservedEpoch && reservedState.used > 0) {
                    reservedState.used -= 1;
                }
            },
        };
    }
    reset(familyKey, interventionId) {
        if (familyKey === undefined)
            return;
        let state = this.families.get(familyKey);
        if (!state) {
            state = { used: 0, generation: 0, epoch: {}, seenInterventions: new Set() };
            this.families.set(familyKey, state);
        }
        if (interventionId !== undefined) {
            if (state.seenInterventions.has(interventionId))
                return;
            state.seenInterventions.add(interventionId);
        }
        state.used = 0;
        state.generation =
            state.generation === Number.MAX_SAFE_INTEGER ? 0 : state.generation + 1;
        state.epoch = {};
    }
    view(familyKey) {
        const state = this.families.get(familyKey);
        return state
            ? { used: state.used, generation: state.generation }
            : { used: 0, generation: 0 };
    }
}
