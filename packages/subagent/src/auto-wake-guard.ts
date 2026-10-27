export interface AutoWakeReservation {
  commit(): void;
  refund(): void;
}

const AUTO_WAKE_LIMIT_MESSAGE =
  'Automatic wake limit reached; message send failed.';
const USER_RESET_HINT =
  'Wait for user input before retrying to reset the automatic wake count.';

export class AutoWakeLimitError extends Error {
  readonly code = 'automatic-wake-limit-reached' as const;

  constructor(options?: { includeUserResetHint?: boolean }) {
    super(
      options?.includeUserResetHint
        ? `${AUTO_WAKE_LIMIT_MESSAGE}\n${USER_RESET_HINT}`
        : AUTO_WAKE_LIMIT_MESSAGE,
    );
    this.name = 'AutoWakeLimitError';
  }
}

type FamilyState = {
  used: number;
  generation: number;
  /** Identity token keeps stale reservations safe even at numeric rollover. */
  epoch: object;
  /** Retained for this guard lifetime so replayed human events cannot reset twice. */
  seenInterventions: Set<string>;
};

const NOOP_RESERVATION: AutoWakeReservation = Object.freeze({
  commit(): void {},
  refund(): void {},
});

/**
 * Synchronous, in-memory accounting for explicit automatic wake reservations.
 * Callers must not reserve for task completion/settlement or user-initiated work.
 */
export class AutoWakeGuard {
  private readonly families = new Map<string, FamilyState>();

  reserve(familyKey: string | undefined, limit: number): AutoWakeReservation {
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
      commit(): void {
        pending = false;
      },
      refund(): void {
        if (!pending) return;
        pending = false;
        if (reservedState.epoch === reservedEpoch && reservedState.used > 0) {
          reservedState.used -= 1;
        }
      },
    };
  }

  reset(familyKey: string | undefined, interventionId?: string): void {
    if (familyKey === undefined) return;

    let state = this.families.get(familyKey);
    if (!state) {
      state = { used: 0, generation: 0, epoch: {}, seenInterventions: new Set() };
      this.families.set(familyKey, state);
    }

    if (interventionId !== undefined) {
      if (state.seenInterventions.has(interventionId)) return;
      state.seenInterventions.add(interventionId);
    }

    state.used = 0;
    state.generation =
      state.generation === Number.MAX_SAFE_INTEGER ? 0 : state.generation + 1;
    state.epoch = {};
  }

  view(familyKey: string): { used: number; generation: number } {
    const state = this.families.get(familyKey);
    return state
      ? { used: state.used, generation: state.generation }
      : { used: 0, generation: 0 };
  }
}
