import test from 'node:test'
import assert from 'node:assert/strict'
import { AutoWakeGuard } from '../dist/native/auto-wake.js'

test('reservations include in-flight messages and refund only a failed send once', () => {
  const guard = new AutoWakeGuard(), root = {}
  const reservation = guard.reserve(root, 1)
  assert.throws(() => guard.reserve(root, 1), /limit reached/)
  reservation.refund(); reservation.refund()
  guard.reserve(root, 1).commit()
  assert.throws(() => guard.reserve(root, 1), /limit reached/)
})
test('committed sends remain counted after a late refund attempt', () => {
  const guard = new AutoWakeGuard(), root = {}, reservation = guard.reserve(root, 1)
  reservation.commit(); reservation.refund()
  assert.throws(() => guard.reserve(root, 1))
})
test('a late failure before human reset cannot refund a later generation', () => {
  const guard = new AutoWakeGuard(), root = {}, old = guard.reserve(root, 1)
  guard.reset(root)
  guard.reserve(root, 1).commit(); old.refund()
  assert.throws(() => guard.reserve(root, 1))
})
test('roots have separate allowances, and current limits apply to the existing count', () => {
  const guard = new AutoWakeGuard(), left = {}, right = {}
  guard.reserve(left, 2).commit(); guard.reserve(left, 2).commit()
  guard.reserve(right, 1).commit()
  assert.throws(() => guard.reserve(left, 1))
  guard.reserve(left, 3).commit()
  assert.throws(() => guard.reserve(right, 1))
})
