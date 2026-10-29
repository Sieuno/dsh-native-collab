import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const sourcePath = new URL('../packages/subagent/src/identity-transition-fence.ts', import.meta.url);
const source = await readFile(sourcePath, 'utf8');
const { outputText, diagnostics } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(diagnostics?.length ?? 0, 0, 'fence transpiles without diagnostics');
const module = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
const { IdentityTransitionFence, IdentityTransitionError } = module;

test('begin synchronously blocks new routes and invalidates previously captured routes', () => {
  const fence = new IdentityTransitionFence();
  const targetGeneration = fence.capture('child');
  const release = fence.begin('child', 'lead');
  assert.equal(fence.has('child'), true);
  assert.throws(() => fence.capture('child'), (error) => {
    assert.ok(error instanceof IdentityTransitionError);
    assert.equal(error.code, 'IDENTITY_TRANSITION_IN_PROGRESS');
    assert.match(error.message, /retry after it completes/);
    return true;
  });
  assert.throws(() => fence.assertCurrent('child', targetGeneration), { code: 'IDENTITY_TRANSITION_IN_PROGRESS' });
  release();
  assert.equal(fence.has('child'), false);
  assert.throws(() => fence.assertCurrent('child', targetGeneration), { code: 'IDENTITY_TRANSITION_STALE' });
});

test('sender and target route generations are independently fenced', () => {
  const fence = new IdentityTransitionFence();
  const senderGeneration = fence.capture('sender');
  const targetGeneration = fence.capture('target');
  const releaseSender = fence.begin('sender', 'lead');
  assert.throws(() => fence.assertCurrent('sender', senderGeneration), { code: 'IDENTITY_TRANSITION_IN_PROGRESS' });
  fence.assertCurrent('target', targetGeneration);
  releaseSender();
  assert.throws(() => fence.assertCurrent('sender', senderGeneration), { code: 'IDENTITY_TRANSITION_STALE' });
  fence.assertCurrent('target', targetGeneration);
});

test('releasing is idempotent and invalidation makes all saved routes stale', () => {
  const fence = new IdentityTransitionFence();
  const first = fence.capture('child');
  const release = fence.begin('child', 'lead');
  release();
  const releasedGeneration = fence.generation('child');
  release();
  assert.equal(fence.generation('child'), releasedGeneration);
  const second = fence.capture('child');
  fence.invalidate('child');
  assert.throws(() => fence.assertCurrent('child', first), { code: 'IDENTITY_TRANSITION_STALE' });
  assert.throws(() => fence.assertCurrent('child', second), { code: 'IDENTITY_TRANSITION_STALE' });
});
