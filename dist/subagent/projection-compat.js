/** Projection boundary shared by the reviewed rc and alpha2 runtimes. */
/**
 * rc returns a disposer; alpha2 types return a ready handle promise (and the
 * reviewed runtime also retains a callable disposer). Never assimilate a
 * callable thenable during registration: rc Cordis disposers are awaitable.
 * Release only when the owning lifecycle explicitly calls the returned function.
 */
export function projectionDisposer(registration) {
    return async () => {
        if (typeof registration === 'function') {
            await registration();
        }
        else {
            const handle = await registration;
            await handle.dispose();
        }
    };
}
/**
 * The retained key-read API is typed in rc and unknown in alpha2. Validate with
 * the owning definition's real state schema, rather than asserting unknown as S.
 * Undefined means not registered; null remains a valid domain state.
 */
export function readProjectionState(value, schema) {
    return value === undefined ? undefined : schema.parse(value);
}
