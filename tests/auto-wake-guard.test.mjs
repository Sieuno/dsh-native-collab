import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const sourcePath = new URL('../packages/subagent/src/auto-wake-guard.ts', import.meta.url);
const source = await readFile(sourcePath, 'utf8');
const { outputText, diagnostics } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  reportDiagnostics: true,
});
assert.equal(diagnostics?.length ?? 0, 0, 'guard transpiles without diagnostics');
const guardModule = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);
const { AutoWakeGuard, AutoWakeLimitError } = guardModule;

test('allows exactly the configured limit and throws without changing usage', () => {
  const guard = new AutoWakeGuard();
  const first = guard.reserve('family-a', 2);
  const second = guard.reserve('family-a', 2);
  assert.deepEqual(guard.view('family-a'), { used: 2, generation: 0 });

  assert.throws(
    () => guard.reserve('family-a', 2),
    (error) => {
      assert.ok(error instanceof AutoWakeLimitError);
      assert.equal(error.code, 'automatic-wake-limit-reached');
      assert.match(error.message, /^Automatic wake limit reached; message send failed\./);
      return true;
    },
  );
  assert.deepEqual(guard.view('family-a'), { used: 2, generation: 0 });
  first.commit();
  second.refund();
  assert.deepEqual(guard.view('family-a'), { used: 1, generation: 0 });
});

test('refunds only pending reservations and is idempotent', () => {
  const guard = new AutoWakeGuard();
  const committed = guard.reserve('family-a', 3);
  committed.commit();
  committed.commit();
  committed.refund();
  assert.deepEqual(guard.view('family-a'), { used: 1, generation: 0 });

  const refunded = guard.reserve('family-a', 3);
  refunded.refund();
  refunded.refund();
  refunded.commit();
  assert.deepEqual(guard.view('family-a'), { used: 1, generation: 0 });
});

test('reset starts a new generation and old concurrent refunds cannot undo it', () => {
  const guard = new AutoWakeGuard();
  const oldPending = guard.reserve('family-a', 4);
  const oldCommitted = guard.reserve('family-a', 4);
  oldCommitted.commit();

  guard.reset('family-a');
  assert.deepEqual(guard.view('family-a'), { used: 0, generation: 1 });
  const fresh = guard.reserve('family-a', 2);
  oldPending.refund();
  oldPending.refund();
  assert.deepEqual(guard.view('family-a'), { used: 1, generation: 1 });
  fresh.refund();
  assert.deepEqual(guard.view('family-a'), { used: 0, generation: 1 });
});

test('the same human intervention id resets once, while distinct ids reset independently', () => {
  const guard = new AutoWakeGuard();
  guard.reserve('family-a', 3).commit();
  guard.reset('family-a', 'human-message-1');
  assert.deepEqual(guard.view('family-a'), { used: 0, generation: 1 });

  guard.reserve('family-a', 3).commit();
  guard.reset('family-a', 'human-message-1');
  assert.deepEqual(guard.view('family-a'), { used: 1, generation: 1 });

  guard.reset('family-a', 'human-message-2');
  assert.deepEqual(guard.view('family-a'), { used: 0, generation: 2 });

  guard.reserve('family-a', 3).commit();
  guard.reset('family-a');
  assert.deepEqual(guard.view('family-a'), { used: 0, generation: 3 });
  guard.reserve('family-a', 3).commit();
  guard.reset('family-a');
  assert.deepEqual(guard.view('family-a'), { used: 0, generation: 4 });
});

test('undefined family and invalid or unknown limits are exempt no-ops', () => {
  const guard = new AutoWakeGuard();
  for (const limit of [undefined, Number.NaN, Number.POSITIVE_INFINITY, 0, -1, 1.5]) {
    const reservation = guard.reserve('family-a', limit);
    reservation.commit();
    reservation.refund();
  }
  const noFamily = guard.reserve(undefined, 1);
  noFamily.commit();
  noFamily.refund();
  assert.deepEqual(guard.view('family-a'), { used: 0, generation: 0 });
});

test('families have independent usage and resets', () => {
  const guard = new AutoWakeGuard();
  const a = guard.reserve('family-a', 1);
  guard.reserve('family-b', 1).commit();
  assert.throws(() => guard.reserve('family-a', 1), AutoWakeLimitError);
  assert.deepEqual(guard.view('family-b'), { used: 1, generation: 0 });
  guard.reset('family-a');
  a.refund();
  assert.deepEqual(guard.view('family-a'), { used: 0, generation: 1 });
  assert.deepEqual(guard.view('family-b'), { used: 1, generation: 0 });
});

test('limit failure exposes no agent-control or request-hook surface', () => {
  const guard = new AutoWakeGuard();
  assert.deepEqual(
    Object.getOwnPropertyNames(Object.getPrototypeOf(guard)).sort(),
    ['constructor', 'reset', 'reserve', 'view'].sort(),
  );
  guard.reserve('family-a', 1).commit();
  assert.throws(() => guard.reserve('family-a', 1), AutoWakeLimitError);
});

test('limit errors can include the optional user-reset explanation', () => {
  const error = new AutoWakeLimitError({ includeUserResetHint: true });
  assert.match(error.message, /Wait for user input before retrying/);
});
