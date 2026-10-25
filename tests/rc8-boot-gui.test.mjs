import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { clientContext, clientRequire } from './browser-fixture.mjs'
import { actualLocale } from './official-locale-fixture.mjs'

// Hook/element contract double; no DOM, live browser, transport or Host.
function renderer() {
 const states = new Map(), effects = new Set()
 let active, cursor
 const React = {
  Fragment: 'fragment', createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
  useState(initial) {
   const cells = states.get(active), index = cursor++
   if (!(index in cells)) cells[index] = typeof initial === 'function' ? initial() : initial
   return [cells[index], value => { cells[index] = typeof value === 'function' ? value(cells[index]) : value }]
  },
  useEffect(callback) { if (!effects.has(active)) { effects.add(active); callback() } },
 }
 return { React, draw(Component, props) { active = Component; cursor = 0; if (!states.has(active)) states.set(active, []); return Component(props) } }
}
function visit(node, predicate, found = []) {
 if (Array.isArray(node)) { node.forEach(child => visit(child, predicate, found)); return found }
 if (!node || typeof node !== 'object') return found
 if (predicate(node)) found.push(node)
 visit(node.children, predicate, found); visit(node.props?.children, predicate, found); visit(node.props?.footer, predicate, found)
 return found
}
function text(node) {
 if (Array.isArray(node)) return node.map(text).join(' ')
 if (typeof node === 'string' || typeof node === 'number') return String(node)
 return node && typeof node === 'object' ? [text(node.children), text(node.props?.children), text(node.props?.footer)].join(' ') : ''
}
const tick = () => new Promise(resolve => setImmediate(resolve))
const TOKEN = '12345678-1234-1234-1234-123456789abc'
async function harness(language, rejectApply = false) {
 const r = renderer(), calls = [], registrations = []
 const locale = actualLocale(language)
 const t = locale.bind('collabUi')
 const target = { scope: 'preset:standard', id: 'ordinary-create', moduleName: '@dsh-native-collab/derived/tool-subagent', operation: 'replace', previousModule: '@deepseek-ai/dsh-tool-subagent' }
 let spec
 runInNewContext(await readFile(new URL('../dist/client.js', import.meta.url), 'utf8'), { window: { __ModuleLoader__: { load(value) { spec = value } } } })
 const remote = { collabUi: {
  async status() { return { rows: [] } },
  async bootStatus() { calls.push('status'); return { profileName: 'test', configured: 'mixed', writeSupport: 'available', pendingRestart: 'unknown', error: null } },
  async bootPlan(action) { calls.push({ plan: action }); return { action, accepted: false, planId: TOKEN, targets: [target], pendingRestart: 'required', error: null, warnings: ['fixed-state-not-history-restore', 'stop-agents-and-restart'] } },
  async bootApply(token) { calls.push({ apply: token }); return { action: 'enable', accepted: !rejectApply, pendingRestart: 'required', error: rejectApply ? 'configuration-changed-review-again' : null, configured: rejectApply ? 'unknown' : 'enabled' } },
 } }
 const dispose = await spec.factory(clientRequire(r.React)).apply(clientContext({ remote, locale, slots: {
  inject(_name, register) { register(); return () => {} }, register(contract, Component) { registrations.push({ contract, Component }); return () => {} },
 } }))
 const row = registrations.find(item => item.contract.name === 'plugins.bundle.config')
 const props = { view: 'page', t, ...row.contract.inject() }
 const bundle = () => r.draw(row.Component, props)
 const boot = () => { const element = visit(bundle(), node => node.props?.key === 'boot')[0]; return r.draw(element.type, element.props) }
 const button = (id, tree = boot()) => { const element = visit(tree, node => node.props?.['data-testid'] === id)[0]; assert.ok(element, `Missing ${id}`); return element }
 return { calls, bundle, boot, button, dispose, target, t }
}
for (const language of ['zh', 'en']) {
 test(`master switch ${language}: preview lists exact targets, cancel never applies, confirmation writes only one server token and hides stale settings`, async () => {
  const f = await harness(language)
  f.boot(); await tick()
  assert.ok(visit(f.bundle(), node => node.props?.key === 'settings').length)
  f.button('boot-enable').props.onClick(); await tick()
  const planned = f.boot()
  assert.match(text(planned), /preset:standard/)
  assert.ok(text(planned).includes(f.target.previousModule))
  assert.ok(text(planned).includes(f.target.moduleName))
  assert.equal(visit(planned, node => node.type === 'tbody')[0].children[0].length, 1)
  assert.ok(text(planned).includes(f.t('boot.enableIntro')))
  assert.equal(text(planned).includes(f.t('boot.restoreIntro')), false)
  assert.equal(text(planned).includes(f.t('boot.uninstall')), false)
  assert.ok(text(planned).includes(f.t('boot.restart')))
  assert.ok(text(planned).includes(f.t('boot.warning.fixed-state-not-history-restore')))
  f.button('boot-cancel', planned).props.onClick()
  assert.equal(f.calls.filter(call => call.apply).length, 0)
  assert.equal(visit(f.boot(), node => node.type === 'test-host-modal').length, 0)
  f.button('boot-enable').props.onClick(); await tick()
  f.button('boot-confirm').props.onClick(); await tick()
  assert.deepEqual(f.calls.filter(call => call.apply), [{ apply: TOKEN }])
  assert.ok(text(f.boot()).includes(f.t('boot.saved')))
  assert.equal(visit(f.bundle(), node => node.props?.key === 'settings').length, 0)
  assert.ok(text(f.bundle()).includes(f.t('boot.restartBeforeSettings')))
  await f.dispose()
 })
}
test('master switch refuses a failed confirmation without claiming enabled or hiding the preferences', async () => {
 const f = await harness('zh', true)
 f.boot(); await tick(); f.button('boot-enable').props.onClick(); await tick(); f.button('boot-confirm').props.onClick(); await tick()
 assert.ok(text(f.boot()).includes('configuration-changed-review-again'))
 assert.ok(!text(f.boot()).includes(f.t('boot.saved')))
 assert.equal(visit(f.bundle(), node => node.props?.key === 'settings').length, 1)
 assert.equal(visit(f.boot(), node => node.type === 'test-host-modal').length, 0)
 await f.dispose()
})
