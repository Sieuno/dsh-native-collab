// Execute the production directory/wait module and send handler with isolated service fixtures.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

const read = name => readFile(new URL(`../${name}`, import.meta.url), 'utf8')
async function isolated(text) {
  const js = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
}
const source = await read('packages/tool-agent-team/src/agent-directory.ts')
const ast = ts.createSourceFile('agent-directory.ts', source, ts.ScriptTarget.Latest, true)
assert.equal(ast.parseDiagnostics.length, 0)
const withoutImports = ast.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(ast)).join('\n')
const { listIndependentAgents, waitForAgents } = await isolated(`
class TeamError extends Error { constructor(message, code) { super(message); this.code = code } }
const requireCollabSubagents = ctx => ctx.subagents;
${withoutImports}`)

function fixture() {
  const caller = { id: 'root' }
  const members = [
    { id: 'root', name: 'lead', status: 'running' },
    { id: 'team-id', name: 'mate', status: 'inactive' },
  ]
  let activity = { runningIds: [], preparing: false }, teamFailure
  const childListeners = new Set(), teamWaiters = new Set(), exclusions = []
  const ctx = {
    agents: { get() {} },
    subagents: {
      childActivity(agent, excluded) { assert.equal(agent, caller); exclusions.push([...excluded]); return activity },
      observeChildActivity(agent, excluded, callback) {
        assert.equal(agent, caller); exclusions.push([...excluded]); childListeners.add(callback)
        return () => childListeners.delete(callback)
      },
      async listChildren() { return [] }, async listDescendants() { return [] },
    },
    agentTeams: {
      listMembers(agent) { assert.equal(agent, caller); return members },
      waitForChange(agent, timeout, signal) {
        assert.equal(agent, caller)
        return new Promise((resolve, reject) => {
          const finish = () => { teamWaiters.delete(wake); signal.removeEventListener('abort', abort) }
          const wake = () => { finish(); resolve({ timedOut: false }) }
          const abort = () => { finish(); reject(signal.reason) }
          teamWaiters.add(wake)
          signal.addEventListener('abort', abort, { once: true })
          if (teamFailure) { finish(); reject(teamFailure) }
        })
      },
    },
  }
  return {
    ctx, caller, members, childListeners, teamWaiters, exclusions,
    setActivity(value) { activity = value }, failTeam(error) { teamFailure = error },
    wait(scope = 'all', signal = new AbortController().signal, timeout = 10_000) {
      return waitForAgents(ctx, caller, scope, timeout, signal)
    },
    changeChild() { for (const notify of [...childListeners]) notify() },
    changeTeam() { for (const notify of [...teamWaiters]) notify() },
    assertClean() { assert.equal(childListeners.size, 0); assert.equal(teamWaiters.size, 0) },
  }
}

test('external-only or preparing-only independent work prevents a false Team noProgress', async () => {
  for (const activity of [{ runningIds: ['external-id'], preparing: false }, { runningIds: [], preparing: true }]) {
    const f = fixture(); f.setActivity(activity)
    const pending = f.wait()
    assert.equal(f.childListeners.size, 1)
    assert.equal(f.teamWaiters.size, 1)
    f.changeChild()
    assert.deepEqual(await pending, { timedOut: false })
    assert.ok(f.exclusions.every(ids => ids.includes('team-id') && !ids.includes('root')))
    f.assertClean()
  }
})

test('all wakes for a Team event and cancels the losing child subscription', async () => {
  const f = fixture(); f.members[1].status = 'running'
  const pending = f.wait(); f.changeTeam()
  assert.deepEqual(await pending, { timedOut: false }); f.assertClean()
})

test('scope narrowing does not pretend work in another domain can wake the selected wait', async () => {
  const f = fixture(); f.setActivity({ runningIds: ['child'], preparing: false })
  assert.equal((await f.wait('team')).noProgress.reason, 'no-active-agent'); f.assertClean()
  f.members[1].status = 'running'; f.setActivity({ runningIds: [], preparing: false })
  assert.equal((await f.wait('subagents')).noProgress.reason, 'no-active-agent'); f.assertClean()
  assert.equal(f.teamWaiters.size, 0)
})

test('timeout and caller abort release both domains without cancelling Agents', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const f = fixture(); f.setActivity({ runningIds: ['child'], preparing: false })
  const timed = f.wait(); t.mock.timers.tick(10_000)
  assert.deepEqual(await timed, { timedOut: true }); f.assertClean()
  const controller = new AbortController(), reason = new Error('caller stopped waiting')
  const aborted = f.wait('all', controller.signal); controller.abort(reason)
  await assert.rejects(aborted, error => error === reason); f.assertClean()
})

test('synchronous child edge between subscribe and snapshot is not lost', async () => {
  const f = fixture()
  f.ctx.subagents.childActivity = () => { f.changeChild(); return { runningIds: [], preparing: false } }
  assert.deepEqual(await f.wait(), { timedOut: false }); f.assertClean()
})

test('invalid timeout, no work, and Team errors leave no orphaned waiters', async () => {
  const f = fixture()
  await assert.rejects(f.wait('all', new AbortController().signal, 1), error => error.code === 'TEAM_INVALID_TIMEOUT')
  f.assertClean()
  const result = await f.wait()
  assert.equal(result.noProgress.reason, 'no-active-agent')
  assert.match(result.noProgress.message, /not proof of task completion/); f.assertClean()
  const failure = new Error('Team unavailable'); f.failTeam(failure)
  f.setActivity({ runningIds: ['child'], preparing: false })
  await assert.rejects(f.wait(), error => error === failure); f.assertClean()
})

test('mixed discovery excludes complete Team branches, preserves diagnostics, and reports external activity honestly', async () => {
  const f = fixture(); f.setActivity({ runningIds: ['external'], preparing: false })
  f.ctx.subagents.listDescendants = async () => [
    { id: 'team-id', mode: 'continuable', label: 'mate', parentId: 'root', depth: 1 },
    { id: 'team-child', mode: 'continuable', label: 'hidden', parentId: 'team-id', depth: 2 },
    { id: 'external', mode: 'external', parentId: 'root', depth: 1 },
    { id: 'external-done', mode: 'external', parentId: 'root', depth: 1 },
    { kind: 'diagnostic', id: 'broken', reason: 'corrupt', parentId: 'root', depth: 1 },
    { id: 'nested', mode: 'continuable', label: 'nested', parentId: 'external', depth: 2 },
  ]
  const rows = await listIndependentAgents(f.ctx, f.caller, 'descendants', f.members, new AbortController().signal)
  assert.deepEqual(rows.map(row => row.id), ['external', 'external-done', 'broken', 'nested'])
  assert.equal(rows[0].status, 'running'); assert.equal(rows[1].status, 'unknown')
  assert.deepEqual(rows[2], { kind: 'diagnostic', id: 'broken', reason: 'corrupt', parent: 'root', depth: 1 })
  assert.equal(rows[3].depth, 2)
})

test('external activity is sampled after the asynchronous catalog read', async () => {
  const f = fixture(), catalog = Promise.withResolvers()
  f.ctx.subagents.listChildren = () => catalog.promise
  const pending = listIndependentAgents(f.ctx, f.caller, 'all', f.members, new AbortController().signal)
  f.setActivity({ runningIds: ['external'], preparing: false })
  catalog.resolve([{ id: 'external', mode: 'external' }])
  assert.equal((await pending)[0].status, 'running')
})

test('no-progress does not create and then silently swallow an unused Team wait', async () => {
  const f = fixture()
  f.ctx.agentTeams.waitForChange = () => { assert.fail('must not start an unused wait') }
  assert.equal((await f.wait()).noProgress.reason, 'no-active-agent'); f.assertClean()
})

test('direct discovery uses only the direct catalog and propagates missing catalog errors', async () => {
  const f = fixture()
  f.ctx.subagents.listChildren = async () => [{ id: 'one-shot', mode: 'one-shot' }]
  assert.equal((await listIndependentAgents(f.ctx, f.caller, 'all', f.members, new AbortController().signal))[0].mode, 'one-shot')
  const failure = new Error('catalog unavailable')
  f.ctx.subagents.listChildren = async () => { throw failure }
  await assert.rejects(listIndependentAgents(f.ctx, f.caller, 'children', f.members, new AbortController().signal), error => error === failure)
})

const teamSource = await read('packages/tool-agent-team/src/index.ts')
const teamAst = ts.createSourceFile('team.ts', teamSource, ts.ScriptTarget.Latest, true)
const nodes = []
function walk(node) {
  if (ts.isObjectLiteralExpression(node) && node.properties.some(p => p.name?.getText(teamAst) === 'name' && p.initializer?.text === 'send_message')) nodes.push(node)
  ts.forEachChild(node, walk)
}
walk(teamAst); assert.equal(nodes.length, 1)
const execute = nodes[0].properties.find(p => ts.isMethodDeclaration(p) && p.name.getText(teamAst) === 'execute')
const { makeSend } = await isolated(`
class TeamError extends Error { constructor(message, code) { super(message); this.code = code } }
const presentField = (args, key) => Object.hasOwn(args, key) && args[key] !== undefined;
const callingAgent = agent => { if (!agent) throw new Error('caller required'); return agent };
const brandString = value => value;
const normalizeSendFailure = error => error;
// This fixture isolates route selection; admission is covered by real SDK scope and Manager tests.
const assertTeamMessageIdentity = () => {};
const rejectDisabledFields = () => { throw new Error('disabled') };
export function makeSend(ctx) { const communicationOn = true, queue = true; return { ${execute.getText(teamAst)} } }
`)

test('send routing normalizes Team names/ids, forwards standalone options, and never retries a failed Team send', async () => {
  const team = [], sub = [], caller = { id: 'root' }, signal = new AbortController().signal
  let failure
  const ctx = {
    agentTeams: {
      listMembers: () => [{ name: 'mate', id: 'mate-id' }],
      async sendMessage(...args) { team.push(args); if (failure) throw failure },
    },
    subagents: { async sendMessage(...args) { sub.push(args) } },
  }
  const tool = makeSend(ctx), exec = { agent: caller, signal }
  for (const target of ['mate', 'mate-id']) assert.deepEqual(await tool.execute({ target, message: 'hi' }, exec), { sent: true })
  assert.deepEqual(team.map(([, spec]) => spec.target), ['mate', 'mate'])
  await tool.execute({ target: 'child-id', message: 'done', task_result: true, delivery: 'queue' }, exec)
  assert.deepEqual(sub[0], [caller, 'child-id', [{ type: 'text', text: 'done' }], { signal, result: true, delivery: 'queue' }])
  failure = new Error('Team denied')
  await assert.rejects(tool.execute({ target: 'mate-id', message: 'hi' }, exec), error => error === failure)
  assert.equal(sub.length, 1)
  ctx.agentTeams.listMembers = () => [{ name: 'x', id: 'a' }, { name: 'b', id: 'x' }]
  await assert.rejects(tool.execute({ target: 'x', message: 'hi' }, exec), error => error.code === 'TEAM_MEMBER_NOT_FOUND')
  assert.equal(sub.length, 1)
})
