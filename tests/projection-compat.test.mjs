import test from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import { projectionDisposer, readProjectionState } from '../dist/subagent/projection-compat.js'

test('callable rc and alpha compatibility disposers are not awaited during registration', async () => {
  let calls = 0
  const hybrid = Object.assign(() => { calls++ }, { then() { throw new Error('must not assimilate a callable disposer') } })
  const dispose = projectionDisposer(hybrid)
  assert.equal(calls, 0)
  await dispose()
  assert.equal(calls, 1)
})

test('handle registration is awaited only when its owner releases it', async () => {
  let ready, releases = 0
  const registration = new Promise(resolve => { ready = resolve })
  const dispose = projectionDisposer(registration)
  const released = dispose()
  assert.equal(releases, 0)
  ready({ async dispose() { releases++ } })
  await released
  assert.equal(releases, 1)
})

test('registration and release failures are preserved', async () => {
  const failure = new Error('projection failed')
  await assert.rejects(projectionDisposer(Promise.reject(failure))(), error => error === failure)
  await assert.rejects(projectionDisposer(Promise.resolve({ dispose() { throw failure } }))(), error => error === failure)
  await assert.rejects(projectionDisposer(() => { throw failure })(), error => error === failure)
})

test('key reads retain undefined and nullable state, validate and detach real schema output', () => {
  const schema = z.array(z.object({ provider: z.string().min(1), model: z.string().min(1) }).strict()).nullable()
  assert.equal(readProjectionState(undefined, schema), undefined)
  assert.equal(readProjectionState(null, schema), null)
  const state = [{ provider: 'review', model: 'model' }]
  const read = readProjectionState(state, schema)
  assert.deepEqual(read, state)
  assert.notEqual(read, state)
  assert.throws(() => readProjectionState({}, schema))
  assert.throws(() => readProjectionState([{ provider: 'review' }], schema))
})
