import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { COLLAB_UI_BRAND, readChildMessageFlags } from '../dist/subagent/assembly-snapshot.js'

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const require = createRequire(import.meta.url)
const ts = require(process.env.DSH_TYPESCRIPT_ENTRY || 'typescript')

test('delegation guidance distinguishes bounded independent work from named Team coordination', async () => {
  const [team, subagent] = await Promise.all([
    read('packages/tool-agent-team/src/index.ts'), read('packages/tool-subagent/src/flow.ts'),
  ])
  for (const source of [team, subagent]) {
    assert.match(source, /subagent_fork/)
    assert.match(source, /spawn_teammate/)
    assert.match(source, /subagent id/)
  }
  assert.match(team, /prefer spawn_teammate when the work needs a long-lived collaborator/)
  assert.match(team, /shares the Team task board/)
  assert.match(team, /temporary or phase-scoped tasks/)
  assert.match(team, /keeps its own independent task scope/)
  assert.match(team, /Team teammate is found by its member name/)
  assert.match(team, /Do not treat Agent Teams as the default for every delegation/)
  assert.match(team, /Ask each delegate to report progress at checkpoints/)
  assert.match(team, /Use wait_agent only when you specifically must pause all other activity/)
  assert.match(subagent, /const flags = readChildMessageFlags\(runtimeCtx\)/)
  assert.match(subagent, /assembly\.communicationEnhancement === true && flags !== undefined && flags\.completedChildContinuation !== false/)
  assert.match(subagent, /Start independent delegations with/)
  assert.match(subagent, /use `wait_agent` only when you specifically must pause all other activity/)
  assert.match(subagent, /Balance execution speed with token cost/)
  assert.match(subagent, /Do not delegate by default: handle small or tightly coupled tasks directly/)
  assert.match(subagent, /only when delegation offers a clear benefit/)
  assert.match(subagent, /duplicated context is limited and write scopes do not conflict/)
  assert.match(subagent, /prefer direct execution or reuse an existing agent/)
  assert.match(subagent, /send a final result message when it finishes/)
  assert.match(subagent, /only when no useful independent work remains/)
  assert.match(subagent, /Team members join a named roster and/)
  assert.match(subagent, /shared-task lifecycle/)
  assert.match(subagent, /For a self-contained bounded task, use subagent/)
  assert.match(subagent, /without joining a Team roster/)
})

// Execute the actual prompt callback and its messaging helper, not a copied
// branch. Only its lexical Context/tool inputs are fixtures. No SDK/Host starts.
function callbackFactory(source, fileName) {
  const ast = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true)
  const callbacks = []
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'runtimeCtx.systemPrompt.section') {
      const section = node.arguments[0]
      if (section && ts.isObjectLiteralExpression(section)) {
        const property = name => section.properties.find(row => ts.isPropertyAssignment(row) && row.name.getText(ast) === name)
        if (property('name')?.initializer.getText(ast) === '`tool:${toolName}`') {
          const callback = property('text')?.initializer
          assert.ok(callback && ts.isArrowFunction(callback), 'real delegation callback required')
          callbacks.push(callback.getText(ast))
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.equal(callbacks.length, 1, 'extract exactly one real delegation prompt callback')
  const helper = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'subagentMessagingGuidance')
  assert.ok(helper, 'real messaging helper required')
  const compiled = ts.transpileModule(helper.getText(ast).replace(/^export /, '') + '\nconst render = ' + callbacks[0], {
    fileName, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  return new Function('runtimeCtx', 'assembly', 'mounted', 'delegationTools', 'toolName', 'readChildMessageFlags', compiled + '\nreturn render')
}

function fixture(factory, communicationEnhancement, flags = {}) {
  const fresh = { name: 'subagent' }, fork = { name: 'subagent_fork' }
  const state = { flags, visible: new Map([[fresh.name, fresh], [fork.name, fork]]) }
  state.service = { [COLLAB_UI_BRAND]: true, childMessageFlags() { return state.flags } }
  const runtimeCtx = {
    get(name) { assert.equal(name, 'collabUi'); return state.service },
    tools: { get(name, scope) { assert.equal(scope, state); return state.visible.get(name) } },
  }
  const assembly = Object.freeze({ present: true, communicationEnhancement })
  const tools = new Set([fork, fresh]) // Deliberately unsorted.
  state.render = (toolName = 'subagent', mounted = {}) => factory(runtimeCtx, assembly, mounted, tools, toolName, readChildMessageFlags)({ scope: state })
  // This callback survives edits to the live flags; it is not recreated per edit.
  state.callback = factory(runtimeCtx, assembly, {}, tools, 'subagent', readChildMessageFlags)
  return state
}

const names = '`subagent` or `subagent_fork`'
const original = 'Start independent delegations with ' + names + ' together in one assistant message and continue useful work while they run.'
  + ' Ask the subagent to report progress at checkpoints and to send a result message when it finishes;'
  + ' use `wait_agent` only when you specifically must pause all other activity until it completes.'
const enhanced = 'Balance execution speed with token cost. Do not delegate by default: handle small or tightly coupled tasks directly. Use ' + names + ' only when delegation offers a clear benefit.'
  + ' When multiple delegations are needed, run them concurrently only if duplicated context is limited and write scopes do not conflict; continue useful work while they run.'
  + ' For tasks sharing substantial context, prefer direct execution or reuse an existing agent.'
  + ' Ask the subagent to report progress at key checkpoints and to send a final result message when it finishes.'
  + ' Use `wait_agent` only when no useful independent work remains.'
const runningNote = ' For any running subagent, `send_message` can queue a message or force an interruption into its current work to redirect it.'
const idleNote = ' For an idle subagent, `send_message` assigns a new task.'
const bothNotes = runningNote.slice(0, -1) + '; for an idle subagent, the same call assigns a new task.'
// Exact output fixtures for dynamic branches, not natural-language/policy analysis.
const messagingBranches = [
  { running: false, continuation: false, note: '' },
  { running: false, continuation: true, note: idleNote },
  { running: true, continuation: false, note: runningNote },
  { running: true, continuation: true, note: bothNotes },
  { running: undefined, continuation: false, note: '' },
  { running: undefined, continuation: true, note: idleNote },
]

for (const file of ['packages/tool-subagent/src/flow.ts', 'dist/tool-subagent/flow.js']) {
  const factory = callbackFactory(await read(file), file)
  for (const master of [false, true, undefined]) {
    for (const { running, continuation, note } of messagingBranches) {
      test(`${file}: master=${master}, running=${running}, continuation=${continuation}`, () => {
        const f = fixture(factory, master, { runningChildGuidance: running, completedChildContinuation: continuation })
        const base = master === true && continuation ? enhanced : original
        assert.equal(f.render(), base + note)
      })
    }
  }
  test(`${file}: unset continuation follows enabled default, but master remains opt-in`, () => {
    for (const master of [false, true, undefined]) {
      for (const running of [false, true, undefined]) {
        const f = fixture(factory, master, { runningChildGuidance: running })
        assert.equal(f.render(), (master === true ? enhanced : original) + (running === true ? runningNote : ''))
      }
    }
  })
  test(`${file}: absent or malformed live readers retain the exact original prompt`, () => {
    const services = [
      undefined, {}, { childMessageFlags: () => ({ completedChildContinuation: true }) },
      { [COLLAB_UI_BRAND]: true },
      ...[undefined, null, 'bad', { completedChildContinuation: 'true' }, { runningChildGuidance: 1 }].map(flags => ({
        [COLLAB_UI_BRAND]: true, childMessageFlags: () => flags,
      })),
    ]
    for (const service of services) {
      const f = fixture(factory, true)
      f.service = service
      assert.equal(f.render(), original)
    }
  })
  test(`${file}: same callback rereads live flags and recovers after service replacement`, () => {
    const f = fixture(factory, true, { runningChildGuidance: false, completedChildContinuation: false })
    const render = () => f.callback({ scope: f })
    assert.equal(render(), original)
    f.flags.completedChildContinuation = true
    assert.equal(render(), enhanced + idleNote)
    f.flags.runningChildGuidance = true
    assert.equal(render(), enhanced + bothNotes)
    f.flags = { runningChildGuidance: true, completedChildContinuation: false }
    assert.equal(render(), original + runningNote)
    f.service = undefined
    assert.equal(render(), original)
    f.service = { [COLLAB_UI_BRAND]: true, childMessageFlags: () => ({ completedChildContinuation: true }) }
    assert.equal(render(), enhanced + idleNote)
  })
  test(`${file}: visibility and provider guards still prevent duplicate or hidden notes`, () => {
    const f = fixture(factory, true, { completedChildContinuation: true })
    const unmounted = factory({ tools: { get() { throw new Error('must not inspect tools') } } }, {}, undefined, new Set(), 'subagent', readChildMessageFlags)
    assert.equal(unmounted({ scope: f }), '')
    assert.equal(f.render('subagent_fork'), '')
    f.visible.delete('subagent')
    assert.equal(f.render(), '')
    assert.equal(f.render('subagent_fork'), (enhanced + idleNote).replace(names, '`subagent_fork`'))
    f.visible.set('subagent_fork', { name: 'subagent_fork' }) // Different scoped definition.
    assert.equal(f.render('subagent_fork'), '')
    f.visible.clear()
    assert.equal(f.render(), '')
  })
}
