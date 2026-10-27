// Pure-memory declaration check. Reads this repo's cordis.patch.yml only.
// !!js becomes {__jsExpr}; the one allowlisted startup expression is evaluated
// against a fake parent.data. User Profile YAML is never read or executed.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parse, parseDocument } from 'yaml'

const patchUrl = new URL('../cordis.patch.yml', import.meta.url)
const patchPath = fileURLToPath(patchUrl)
const jsExpr = { tag: 'tag:yaml.org,2002:js', resolve: value => ({ __jsExpr: value }) }
const ALLOWED_EXPR = "ctx[Symbol.for('cordis.entry')].parent.data.some(row => row.id === 'dsh-native-collab-ui' && row.name === '@sieuno/dsh-native-collab' && (row.disabled === undefined || row.disabled === false))"
const NATIVE = [
  ['subagent', '@deepseek-ai/dsh-subagent'],
  ['agent-team', '@deepseek-ai/dsh-experimental-agent-team'],
  ['tool-agent-team', '@deepseek-ai/dsh-experimental-tool-agent-team'],
]
const DERIVED = [
  ['dsh-native-collab-subagent', '@sieuno/dsh-native-collab/subagent'],
  ['dsh-native-collab-agent-team', '@sieuno/dsh-native-collab/agent-team'],
  ['dsh-native-collab-tool-agent-team', '@sieuno/dsh-native-collab/tool-agent-team'],
  ['dsh-native-collab-tool-subagent-control', '@sieuno/dsh-native-collab/tool-subagent-control'],
  ['dsh-native-collab-tool-subagent-list-agents', '@sieuno/dsh-native-collab/tool-subagent-control/list-agents'],
  ['dsh-native-collab-tool-subagent', '@sieuno/dsh-native-collab/tool-subagent'],
  ['dsh-native-collab-tool-subagent-fork', '@sieuno/dsh-native-collab/tool-subagent/fork'],
]
const PRESETS = ['preset-standard', 'preset-minimal', 'preset-ptc', 'preset-cordis']
const text = await readFile(patchUrl, 'utf8')
const rows = parse(text, { customTags: [jsExpr] })

function switches(entries) {
  return entries.flatMap(row => Array.isArray(row?.insert) ? row.insert : [])
}
function evaluateOwnedExpression(expr, parentData) {
  const source = String(expr).replace(/\r\n/g, '\n').trim()
  // Exact text match happens before any evaluation. A Profile or other !!js payload never reaches Function.
  if (source !== ALLOWED_EXPR) throw new Error('refusing non-repo expression')
  const ctx = { [Symbol.for('cordis.entry')]: { parent: { data: parentData } } }
  return new Function('ctx', `"use strict"; return (${source});`)(ctx)
}
function managementRows(value, found = []) {
  if (Array.isArray(value)) value.forEach(item => managementRows(item, found))
  else if (value && typeof value === 'object') {
    if (value.id === 'dsh-native-collab-ui') found.push(value)
    for (const child of Object.values(value)) if (child !== value) managementRows(child, found)
  }
  return found
}

test('custom tag captures !!js as data and does not execute it', () => {
  const inert = parseDocument('value: !!js process.exit(1)\n', { logLevel: 'silent' })
  assert.equal(inert.toJS().value, 'process.exit(1)')
  assert.equal(inert.warnings.length, 1, 'unknown !!js remains inert and is reported, not executed')
  assert.equal(inert.warnings[0].code, 'TAG_RESOLVE_FAILED')
  assert.deepEqual(parse('value: !!js process.exit(1)\n', { customTags: [jsExpr] }), {
    value: { __jsExpr: 'process.exit(1)' },
  })
  const block = parse('value: !!js |\n  process.exit(1)\n', { customTags: [jsExpr] })
  assert.equal(block.value.__jsExpr.trim(), 'process.exit(1)')
  assert.equal(typeof block.value.__jsExpr, 'string')
  assert.equal(typeof block.value, 'object')
})

test('only the repo static expression is evaluated; profile and other !!js text are refused', () => {
  assert.match(patchPath, /dsh-native-collab[\\/]cordis\.patch\.yml$/)
  assert.doesNotMatch(patchPath, /profiles/i)
  const native = NATIVE.map(([id, name]) => rows.find(row => row.id === id && row.name === name))
  assert.equal(native.length, 3)
  assert.ok(native.every(row => row.disabled === native[0].disabled))
  assert.equal(typeof native[0].disabled.__jsExpr, 'string')
  assert.equal(native[0].disabled.__jsExpr.replace(/\r\n/g, '\n').trim(), ALLOWED_EXPR)
  assert.equal(evaluateOwnedExpression(native[0].disabled.__jsExpr, []), false)
  assert.throws(() => evaluateOwnedExpression('process.exit(1)', []), /refusing non-repo expression/)
  assert.throws(() => evaluateOwnedExpression(`${ALLOWED_EXPR} || process.exit(1)`, []), /refusing non-repo expression/)
  assert.throws(() => evaluateOwnedExpression({ __jsExpr: 'process.exit(1)' }.toString(), []), /refusing non-repo expression/)
})

test('native disabled is true only when the management row is clearly enabled', () => {
  const expr = rows.find(row => row.id === 'subagent').disabled.__jsExpr
  const row = (disabled, extra = {}) => [{ id: 'dsh-native-collab-ui', name: '@sieuno/dsh-native-collab', ...extra, ...(disabled === undefined ? {} : { disabled }) }]
  assert.equal(evaluateOwnedExpression(expr, row(false)), true)
  assert.equal(evaluateOwnedExpression(expr, [{ id: 'dsh-native-collab-ui', name: '@sieuno/dsh-native-collab' }]), true)
  assert.equal(evaluateOwnedExpression(expr, row(true)), false)
  assert.equal(evaluateOwnedExpression(expr, []), false)
  for (const disabled of ['!!js process.exit(1)', { __jsExpr: 'process.exit(1)' }, () => { throw new Error('disabled must not be called') }, null, 0, 'false']) {
    assert.equal(evaluateOwnedExpression(expr, row(disabled)), false, `unknown disabled ${typeof disabled}`)
  }
  assert.equal(evaluateOwnedExpression(expr, [{ id: 'dsh-native-collab-ui', name: 'other', disabled: false }]), false)
  assert.equal(evaluateOwnedExpression(expr, [{ id: 'subagent', name: '@deepseek-ai/dsh-subagent', disabled: false }]), false)
  const overrides = [
    ...NATIVE.map(([id, name]) => ({ id, name, disabled: { __jsExpr: 'process.exit(1)' } })),
    ...DERIVED.map(([id, name]) => ({ id, name, disabled: true })),
  ]
  assert.equal(evaluateOwnedExpression(expr, overrides), false)
  assert.equal(evaluateOwnedExpression(expr, [...overrides, { id: 'dsh-native-collab-ui', name: '@sieuno/dsh-native-collab', disabled: false }]), true)
})

test('only the insert row is a switch; seven derived overrides only set disabled and are not new inserts', () => {
  assert.equal(Array.isArray(rows), true)
  assert.equal(rows.length, NATIVE.length + PRESETS.length + DERIVED.length + 1)
  const inserted = switches(rows)
  assert.equal(inserted.length, 1)
  assert.equal(rows.filter(row => row && typeof row === 'object' && 'id' in row).length, 14)
  assert.ok(rows.filter(row => 'id' in row).every(row => !('insert' in row)))
  assert.equal(rows.filter(row => Array.isArray(row.insert)).length, 1)
  for (const [id, name] of NATIVE) {
    const row = rows.find(item => item.id === id)
    assert.deepEqual(Object.keys(row).sort(), ['disabled', 'id', 'name'])
    assert.equal(row.name, name)
    assert.equal(typeof row.disabled.__jsExpr, 'string')
    assert.equal('config' in row, false)
    assert.equal('insert' in row, false)
  }
  for (const [id, name] of DERIVED) {
    const row = rows.find(item => item.id === id)
    assert.deepEqual(Object.keys(row).sort(), ['disabled', 'id', 'name'])
    assert.equal(row.name, name)
    assert.equal(row.disabled, true)
    assert.equal(inserted.some(item => item.id === id), false)
  }
})

test('four preset gates inject subagents without a config pin; metadata is one management row', async () => {
  const adapter = await readFile(new URL('../packages/agent-team/src/preset-adapter.ts', import.meta.url), 'utf8')
  const listed = [...adapter.match(/MANAGED_PRESET_IDS = Object\.freeze\(\[([^\]]+)\]\)/)[1].matchAll(/'([^']+)'/g)].map(match => match[1])
  assert.deepEqual(listed, PRESETS)
  for (const id of PRESETS) {
    const row = rows.find(item => item.id === id)
    assert.equal(row.name, '@deepseek-ai/dsh-agent-preset')
    assert.deepEqual(Object.keys(row).sort(), ['id', 'inject', 'name'])
    assert.deepEqual(row.inject, ['subagents'])
    assert.equal(row.inject.includes('collabUi'), false)
    assert.equal('config' in row, false)
    assert.equal('pin' in row, false)
    assert.equal('disabled' in row, false)
    assert.equal('insert' in row, false)
  }
  const quoted = [...text.matchAll(/- id: "([^"]+)"\s*\r?\n\s+name: "([^"]+)"\s*\r?\n\s+disabled: (\w+)/g)]
  assert.equal(quoted.length, 1)
  assert.deepEqual(quoted[0].slice(1), ['dsh-native-collab-ui', '@sieuno/dsh-native-collab', 'false'])
  const inserted = switches(rows)
  assert.deepEqual(inserted, [{
    id: 'dsh-native-collab-ui',
    name: '@sieuno/dsh-native-collab',
    disabled: false,
    config: { runtimeMode: 'managed' },
  }])
  assert.equal(Object.keys(inserted[0].config).join(','), 'runtimeMode')
  assert.equal(managementRows(rows).length, 1)
})
