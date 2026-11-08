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
function harness({ includeSecond = false } = {}) {
  const inbox = [], calls = [], blocked = new Set(), busyChildren = new Set(), reconciled = []
  const events = []
  const accept = message => { inbox.push(message); events.push({ type: 'agent/inbox/spliced', data: { inserted: [message] } }) }
  const root = { id: 'root', status: 'idle', session: { inheritedEventCount: 0, snapshotEvents: () => events }, followup: accept, steer: accept }
  const child = { id: 'child', status: 'idle', session: { header: { parentSession: 'root' } } }
  const childTwo = { id: 'child-2', status: 'idle', session: { header: { parentSession: 'root' } } }
  const agents = new Map([['root', root], ['child', child], ...(includeSecond ? [['child-2', childTwo]] : [])])
  const state = { members: [{ id: 'child', phase: 'active', name: 'worker' }, ...(includeSecond ? [{ id: 'child-2', phase: 'active', name: 'worker-2' }] : [])], operations: [] }
  let leased = false, failCommit = false, failFlush = false, failReconcile = false, failFinalCheck = false, failNoticeFlush = false, flushGate = null
  const runtime = { async listChildren() { return [{ id: 'child', mode: 'continuable', label: 'Worker' }, ...(includeSecond ? [{ id: 'child-2', mode: 'continuable', label: 'Worker 2' }] : []), { id: 'external', mode: 'external' }] } }
  const internals = {
    assertNoIdentityTransition(_runtime, id) { if (blocked.has(id)) throw tagged('IDENTITY_RECOVERY_REQUIRED'); if (leased) throw tagged('IDENTITY_TRANSITION_IN_PROGRESS') },
    setIdentityRecovery(_runtime, id, value) { value ? blocked.add(id) : blocked.delete(id) },
    async withIdleContinuable(_runtime, parent, id, operation, onStable) {
      assert.equal(parent, root)
      const target = agents.get(id)
      assert.ok(target && id !== root.id)
      if (busyChildren.has(id) || target.status !== 'idle') throw tagged('IDENTITY_NOT_IDLE')
      if (leased) throw tagged('IDENTITY_TRANSITION_IN_PROGRESS')
      leased = true
      try {
        const value = await operation(target, new AbortController().signal)
        if (failFinalCheck) throw tagged('IDENTITY_TRANSITION_STALE')
        onStable?.(target, value)
        return value
      } finally { leased = false }
    },
  }
  const { MembershipExchange } = compile('membership-exchange', {
    '@deepseek-ai/dsh-brand': { brandString: value => value },
    '@deepseek-ai/dsh-llm': { createUserMessage: value => ({ ...value, id: 'notice-' + inbox.length }) },
    '@dsh-native-collab/subagent/internal': internals, './membership-ui.ts': vocabulary,
  })
  const ctx = { agents: { list: () => [...agents.values()], get: id => agents.get(id) }, subagents: runtime, sessions: { async flush() {
    calls.push('flush')
    const gate = flushGate
    if (gate !== null) { flushGate = null; await gate }
    if (failFlush || (failNoticeFlush && inbox.length)) throw new Error('disk failure')
  } } }
  const roster = {
    tryMembership(agent) { return agent === root ? { role: 'lead' } : undefined },
    async convertMembership(_root, target, request) {
      calls.push('convert')
      const previous = state.operations.find(value => value.operationId === request.operationId)
      if (previous) { if (previous.memberId !== target.id || previous.to !== request.to) throw tagged('TEAM_INVALID_ARGUMENT'); return { ...previous, replayed: true } }
      if (request.name === 'invalid') throw tagged('TEAM_INVALID_ARGUMENT')
      const receipt = { operationId: request.operationId, memberId: target.id, to: request.to, replayed: false }
      state.operations.push(receipt)
      const member = state.members.find(value => value.id === target.id)
      if (member) member.phase = request.to === 'subagent' ? 'departed' : 'active'
      else if (request.to === 'teammate') state.members.push({ id: target.id, phase: 'active', name: request.name ?? 'worker' })
      if (failCommit) throw tagged('TEAM_MEMBERSHIP_COMMIT_UNCERTAIN')
      return receipt
    },
  }
  const makeExchange = () => new MembershipExchange(ctx, roster, { state: () => state }, { disposed: false, signal: new AbortController().signal, track: promise => promise }, child => { calls.push('reconcile'); reconciled.push(child.id); if (failReconcile) throw new Error('scope refresh failed') })
  return { exchange: makeExchange(), restart: makeExchange, root, child, childTwo, inbox, blocked, calls, state, reconciled,
    setBusy(id, value = true) { value ? busyChildren.add(id) : busyChildren.delete(id) },
    set finalFailure(value) { failFinalCheck = value }, set noticeFlushFailure(value) { failNoticeFlush = value }, set commitFailure(value) { failCommit = value }, set flushFailure(value) { failFlush = value }, set reconcileFailure(value) { failReconcile = value }, set nextFlushGate(value) { flushGate = value } }
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
  h.flushFailure = true
  await assert.rejects(() => h.exchange.candidates(), /disk failure/u, 'unflushed memory state is not reported as a durable receipt')
  h.flushFailure = false
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
test('committed receipts reconcile identity and recover notifications after coordinator restart', async () => {
  const h = harness(); h.reconcileFailure = true
  assert.equal((await h.exchange.convert(request)).status, 'recovery-required')
  assert.ok(h.blocked.has('child'))
  h.reconcileFailure = false
  const afterRestart = h.restart()
  h.finalFailure = true
  await assert.rejects(() => afterRestart.recover(h.root), error => error instanceof AggregateError
    && error.errors.some(item => item?.code === 'IDENTITY_TRANSITION_STALE'))
  assert.ok(h.blocked.has('child'), 'final maintenance failure must leave the recovery guard set')
  h.finalFailure = false
  await afterRestart.recover(h.root)
  assert.equal(h.blocked.size, 0, 'durable receipt plus stable reconciliation clears the manager-owned guard')
  assert.equal(h.calls.filter(value => value === 'reconcile').length, 3)
  assert.equal(h.inbox.length, 1)
  const restarted = h.restart()
  await restarted.recover(h.root)
  assert.equal((await restarted.candidates())[0].recovery, null, 'a settled receipt does not offer a retry after restart')
  assert.equal(h.inbox.length, 1, 'durable inbox source serves as operation/receiver receipt')
})

test('recovery snapshot skips a receipt superseded while its confirmation flush is pending', async () => {
  const h = harness()
  assert.equal((await h.exchange.convert(request)).status, 'converted')
  let resumeFlush
  h.nextFlushGate = new Promise(resolve => { resumeFlush = resolve })
  const recovery = h.restart().recover(h.root)
  await tick()
  const reverse = { rootId: 'root', targetId: 'child', operationId: 'operation-2', to: 'teammate', name: 'worker' }
  assert.equal((await h.exchange.convert(reverse)).status, 'converted')
  resumeFlush()
  await recovery
  assert.equal(h.state.operations.length, 2)
  assert.equal(h.calls.filter(value => value === 'reconcile').length, 2, 'stale snapshot is not reconciled or used to clear another operation guard')
})

test('membership leave and join round trips use distinct operations and leave no recovery pending', async () => {
  const h = harness()
  const leaveOne = { rootId: 'root', targetId: 'child', operationId: 'leave-1', to: 'subagent' }
  const joinOne = { rootId: 'root', targetId: 'child', operationId: 'join-1', to: 'teammate', name: 'worker' }
  const leaveTwo = { ...leaveOne, operationId: 'leave-2' }
  const joinTwo = { ...joinOne, operationId: 'join-2' }
  assert.equal((await h.exchange.convert(leaveOne)).status, 'converted')
  assert.equal((await h.exchange.candidates())[0].role, 'subagent')
  assert.equal((await h.exchange.convert(joinOne)).status, 'converted')
  const teammate = (await h.exchange.candidates())[0]
  assert.equal(teammate.role, 'teammate')
  assert.equal(teammate.recovery, null)
  assert.equal((await h.exchange.convert(leaveTwo)).status, 'converted')
  assert.equal((await h.exchange.candidates())[0].role, 'subagent')
  assert.equal((await h.exchange.convert(joinTwo)).status, 'converted')
  const final = (await h.exchange.candidates())[0]
  assert.equal(final.role, 'teammate')
  assert.equal(final.recovery, null)
  assert.deepEqual(h.state.operations.map(item => item.operationId), ['leave-1', 'join-1', 'leave-2', 'join-2'])
})

test('lost committed reply is recoverable from the durable receipt after coordinator restart', async () => {
  const h = harness(); h.commitFailure = true
  assert.equal((await h.exchange.convert(request)).status, 'recovery-required')
  assert.ok(h.blocked.has('child'))
  h.commitFailure = false
  const restarted = h.restart()
  const [blockedCandidate] = await restarted.candidates()
  assert.deepEqual(blockedCandidate.recovery, request, 'the Manager guard preserves the exact retry after coordinator reload')
  await restarted.recover(h.root)
  const [candidate] = await restarted.candidates()
  assert.equal(candidate.role, 'subagent', 'candidate reflects the post-transition role')
  assert.equal(candidate.recovery, null)
  const replay = await restarted.convert(request)
  assert.equal(replay.status, 'unchanged')
  assert.equal(h.state.operations.length, 1, 'same operation is replayed rather than reversed or duplicated')
  assert.equal(h.blocked.size, 0)
})
test('new coordinator cannot bypass a recovery guard with a different operation; exact flushed receipt replay repairs it', async () => {
  const h = harness(); h.commitFailure = true
  assert.equal((await h.exchange.convert(request)).status, 'recovery-required')
  assert.ok(h.blocked.has('child'))
  h.commitFailure = false
  const rebuilt = h.restart()
  const before = h.calls.filter(value => value === 'convert').length
  assert.equal((await rebuilt.convert({ ...request, operationId: 'operation-b', to: 'teammate', name: 'worker' })).status, 'recovery-required')
  assert.equal(h.calls.filter(value => value === 'convert').length, before, 'a new transition never reaches the roster while recovery is blocked')
  assert.ok(h.blocked.has('child'))
  assert.equal((await rebuilt.convert(request)).status, 'unchanged')
  assert.equal(h.state.operations.length, 1)
  assert.equal(h.blocked.size, 0, 'only exact operation A may reconcile and clear the manager guard')
})

test('recover leaves targets blocked without a verifiable receipt and proceeds after a busy sibling', async () => {
  const h = harness({ includeSecond: true })
  h.blocked.add('child')
  assert.equal((await h.restart().convert(request)).status, 'recovery-required')
  assert.ok(h.blocked.has('child'), 'no durable receipt means recovery cannot clear the guard')

  h.state.operations.push(
    { operationId: 'receipt-1', memberId: 'child', to: 'subagent' },
    { operationId: 'receipt-2', memberId: 'child-2', to: 'subagent' },
  )
  h.blocked.add('child-2')
  h.setBusy('child')
  await assert.rejects(() => h.restart().recover(h.root), AggregateError)
  assert.ok(h.blocked.has('child'), 'busy child remains fail-closed')
  assert.equal(h.blocked.has('child-2'), false, 'busy first child does not prevent another exact receipt from reconciling')
  assert.deepEqual(h.reconciled, ['child-2'])
})

test('notification flush failure is retryable without reblocking resolved identity or inserting duplicates', async () => {
  const h = harness(); h.noticeFlushFailure = true
  const result = await h.exchange.convert(request)
  assert.equal(result.status, 'converted'); assert.equal(result.notification, 'failed')
  assert.equal(h.blocked.size, 0); assert.equal(h.inbox.length, 1)
  assert.deepEqual((await h.exchange.candidates())[0].recovery, request, 'the membership receipt was flushed before notification delivery failed')
  h.noticeFlushFailure = false
  await h.restart().recover(h.root)
  assert.equal(h.inbox.length, 1)
})

const tick = () => new Promise(resolve => setImmediate(resolve))
test('browser recovers the same server receipt after remount and changed Team role', async () => {
  const calls = []
  const row = { rootId: 'root', targetId: 'child', role: 'teammate', name: 'worker', label: 'Worker', status: 'inactive', reason: null, recovery: null }
  let loseReply = true
  let candidate = row
  const remote = { collabUi: {
    async membershipCandidates() { return [candidate] },
    async exchangeMembership(value) {
      calls.push(value)
      if (loseReply) {
        loseReply = false
        candidate = { ...row, role: 'subagent', recovery: { rootId: value.rootId, targetId: value.targetId, operationId: value.operationId, to: value.to } }
        throw new Error('reply lost')
      }
      return { ...request, operationId: value.operationId, status: 'unchanged', reason: null, notification: calls.length === 2 ? 'failed' : 'unchanged' }
    },
  } }
  const project = { projectionsBySession: { root: { values: { agentTeam: { members: [{ id: 'child', name: 'worker', phase: 'active' }], tasks: [] } } } }, byId: {}, phase: 'ready' }
  const createUi = async renderer => {
    const slots = [], spec = await clientModule()
    const dispose = await spec.factory(clientRequire(renderer.React)).apply(clientContext({ remote, slots: {
      inject(_name, register) { register(); return () => {} },
      register(contract, Component) { slots.push({ contract, Component }); return () => {} },
    } }))
    const bundle = slots.find(item => item.contract.name === 'plugins.bundle.config')
    const props = { view: 'page', t: key => key, ...bundle.contract.inject() }
    const tree = renderer.draw(bundle.Component, props)
    assert.equal(visit(tree, node => node.type?.name === 'MembershipRowAction').length, 0, 'settings contains no exchange UI')
    assert.equal(props.membership, undefined, 'settings receives no conversion API')
    const header = slots.find(item => item.contract.id === 'agent-team')
    const headerProps = { sessionId: 'root', useSession: select => select({ openState: 'ready' }), useSessions: select => select(project), useSessionStatus: select => select(new Map()), t: key => key, ...header.contract.inject() }
    const wrapper = renderer.draw(header.Component, headerProps)
    const actual = visit(wrapper, node => node.type?.name === 'TeamAction')[0]
    const drawHeader = () => renderer.draw(actual.type, actual.props)
    const trigger = visit(drawHeader(), node => node.props?.['aria-haspopup'] === 'dialog')[0]
    trigger.props.onClick()
    const member = visit(drawHeader(), node => node.type?.name === 'TeamMemberRow')[0]
    const memberTree = renderer.draw(member.type, member.props)
    const exchangeNode = visit(memberTree, node => node.type?.name === 'MembershipRowAction')[0]
    return { dispose, exchangeNode }
  }

  let renderer = elementRenderer()
  let ui = await createUi(renderer)
  assert.equal(ui.exchangeNode.props.expectedRole, 'teammate')
  let panel = renderer.draw(ui.exchangeNode.type, ui.exchangeNode.props)
  await tick(); panel = renderer.draw(ui.exchangeNode.type, ui.exchangeNode.props)
  assert.equal(calls.length, 0, 'mount and candidate reads never mutate')
  const leave = visit(panel, node => node.type === 'button' && text(node).includes('exchange.leave'))[0]
  leave.props.onClick(); await tick(); await tick()
  panel = renderer.draw(ui.exchangeNode.type, ui.exchangeNode.props)
  assert.equal(calls.length, 1); assert.match(text(panel), /exchange.error/u)
  await ui.dispose(); renderer.destroy()

  renderer = elementRenderer()
  ui = await createUi(renderer)
  assert.equal(ui.exchangeNode.props.expectedRole, 'teammate')
  panel = renderer.draw(ui.exchangeNode.type, ui.exchangeNode.props)
  await tick(); panel = renderer.draw(ui.exchangeNode.type, ui.exchangeNode.props)
  const retry = visit(panel, node => node.type === 'button' && text(node).includes('exchange.retry'))[0]
  assert.ok(retry, 'durable candidate evidence is shown even after the current role changed')
  assert.equal(calls.length, 1, 'remount reads the server receipt but does not automatically replay it')
  retry.props.onClick(); await tick(); await tick()
  assert.equal(calls.length, 2)
  assert.equal(calls[0].operationId, calls[1].operationId)
  assert.equal(calls[0].to, calls[1].to)
  panel = renderer.draw(ui.exchangeNode.type, ui.exchangeNode.props)
  const retryNotification = visit(panel, node => node.type === 'button' && text(node).includes('exchange.retry'))[0]
  assert.ok(retryNotification, 'a failed notification keeps the same operation retryable')
  retryNotification.props.onClick(); await tick(); await tick()
  assert.deepEqual(calls[2], calls[1])
  panel = renderer.draw(ui.exchangeNode.type, ui.exchangeNode.props)
  assert.equal(visit(panel, node => node.type === 'button' && text(node).includes('exchange.retry')).length, 0,
    'a successful explicit replay is acknowledged for the mounted component without a local operation cache')
  const joins = []
  const nextRole = { ...ui.exchangeNode.props, expectedRole: 'subagent', api: { ...ui.exchangeNode.props.api, openJoin: value => joins.push(value) } }
  const nextPanel = renderer.draw(ui.exchangeNode.type, nextRole)
  const join = visit(nextPanel, node => node.type === 'button' && text(node).includes('exchange.join'))[0]
  assert.ok(join, 'current subagent role offers a new join action rather than replaying the completed leave')
  join.props.onClick()
  assert.deepEqual(joins, [candidate])
  assert.equal(calls.length, 3, 'starting a reverse operation requires the separate explicit dialog action')
  await ui.dispose(); renderer.destroy()
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

test('rejoin dialog labels a new operation as join even when a historical receipt is present', async () => {
  const renderer = elementRenderer(), slots = [], calls = []
  const row = { rootId: 'root', targetId: 'child', role: 'subagent', name: 'worker', label: 'Worker', status: 'inactive', reason: null,
    recovery: { rootId: 'root', targetId: 'child', operationId: 'completed-leave', to: 'subagent' } }
  const spec = await clientModule(), dispose = await spec.factory(clientRequire(renderer.React)).apply(clientContext({
    remote: { collabUi: { async exchangeMembership(value) {
      calls.push(value)
      return { ...value, status: 'converted', reason: null, notification: 'delivered' }
    } } }, slots: { inject(_name, register) { register(); return () => {} }, register(contract, Component) { slots.push({ contract, Component }); return () => {} } },
  }))
  try {
    const header = slots.find(item => item.contract.id === 'subagent-catalog'), props = { sessionId: 'root', ...header.contract.inject() }
    const drawHeader = () => renderer.draw(header.Component, props)
    const native = visit(drawHeader(), node => node.type?.name === 'SubagentCatalogAction')[0]
    native.props.membership.openJoin(row)
    const dialog = visit(drawHeader(), node => node.type?.name === 'MembershipJoinDialog')[0]
    const modal = renderer.draw(dialog.type, dialog.props)
    assert.equal(calls.length, 0, 'opening the dialog is read-only')
    assert.equal(visit(modal, node => node.type === 'button' && text(node).includes('exchange.retry')).length, 0)
    const join = visit(modal, node => node.type === 'button' && text(node).includes('exchange.join'))[0]
    assert.ok(join, 'a historical receipt does not turn a new join into a retry')
    join.props.onClick(); await tick(); await tick()
    assert.equal(calls.length, 1)
    assert.notEqual(calls[0].operationId, row.recovery.operationId)
    assert.equal(calls[0].to, 'teammate'); assert.equal(calls[0].name, 'worker')
    assert.equal(visit(drawHeader(), node => node.type?.name === 'MembershipJoinDialog').length, 0)
  } finally { await dispose(); renderer.destroy() }
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
