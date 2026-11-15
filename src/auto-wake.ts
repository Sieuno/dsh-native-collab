/** Per-root, process-local accounting. Native completion notices never enter this gate. */
export class AutoWakeGuard {
  private readonly roots = new WeakMap<object, { used: number; epoch: object }>()

  reserve(root: object, limit: number): { commit(): void; refund(): void } {
    let state = this.roots.get(root)
    if (!state) this.roots.set(root, state = { used: 0, epoch: {} })
    if (state.used >= limit) {
      throw new Error('Automatic wake limit reached; message send failed. Wait for user input before retrying.')
    }
    state.used++
    const captured = state
    const epoch = state.epoch
    let pending = true
    return {
      commit() { pending = false },
      refund() {
        if (!pending) return
        pending = false
        if (captured.epoch === epoch) captured.used--
      },
    }
  }

  reset(root: object): void { this.roots.set(root, { used: 0, epoch: {} }) }
}
