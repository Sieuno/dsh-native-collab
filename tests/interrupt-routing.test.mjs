import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const source = await read('packages/tool-agent-team/src/index.ts')
const ast = ts.createSourceFile('team-tools.ts', source, ts.ScriptTarget.Latest, true)
assert.equal(ast.parseDiagnostics.length, 0, 'tool source must parse without recovery before extracting executable methods')
const definitions = []
function collect(node) {
  if (ts.isObjectLiteralExpression(node) && node.properties.some(p => p.name?.getText(ast) === 'name' && p.initializer?.text === 'interrupt_agent')) definitions.push(node)
  ts.forEachChild(node, collect)
}
collect(ast)
assert.equal(definitions.length, 1)
const execute = definitions[0].properties.find(p => ts.isMethodDeclaration(p) && p.name.getText(ast) === 'execute')
assert.ok(execute, 'execute the actual production tool body, not a replacement router')
const managerSource = await read('packages/subagent/src/manager.ts')
const managerAst = ts.createSourceFile('manager.ts', managerSource, ts.ScriptTarget.Latest, true)
const managerClass = managerAst.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'SubagentManager')
const interrupt = managerClass.members.find(node => ts.isMethodDeclaration(node) && node.name.getText(managerAst) === 'interrupt')
const isolated = `
class TeamError extends Error { constructor(message, code) { super(message); this.code = code } }
class SubagentError extends Error { constructor(message, code) { super(message); this.code = code } }
const brandString = value => value;
function callingAgent(agent) { if (!agent) throw new Error('calling agent required'); return agent }
export function makeTool(ctx) { return { ${execute.getText(ast)} } }
export class Manager { ${interrupt.getText(managerAst)} }
`
const output = ts.transpileModule(isolated, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { makeTool, Manager } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)

function fixture() {
  const cancellations = []
  const agent = id => ({ id, cancel: (...args) => cancellations.push({ id, args }) })
  const lead = agent('lead-session'), child = agent('subagent-id'), grandchild = agent('grandchild-id'), stranger = agent('stranger')
  const live = new Map([lead, child, grandchild, stranger].map(item => [item.id, item]))
  const manager = new Manager()
  manager.ctx = { agents: { get: id => live.get(id) } }
  manager.resident = new Map([
    [child.id, { kind: 'local', childId: child.id, parent: lead, ancestry: new Set([lead]), handle: { agent: child } }],
    [grandchild.id, { kind: 'local', childId: grandchild.id, parent: child, ancestry: new Set([lead, child]), handle: { agent: grandchild } }],
  ])
  const teamCalls = [], subagentCalls = [], roster = []
  let teamFailure
  const teams = {
    listMembers: caller => { assert.equal(caller, lead); return roster },
    interrupt: (caller, target) => { teamCalls.push({ caller, target }); if (teamFailure) throw teamFailure; return { previousStatus: 'running' } },
  }
  const subagents = { interrupt: (id, authority) => { subagentCalls.push({ id, authority }); return manager.interrupt(id, authority) } }
  const tool = makeTool({ agentTeams: teams, subagents })
  const run = target => tool.execute({ target }, { agent: lead })
  return { agent, lead, child, grandchild, stranger, live, manager, cancellations, teamCalls, subagentCalls, roster, run, failTeam: error => { teamFailure = error } }
}

test('Team-enabled tool routes a standalone child id to the actual manager cancellation body, not the Team roster', async () => {
  const f = fixture()
  assert.deepEqual(await f.run(f.child.id), { accepted: true })
  assert.equal(f.teamCalls.length, 0)
  assert.equal(f.subagentCalls.length, 1)
  assert.equal(f.subagentCalls[0].authority.agent, f.lead)
  assert.deepEqual(f.cancellations, [{ id: f.child.id, args: [{ kind: 'parent' }, { keepInbox: true }] }])
  assert.ok(!f.cancellations.some(call => call.id === f.lead.id || call.id === f.grandchild.id))
})

test('live ancestor may interrupt a deeper child without cancelling its parent or Lead', async () => {
  const f = fixture()
  await f.run(f.grandchild.id)
  assert.deepEqual(f.cancellations.map(call => call.id), [f.grandchild.id])
})

test('Team names and member ids resolve canonically and never fall through after authorization failure', async () => {
  const f = fixture()
  f.roster.push({ name: 'reviewer', id: f.child.id })
  for (const target of ['reviewer', f.child.id]) assert.deepEqual(await f.run(target), { accepted: true, previousStatus: 'running' })
  assert.deepEqual(f.teamCalls.map(call => call.target), ['reviewer', 'reviewer'])
  assert.equal(f.subagentCalls.length, 0)
  const denied = new Error('only the Team Lead can interrupt teammates')
  f.failTeam(denied)
  assert.throws(() => f.run(f.child.id), error => error === denied)
  assert.equal(f.subagentCalls.length, 0, 'permission denial is not permission to retry another namespace')
  assert.equal(f.cancellations.length, 0)
})

test('ambiguous Team address is rejected before either interrupt path', () => {
  const f = fixture()
  f.roster.push({ name: 'collision', id: 'first' }, { name: 'second', id: 'collision' })
  assert.throws(() => f.run('collision'), error => error.code === 'TEAM_MEMBER_NOT_FOUND')
  assert.equal(f.teamCalls.length + f.subagentCalls.length, 0)
})

test('the actual manager still rejects foreign, self and stale caller identities', () => {
  const f = fixture()
  f.manager.resident.get(f.child.id).ancestry = new Set([f.stranger])
  assert.throws(() => f.run(f.child.id), error => error.code === 'UNAUTHORIZED')
  assert.throws(() => f.run(f.lead.id), error => error.code === 'UNAUTHORIZED')
  f.live.set(f.lead.id, { id: f.lead.id })
  assert.throws(() => f.run(f.child.id), error => error.code === 'UNAUTHORIZED')
  assert.equal(f.cancellations.length, 0)
})

test('external child receives its own abort signal; missing or closing activations do not imply a confirmed stop', async () => {
  const f = fixture(), controller = new AbortController(), disposed = []
  const activation = { kind: 'external', childId: f.child.id, parent: f.lead, ancestry: new Set([f.lead]), controller }
  f.manager.resident.set(f.child.id, activation)
  f.manager.dispose = async item => { disposed.push(item.childId) }
  assert.deepEqual(await f.run(f.child.id), { accepted: true })
  assert.equal(controller.signal.aborted, true)
  assert.deepEqual(controller.signal.reason, { kind: 'parent' })
  assert.deepEqual(disposed, [f.child.id])
  assert.equal(f.cancellations.length, 0)
  assert.deepEqual(await f.run('already-finished-id'), { accepted: true })
  assert.equal(disposed.length, 1)
  const local = f.manager.resident.get(f.grandchild.id)
  local.closing = Promise.resolve()
  await f.run(f.grandchild.id)
  assert.equal(f.cancellations.length, 0)
})

test('model guidance explains accepted-not-stopped and the correct Team versus subagent addressing', () => {
  const text = definitions[0].getText(ast)
  assert.match(text, /live descendant subagent/)
  assert.match(text, /not proof that work has already stopped/)
  assert.match(text, /failed Team interrupt never falls through/)
  const schema = ast.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(ast) === 'INTERRUPT_VALUE_SCHEMA')).getText(ast)
  assert.match(schema, /accepted: \{ type: 'boolean', required: true \}/)
  assert.doesNotMatch(schema, /previousStatus: \{[^}]*required: true/)
})
