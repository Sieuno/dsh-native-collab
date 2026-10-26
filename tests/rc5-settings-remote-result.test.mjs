import { clientRequire, clientContext } from './browser-fixture.mjs'
/**
 * Positive production regression for the browser Settings fallback.
 * Drives packages/agent-team/client.js, which emit copies to dist/client.js.
 * describe and mutate are official RemoteResult values. The row form stays boolean.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'

const root = join(import.meta.dirname, '..')
const clientPath = join(root, 'dist', 'client.js')
const distPath = join(root, 'dist', 'client.js')
const ENTRY = 'dsh-native-collab-ui'
const SLOT = '@sieuno/dsh-native-collab#dsh-native-collab-ui'

function exactSchema() {
  return {
    uid: 'root',
    refs: {
      root: {
        type: 'object',
        dict: {
          modelEnhancement: 'a',
          communicationEnhancement: 'b',
          nativeModelSelectionCompatibility: 'c',
          runningChildGuidance: 'd', completedChildContinuation: 'e', teamRequestLimit: 'f',
        },
      },
      a: { type: 'boolean', meta: { volatile: true } },
      b: { type: 'boolean', meta: { volatile: true } },
      c: { type: 'boolean', meta: { volatile: true } },
      d: { type: 'boolean' }, e: { type: 'boolean' }, f: { type: 'number' },
    },
  }
}

function described(overrides = {}) {
  return {
    ok: true,
    value: {
      writable: true,
      hasDocument: true,
      namespaces: [{ ns: ENTRY, schema: exactSchema(), revision: 9 }],
      ...overrides,
    },
  }
}

function visit(node, predicate, found = []) {
  if (Array.isArray(node)) {
    for (const child of node) visit(child, predicate, found)
    return found
  }
  if (node && typeof node === 'object') {
    if (predicate(node)) found.push(node)
    if (node.children) visit(node.children, predicate, found)
    if (node.props?.children) visit(node.props.children, predicate, found)
  }
  return found
}

function textOf(node, out = []) {
  if (typeof node === 'string' || typeof node === 'number') {
    out.push(String(node))
    return out.join('\n')
  }
  if (Array.isArray(node)) {
    for (const child of node) textOf(child, out)
    return out.join('\n')
  }
  if (node && typeof node === 'object') {
    textOf(node.children, out)
    textOf(node.props?.children, out)
  }
  return out.join('\n')
}

function byId(node, id) {
  return visit(node, item => item.props?.['data-testid'] === id)[0]
}

function reactShim() {
  const hooks = []
  let hookIndex = 0
  let effect
  const React = {
    createElement(type, props, ...children) {
      return { type, props: props ?? {}, children: children.length ? children : props?.children }
    },
    useState(initial) {
      const index = hookIndex++
      if (!(index in hooks)) hooks[index] = initial
      return [hooks[index], value => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value }]
    },
    useEffect(callback) { effect = callback },
  }
  return {
    React,
    reset() { hookIndex = 0 },
    async flush() {
      const dispose = effect?.()
      await new Promise(resolve => setImmediate(resolve))
      if (typeof dispose === 'function') dispose()
    },
  }
}

async function loadClient() {
  let loaded
  const sandbox = { window: { __ModuleLoader__: { load(spec) { loaded = spec } } } }
  runInNewContext(await readFile(clientPath, 'utf8'), sandbox, { filename: clientPath })
  return loaded
}

async function translator() {
  const locale = JSON.parse(await readFile(join(root, 'locale', 'en.json'), 'utf8'))
  return key => {
    const table = locale.collabUi
    if (typeof table?.[key] === 'string') return table[key]
    const value = key.split('.').reduce((current, part) => current?.[part], table)
    if (typeof value !== 'string') throw new Error(`missing locale ${key}`)
    return value
  }
}

async function drive({ settings, form, t }) {
  const calls = []
  const wrapped = settings ? {
    describe: async () => {
      calls.push('describe')
      return settings.describe()
    },
    mutate: async (ns, ops, revision) => {
      calls.push({ kind: 'mutate', ns, ops, revision })
      return settings.mutate(ns, ops, revision)
    },
  } : undefined
  const loaded = await loadClient()
  const shim = reactShim()
  const registrations = []
  await loaded.factory(clientRequire(shim.React)).apply(clientContext({
    remote: {
      collabUi: { status: async () => ({ rows: [
        'dsh-native-collab-subagent',
        'dsh-native-collab-tool-subagent-control',
        'dsh-native-collab-tool-subagent-list-agents',
        'dsh-native-collab-agent-team',
        'dsh-native-collab-tool-agent-team',
        'dsh-native-collab-tool-subagent',
        'dsh-native-collab-tool-subagent-fork',
      ].map(id => ({ id, current: 'enabled' })), assembly: null }) },
      settings: wrapped,
    },
    slots: {
      inject(_name, register) { register() },
      register(contract, component) {
        registrations.push({ contract, component })
        return { contract, component }
      },
    },
  }))
  const row = registrations.find(entry => entry.contract.name === 'plugins.row.config')
  const draw = () => {
    shim.reset()
    const element = row.component({
      ...row.contract.inject(),
      t,
      view: 'page',
      form,
      subject: { kind: 'row', row: { rowId: ENTRY } },
    })
    shim.reset()
    return typeof element?.type === 'function' ? element.type(element.props) : element
  }
  let page = draw()
  await shim.flush()
  page = draw()
  byId(page, 'switch-communication').props.onChange({ target: { checked: false } })
  page = draw()
  byId(page, 'save-communication').props.onClick()
  for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve))
  return { page: draw(), calls, registrations }
}

test('emitted browser client matches the production Settings fallback', async () => {
  const source = await readFile(join(root, 'packages', 'agent-team', 'client.js'), 'utf8')
  const dictionaries = Object.fromEntries(await Promise.all(['en', 'zh'].map(async language => [language, JSON.parse(await readFile(join(root, 'locale', `${language}.json`), 'utf8')).collabUi])))
  assert.equal(source.replace('const UI_LOCALES = null', `const UI_LOCALES = ${JSON.stringify(dictionaries)}`), await readFile(distPath, 'utf8'))
})

test('Settings fallback unwraps RemoteResult and does not treat a flat DTO as saved', async () => {
  const t = await translator()
  const ops = [{ op: 'set', path: ['communicationEnhancement'], value: false }]
  const cases = [
    {
      name: 'flat dto',
      settings: {
        async describe() { return { writable: true, hasDocument: true, namespaces: [{ ns: ENTRY, schema: exactSchema(), revision: 9 }] } },
        async mutate() { throw new Error('mutate must not run') },
      },
      reason: /could not be verified/,
      mutates: 0,
    },
    {
      name: 'describe rejected',
      settings: {
        async describe() { return { ok: false, error: { code: 'settings/rejected', message: 'describe refused' } } },
        async mutate() { throw new Error('mutate must not run') },
      },
      reason: /could not be verified/,
      detail: 'describe refused',
      mutates: 0,
    },
    {
      name: 'describe throws',
      settings: {
        async describe() { throw new Error('transport down') },
        async mutate() { throw new Error('mutate must not run') },
      },
      reason: /could not be verified/,
      mutates: 0,
    },
    {
      name: 'slot key is not the entry id',
      settings: {
        async describe() { return described({ namespaces: [{ ns: SLOT, schema: exactSchema(), revision: 9 }] }) },
        async mutate() { throw new Error('mutate must not run') },
      },
      reason: /not uniquely verified/,
      mutates: 0,
    },
    {
      name: 'not writable',
      settings: {
        async describe() { return described({ writable: false }) },
        async mutate() { throw new Error('mutate must not run') },
      },
      reason: /not writable/,
      mutates: 0,
    },
    {
      name: 'document missing',
      settings: {
        async describe() { return described({ hasDocument: false }) },
        async mutate() { throw new Error('mutate must not run') },
      },
      reason: /could not be verified/,
      mutates: 0,
    },
    {
      name: 'conflict',
      settings: {
        async describe() { return described() },
        async mutate() {
          return { ok: false, error: { code: 'settings/conflict', message: 'revision moved from 9 to 10' } }
        },
      },
      reason: /revision changed/,
      detail: 'revision moved from 9 to 10',
      mutates: 1,
    },
    {
      name: 'rejected',
      settings: {
        async describe() { return described() },
        async mutate() { return { ok: false, error: { code: 'settings/rejected', message: 'schema refused the op' } } },
      },
      reason: /write was rejected/,
      detail: 'schema refused the op',
      mutates: 1,
    },
    {
      name: 'object message is not stringified',
      settings: {
        async describe() { return described() },
        async mutate() { return { ok: false, error: { code: 'settings/rejected', message: '[object Object]' } } },
      },
      reason: /write was rejected/,
      absent: '[object Object]',
      mutates: 1,
    },
    {
      name: 'flat mutate is not success',
      settings: {
        async describe() { return described() },
        async mutate() { return { wrote: true } },
      },
      reason: /write was rejected/,
      mutates: 1,
    },
    {
      name: 'saved once',
      settings: {
        async describe() { return described() },
        async mutate(ns, sent, revision) {
          assert.equal(ns, ENTRY)
          assert.equal(revision, 9)
          assert.equal(JSON.stringify(sent), JSON.stringify(ops))
          return { ok: true, value: { ns, schema: exactSchema(), revision: 10 } }
        },
      },
      reason: /next assembly preference/,
      mutates: 1,
    },
  ]
  for (const item of cases) {
    const result = await drive({ settings: item.settings, t })
    const text = textOf(result.page)
    assert.match(text, item.reason, item.name)
    if (item.detail) assert.match(text, new RegExp(item.detail), item.name)
    if (item.absent) assert.equal(text.includes(item.absent), false, item.name)
    assert.equal(result.calls.filter(call => typeof call === 'object').length, item.mutates, item.name)
  }
})

test('row form boolean is a different contract and a false result is not a save', async () => {
  const t = await translator()
  const settings = {
    async describe() { throw new Error('settings must not be used when the row form is ready') },
    async mutate() { throw new Error('settings must not be used when the row form is ready') },
  }
  const rejected = []
  const form = {
    state: { status: 'ready', revision: 3, writable: true, value: {} },
    async mutate(ops, revision) {
      rejected.push({ ops, revision })
      return false
    },
  }
  const failed = await drive({ settings, form, t })
  assert.match(textOf(failed.page), /write was rejected/)
  assert.equal(rejected.length, 1)
  assert.equal(rejected[0].revision, 3)
  assert.equal(failed.calls.filter(call => typeof call === 'object').length, 0)

  const accepted = []
  const saving = {
    state: { status: 'ready', revision: 3, writable: true, value: {} },
    async mutate(ops, revision) {
      accepted.push({ ops, revision })
      return true
    },
  }
  const saved = await drive({ settings, form: saving, t })
  assert.match(textOf(saved.page), /next assembly preference/)
  assert.equal(accepted.length, 1)
  assert.equal(saved.calls.filter(call => typeof call === 'object').length, 0)
})
