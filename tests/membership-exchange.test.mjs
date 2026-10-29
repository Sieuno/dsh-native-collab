// Isolated coordinator and browser-hook tests. No Host, real browser, model or CLI is started.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { clientContext, clientModule, clientRequire, visit, text } from './browser-fixture.mjs'
import { elementRenderer } from './element-renderer.mjs'
const require = createRequire(import.meta.url)
const ts = require('typescript')
function compile(name, dependencies = {}) {
  const source = readFileSync(new URL('../packages/agent-team/src/' + name + '.ts', import.meta.url), 'utf8')
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(id => { if (!(id in dependencies)) throw new Error('unexpected dependency ' + id); return dependencies[id] }, module, module.exports)
  return module.exports
}
const vocabulary = compile('membership-ui')
const tagged = code => Object.assign(new Error(code), { code })
function harness() {
  const inbox = [], calls = [], blocked = new Set()
  const events = []
  const accept = message => { inbox.push(message); events.push({ type: 'agent/inbox/spliced', data: { inserted: [message] } }) }
  const root = { id: 'root', status: 'idle', session: { inheritedEventCount: 0, snapshotEvents: () => events }, followup: accept, steer: accept }
  const child = { id: 'child', status: 'idle', session: { header: { parentSession: 'root' } } }
  const agents = new Map([['root', root], ['child', child]])
  const state = { members: [{ id: 'child', phase: 'active', name: 'worker' }], operations: [] }
  let leased = false, failCommit = false, failFlush = false, failReconcile = false, failFinalCheck = false, failNoticeFlush = false
  const runtime = { async listChildren() { return [{ id: 'child', mode: 'continuable', label: 'Worker' }, { id: 'external', mode: 'external' }] } }
  const internals = {
    assertNoIdentityTransition(_runtime, id) { if (blocked.has(id)) throw tagged('IDENTITY_RECOVERY_REQUIRED'); if (leased) throw tagged('IDENTITY_TRANSITION_IN_PROGRESS') },
    setIdentityRecovery(_runtime, id, value) { value ? blocked.add(id) : blocked.delete(id) },
    async withIdleContinuable(_runtime, parent, id, operation) {
      assert.equal(parent, root); assert.equal(id, child.id)
      if (child.status !== 'idle') throw tagged('IDENTITY_NOT_IDLE')
      if (leased) throw tagged('IDENTITY_TRANSITION_IN_PROGRESS')
      leased = true
      try { const value = await operation(child, new AbortController().signal); if (failFinalCheck) throw tagged('IDENTITY_TRANSITION_STALE'); return value } finally { leased = false }
    },
  }
  const { MembershipExchange } = compile('membership-exchange', {
    '@deepseek-ai/dsh-brand': { brandString: value => value },
    '@deepseek-ai/dsh-llm': { createUserMessage: value => ({ ...value, id: 'notice-' + inbox.length }) },
    '@dsh-native-collab/subagent/internal': internals, './membership-ui.ts': vocabulary,
  })
  const ctx = { agents: { list: () => [...agents.values()], get: id => agents.get(id) }, subagents: runtime, sessions: { async flush() { calls.push('flush'); if (failFlush || (failNoticeFlush && inbox.length)) throw new Error('disk failure') } } }
  const roster = {
    tryMembership(agent) { return agent === root ? { role: 'lead' } : undefined },
    async convertMembership(_root, target, request) {
      calls.push('convert')
      const previous = state.operations.find(value => value.operationId === request.operationId)
      if (previous) { if (previous.memberId !== target.id || previous.to !== request.to) throw tagged('TEAM_INVALID_ARGUMENT'); return { ...previous, replayed: true } }
      if (request.name === 'invalid') throw tagged('TEAM_INVALID_ARGUMENT')
      const receipt = { operationId: request.operationId, memberId: target.id, to: request.to, replayed: false }
      state.operations.push(receipt); state.members[0].phase = request.to === 'subagent' ? 'departed' : 'active'
      if (failCommit) throw tagged('TEAM_MEMBERSHIP_COMMIT_UNCERTAIN')
      return receipt
    },
  }
  const makeExchange = () => new MembershipExchange(ctx, roster, { state: () => state }, { disposed: false, signal: new AbortController().signal, track: promise => promise }, () => { calls.push('reconcile'); if (failReconcile) throw new Error('scope refresh failed') })
  return { exchange: makeExchange(), restart: makeExchange, root, child, inbox, blocked, calls, state, set finalFailure(value) { failFinalCheck = value }, set noticeFlushFailure(value) { failNoticeFlush = value }, set commitFailure(value) { failCommit = value }, set flushFailure(value) { failFlush = value }, set reconcileFailure(value) { failReconcile = value } }
}
const request = { rootId: 'root', targetId: 'child', operationId: 'operation-1', to: 'subagent' }
test('GUI request vocabulary rejects extra fields and maps stable failure reasons', () => {
  assert.throws(() => vocabulary.parseMembershipExchangeRequest({ ...request, tool: true }))
  assert.throws(() => vocabulary.parseMembershipExchangeRequest({ ...request, rootId: ' root' }))
  assert.equal(vocabulary.membershipExchangeReason(tagged('TEAM_MEMBER_HAS_TASKS')), 'unfinished-tasks')
  assert.equal(vocabulary.membershipExchangeReason(tagged('TEAM_MEMBER_RUNNING')), 'busy')
})
test('successful conversion reconciles after flush and notifies parent/Lead only once by receiver ID', async () => {
  const h = harness(), child = h.child
  const result = await h.exchange.convert(request)
  assert.equal(result.status, 'converted'); assert.equal(result.notification, 'delivered')
  assert.deepEqual(h.calls, ['convert', 'flush', 'reconcile', 'flush'])
  assert.equal(h.child, child); assert.equal(h.blocked.size, 0); assert.equal(h.inbox.length, 1)
  assert.equal(h.inbox[0].source.kind, 'team-membership-changed')
  const replay = await h.exchange.convert(request)
  assert.equal(replay.status, 'unchanged'); assert.equal(replay.notification, 'unchanged'); assert.equal(h.inbox.length, 1)
})
test('running targets reject without mutation or auto-cancellation', async () => {
  const h = harness(); h.child.status = 'running'
  assert.equal((await h.exchange.convert(request)).reason, 'busy')
  assert.deepEqual(h.calls, []); assert.equal(h.blocked.size, 0)
})
test('certain pre-append failure unblocks messages while uncertain commit needs same-operation repair', async () => {
  const h = harness()
  assert.equal((await h.exchange.convert({ ...request, name: 'invalid' })).status, 'rejected')
  assert.equal(h.blocked.size, 0)
  h.commitFailure = true
  assert.equal((await h.exchange.convert(request)).status, 'recovery-required')
  assert.ok(h.blocked.has('child')); assert.equal(h.inbox.length, 0)
  const rows = await h.exchange.candidates()
  assert.equal(rows.length, 1); assert.deepEqual(rows[0].recovery, request)
  assert.equal((await h.exchange.convert({ ...request, operationId: 'other' })).status, 'recovery-required')
  assert.equal((await h.exchange.convert({ ...request, to: 'teammate' })).status, 'recovery-required')
  assert.ok(h.blocked.has('child'), 'same operation with changed destination cannot clear prior uncertainty')
  assert.equal((await h.exchange.convert({ ...request, name: 'changed' })).status, 'recovery-required')
  assert.ok(h.blocked.has('child'))
  h.commitFailure = false
  assert.equal((await h.exchange.convert(request)).status, 'unchanged')
  assert.equal(h.state.operations.length, 1); assert.equal(h.blocked.size, 0); assert.equal(h.inbox.length, 1)
})
test('flush or tool reconciliation uncertainty remains blocked until explicit successful replay', async () => {
  for (const fault of ['flushFailure', 'reconcileFailure']) {
    const h = harness(); h[fault] = true
    assert.equal((await h.exchange.convert(request)).status, 'recovery-required')
    assert.ok(h.blocked.has('child')); assert.equal(h.inbox.length, 0)
    h[fault] = false
    assert.equal((await h.exchange.convert(request)).status, 'unchanged')
    assert.equal(h.blocked.size, 0); assert.equal(h.state.operations.length, 1)
  }
})

test('manager post-callback failure keeps committed identity blocked until same-operation repair', async () => {
  const h = harness(); h.finalFailure = true
  assert.equal((await h.exchange.convert(request)).status, 'recovery-required')
  assert.ok(h.blocked.has('child')); assert.equal(h.inbox.length, 0)
  h.finalFailure = false
  assert.equal((await h.exchange.convert(request)).status, 'unchanged')
  assert.equal(h.blocked.size, 0); assert.equal(h.inbox.length, 1)
})
test('committed receipts recover notifications after coordinator restart and persisted inbox prevents duplicates', async () => {
  const h = harness(); h.reconcileFailure = true
  assert.equal((await h.exchange.convert(request)).status, 'recovery-required')
  h.reconcileFailure = false
  const afterRestart = h.restart()
  await afterRestart.recover(h.root)
  assert.equal(h.inbox.length, 1)
  await h.restart().recover(h.root)
  assert.equal(h.inbox.length, 1, 'durable inbox source serves as operation/receiver receipt')
})
test('notification flush failure is retryable without reblocking resolved identity or inserting duplicates', async () => {
  const h = harness(); h.noticeFlushFailure = true
  const result = await h.exchange.convert(request)
  assert.equal(result.status, 'converted'); assert.equal(result.notification, 'failed')
  assert.equal(h.blocked.size, 0); assert.equal(h.inbox.length, 1)
  assert.deepEqual((await h.exchange.candidates())[0].recovery, request)
  h.noticeFlushFailure = false
  await h.restart().recover(h.root)
  assert.equal(h.inbox.length, 1)
})

const tick = () => new Promise(resolve => setImmediate(resolve))
test('browser only mutates on button clicks and retains an ambiguous operation for explicit retry', async () => {
  const renderer = elementRenderer(), calls = [], slots = []
  const row = { rootId: 'root', targetId: 'child', role: 'teammate', name: 'worker', label: 'Worker', status: 'inactive', reason: null, recovery: null }
  let loseReply = true
  const spec = await clientModule(), remote = { collabUi: {
    async membershipCandidates() { return [row] },
    async exchangeMembership(value) { calls.push(value); if (loseReply) { loseReply = false; throw new Error('reply lost') } return { ...request, operationId: value.operationId, status: 'unchanged', reason: null, notification: 'unchanged' } },
  } }
  const dispose = await spec.factory(clientRequire(renderer.React)).apply(clientContext({ remote, slots: {
    inject(_name, register) { register(); return () => {} },
    register(contract, Component) { slots.push({ contract, Component }); return () => {} },
  } }))
  const bundle = slots.find(item => item.contract.name === 'plugins.bundle.config')
  assert.ok(bundle, 'bundle slot is available')
  const props = { view: 'page', t: key => key, ...bundle.contract.inject() }
  const tree = renderer.draw(bundle.Component, props)
  assert.equal(visit(tree, node => node.type?.name === 'MembershipRowAction').length, 0, 'settings contains no exchange UI')
  assert.equal(props.membership, undefined, 'settings receives no conversion API')
  // Traverse the registered Team popover and its real member row, not a test export.
  const header = slots.find(item => item.contract.id === 'agent-team')
  const state = { projectionsBySession: { root: { values: { agentTeam: { members: [{ id: 'child', name: 'worker', phase: 'active' }], tasks: [] } } } }, byId: {}, phase: 'ready' }
  const headerProps = { sessionId: 'root', useSession: select => select({ openState: 'ready' }), useSessions: select => select(state), useSessionStatus: select => select(new Map()), t: key => key, ...header.contract.inject() }
  const wrapper = renderer.draw(header.Component, headerProps)
  const actual = visit(wrapper, node => node.type?.name === 'TeamAction')[0]
  const drawHeader = () => renderer.draw(actual.type, actual.props)
  const trigger = visit(drawHeader(), node => node.props?.['aria-haspopup'] === 'dialog')[0]
  trigger.props.onClick()
  const member = visit(drawHeader(), node => node.type?.name === 'TeamMemberRow')[0]
  const memberTree = renderer.draw(member.type, member.props)
  const exchangeNode = visit(memberTree, node => node.type?.name === 'MembershipRowAction')[0]
  assert.ok(exchangeNode)
  assert.equal(exchangeNode.props.rootId, 'root'); assert.equal(exchangeNode.props.targetId, 'child')
  assert.equal(exchangeNode.props.expectedRole, 'teammate')
  assert.equal(visit(memberTree, node => node.type === 'button' && visit(node, item => item.type?.name === 'MembershipRowAction').length).length, 0, 'no nested action inside navigation button')
  const render = () => renderer.draw(exchangeNode.type, exchangeNode.props)
  render(); await tick(); let panel = render()
  assert.equal(calls.length, 0)
  assert.equal(visit(panel, node => node.type === 'input').length, 0)
  assert.equal(visit(panel, node => node.type === 'button').length, 1, 'one compact row action, no manual refresh')
  const leave = visit(panel, node => node.type === 'button' && text(node).includes('exchange.leave'))[0]
  leave.props.onClick(); await tick(); await tick(); panel = render()
  assert.equal(calls.length, 1); assert.match(text(panel), /exchange.error/u)
  const retry = visit(panel, node => node.type === 'button' && text(node).includes('exchange.retry'))[0]
  assert.ok(retry); retry.props.onClick(); await tick(); await tick(); render()
  assert.equal(calls.length, 2); assert.equal(calls[0].operationId, calls[1].operationId)
  await dispose(); renderer.destroy()
})

test('catalog popover adds a join action only outside navigable local continuable rows', async () => {
  const renderer = elementRenderer(), slots = [], opened = [], aside = []
  const entries = [{ id: 'local', mode: 'continuable', label: 'Local', activity: 'inactive' },
    { id: 'once', mode: 'one-shot', label: 'Once', activity: 'inactive' },
    { id: 'external', mode: 'external', label: 'External', activity: 'inactive' }]
  const state = { projectionsBySession: { root: { state: 'idle', error: null, values: { subagentCatalog: entries } } }, byId: { root: { origin: 'root' } } }
  const spec = await clientModule(), dispose = await spec.factory(clientRequire(renderer.React)).apply(clientContext({
    remote: { collabUi: {} }, slots: {
      inject(_name, register) { register(); return () => {} },
      register(contract, Component) { slots.push({ contract, Component }); return () => {} },
    },
    get(name) { return { uiWorkspace: { openSession: value => opened.push(value) }, sidebarRight: { openResource: (...args) => aside.push(args) }, sessions: { refreshProjections() {} } }[name] },
  }))
  const header = slots.find(item => item.contract.id === 'subagent-catalog')
  const props = { sessionId: 'root', useSessions: select => select(state), useSessionStatus: select => select(new Map()), t: key => key, ...header.contract.inject() }
  const actual = visit(renderer.draw(header.Component, props), node => node.type?.name === 'SubagentCatalogAction')[0]
  const dropdown = renderer.draw(actual.type, actual.props)
  const draw = () => renderer.draw(dropdown.type, dropdown.props)
  const trigger = visit(draw(), node => node.props?.['aria-haspopup'] === 'tree')[0]
  trigger.props.ref.current = { getBoundingClientRect: () => ({ bottom: 20, left: 100 }), focus() {} }
  trigger.props.onClick()
  const rows = visit(draw(), node => node.type?.name === 'CatalogRows')[0]
  assert.ok(rows)
  const rowTree = renderer.draw(rows.type, rows.props)
  const actions = visit(rowTree, node => node.type?.name === 'MembershipRowAction')
  assert.equal(actions.length, 1)
  assert.equal(actions[0].props.rootId, 'root'); assert.equal(actions[0].props.targetId, 'local')
  assert.equal(actions[0].props.expectedRole, 'subagent')
  assert.equal(visit(rowTree, node => node.props?.role === 'treeitem' && visit(node, item => item.type?.name === 'MembershipRowAction').length).length, 0)
  const address = { parentSessionId: 'root', childSessionId: 'local', mode: 'continuable' }
  props.openChild(address); assert.deepEqual(opened, [address])
  props.openChildAside(address)
  assert.equal(aside[0][0], 'dsh-resource://subagentchat/session/local?parent=root&mode=continuable')
  assert.equal(aside[0][1].kind, 'subagentchat'); assert.equal(aside[0][1].preferNewPane, true)
  assert.equal(renderer.draw(actual.type, { ...actual.props, useSessions: select => select({ ...state, byId: { root: { origin: 'subagent' } } }) }), null)
  await dispose(); renderer.destroy()
})

test('join naming dialog is separate from the popover, cancel is read-only, and retry freezes the submitted name and ID', async () => {
  const renderer = elementRenderer(), slots = [], calls = []
  const row = { rootId: 'root', targetId: 'child', role: 'subagent', name: 'worker', label: 'Worker', status: 'inactive', reason: null, recovery: null }
  let loseReply = true
  const spec = await clientModule(), dispose = await spec.factory(clientRequire(renderer.React)).apply(clientContext({
    remote: { collabUi: { async membershipCandidates() { return [row] }, async exchangeMembership(value) {
      calls.push(value); if (loseReply) { loseReply = false; throw new Error('reply lost') }
      return { rootId: value.rootId, targetId: value.targetId, operationId: value.operationId, to: value.to, status: 'unchanged', reason: null, notification: 'unchanged' }
    } } }, slots: { inject(_name, register) { register(); return () => {} }, register(contract, Component) { slots.push({ contract, Component }); return () => {} } },
  }))
  const header = slots.find(item => item.contract.id === 'subagent-catalog'), props = { sessionId: 'root', ...header.contract.inject() }
  const drawHeader = () => renderer.draw(header.Component, props)
  const native = visit(drawHeader(), node => node.type?.name === 'SubagentCatalogAction')[0]
  native.props.membership.openJoin(row)
  let dialog = visit(drawHeader(), node => node.type?.name === 'MembershipJoinDialog')[0]
  assert.ok(dialog); assert.equal(calls.length, 0)
  const drawDialog = () => renderer.draw(dialog.type, dialog.props)
  let modal = drawDialog()
  assert.equal(modal.props.open, true); assert.equal(visit(modal, node => node.type === 'input').length, 1)
  modal.props.onClose()
  assert.equal(visit(drawHeader(), node => node.type?.name === 'MembershipJoinDialog').length, 0)
  assert.equal(calls.length, 0)
  native.props.membership.openJoin(row)
  dialog = visit(drawHeader(), node => node.type?.name === 'MembershipJoinDialog')[0]
  modal = drawDialog()
  visit(modal, node => node.type === 'input')[0].props.onChange({ target: { value: '  renamed-worker  ' } })
  modal = drawDialog(); assert.equal(calls.length, 0)
  visit(modal, node => node.type === 'button' && text(node).includes('exchange.join'))[0].props.onClick()
  await tick(); await tick(); modal = drawDialog()
  assert.equal(calls.length, 1); assert.equal(calls[0].name, 'renamed-worker')
  assert.equal(visit(modal, node => node.type === 'input')[0].props.disabled, true)
  visit(modal, node => node.type === 'button' && text(node).includes('exchange.retry'))[0].props.onClick()
  await tick(); await tick()
  assert.equal(calls.length, 2); assert.equal(calls[0].operationId, calls[1].operationId); assert.equal(calls[1].name, 'renamed-worker')
  assert.equal(visit(drawHeader(), node => node.type?.name === 'MembershipJoinDialog').length, 0)
  await dispose(); renderer.destroy()
})

test('row eligibility refreshes automatically without a refresh button and clears its timer on unmount', async () => {
  const renderer = elementRenderer(), slots = [], scheduled = new Map()
  let timerId = 0, reads = 0
  const row = { rootId: 'root', targetId: 'child', role: 'teammate', name: 'worker', label: 'Worker', status: 'running', reason: 'busy', recovery: null }
  const spec = await clientModule({ setTimeout(callback, ms) { const id = ++timerId; scheduled.set(id, { callback, ms }); return id }, clearTimeout(id) { scheduled.delete(id) } })
  const dispose = await spec.factory(clientRequire(renderer.React)).apply(clientContext({
    remote: { collabUi: { async membershipCandidates() { reads++; return [{ ...row }] } } },
    slots: { inject(_name, register) { register(); return () => {} }, register(contract, Component) { slots.push({ contract, Component }); return () => {} } },
  }))
  const header = slots.find(item => item.contract.id === 'agent-team')
  const snapshot = { projectionsBySession: { root: { values: { agentTeam: { members: [{ id: 'child', name: 'worker', phase: 'active' }], tasks: [] } } } }, byId: {}, phase: 'ready' }
  const props = { sessionId: 'root', useSession: select => select({ openState: 'ready' }), useSessions: select => select(snapshot), useSessionStatus: select => select(new Map()), t: key => key, ...header.contract.inject() }
  const actual = visit(renderer.draw(header.Component, props), node => node.type?.name === 'TeamAction')[0]
  const drawTeam = () => renderer.draw(actual.type, actual.props)
  visit(drawTeam(), node => node.props?.['aria-haspopup'] === 'dialog')[0].props.onClick()
  const member = visit(drawTeam(), node => node.type?.name === 'TeamMemberRow')[0]
  const action = visit(renderer.draw(member.type, member.props), node => node.type?.name === 'MembershipRowAction')[0]
  const drawAction = () => renderer.draw(action.type, action.props)
  drawAction(); await tick(); let tree = drawAction()
  assert.equal(visit(tree, node => node.type === 'button').length, 1)
  assert.equal(visit(tree, node => node.type === 'button')[0].props.disabled, true); assert.equal(reads, 1)
  const [id, timer] = [...scheduled.entries()].find(([, value]) => value.ms === 3000)
  scheduled.delete(id); row.status = 'inactive'; row.reason = null
  await timer.callback(); await tick(); tree = drawAction()
  assert.equal(reads, 2); assert.equal(visit(tree, node => node.type === 'button')[0].props.disabled, false)
  assert.equal(visit(tree, node => node.type === 'input').length, 0)
  renderer.destroy(); assert.equal(scheduled.size, 0); await dispose()
})
