/** Contract-shaped test doubles only: not a browser, transport, or Host integration. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { ASSEMBLY_ROLES } from '../dist/agent-team/assembly-layout.js'

/** Mirror the build's two data injections when testing the source client. */
export async function clientSource({ emitted = false } = {}) {
  const source = await readFile(new URL(emitted ? '../dist/client.js' : '../packages/agent-team/client.js', import.meta.url), 'utf8')
  if (emitted) return source
  const locales = Object.fromEntries(await Promise.all(['en', 'zh'].map(async lang => [lang,
    JSON.parse(await readFile(new URL(`../locale/${lang}.json`, import.meta.url), 'utf8')).collabUi,
  ])))
  return source.replace('const UI_LOCALES = null', `const UI_LOCALES = ${JSON.stringify(locales)}`)
    .replace('const ASSEMBLY_LAYOUT = null', `const ASSEMBLY_LAYOUT = ${JSON.stringify(ASSEMBLY_ROLES)}`)
}

export async function clientModule(globals = {}, options = {}) {
  let spec
  runInNewContext(await clientSource(options), {
    setTimeout, clearTimeout, document: { activeElement: null }, ...globals,
    window: { __ModuleLoader__: { load(value) { spec = value } } },
  })
  return spec
}

export function visit(node, predicate, found = []) {
  if (Array.isArray(node)) node.forEach(child => visit(child, predicate, found))
  else if (node && typeof node === 'object') {
    if (predicate(node)) found.push(node)
    visit(node.children, predicate, found)
    visit(node.props?.children, predicate, found)
    visit(node.props?.footer, predicate, found)
  }
  return found
}

export function text(node) {
  if (Array.isArray(node)) return node.map(text).join('')
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  return node && typeof node === 'object' ? text(node.children) + text(node.props?.children) + text(node.props?.footer) : ''
}
export const primitives = { Button: 'button', Modal: 'test-host-modal' }
export const clientRequire = React => name => {
  if (name === 'react') return React
  if (name === '@deepseek-ai/dsh-client-ui-primitives') return primitives
  throw new Error(`Unexpected browser module ${name}`)
}
export function clientContext(context) {
  const remote = context.remote
  remote.$mount = async contribution => {
    assert.deepEqual(Array.from(contribution.services, item => item.namespace), ['collabUi'])
    assert.deepEqual(Array.from(contribution.descriptors, item => item.method), ['status'])
    const original = remote.collabUi
    remote.collabUi = Object.fromEntries(['status'].map(method => [method,
      async (...args) => ({ ok: true, value: await original[method](...args) }),
    ]))
    return () => { remote.collabUi = original }
  }
  context.locale ??= { register(namespace, dictionaries) {
    assert.equal(namespace, 'collabUi')
    assert.equal(typeof dictionaries.en.settingsTitle, 'string')
    assert.equal(typeof dictionaries.zh.settingsTitle, 'string')
    assert.equal(typeof dictionaries.en.lifecycleTitle, 'string')
    assert.equal(typeof dictionaries.zh.lifecycleTitle, 'string')
    assert.ok(Object.values(dictionaries.en).every(value => typeof value === 'string'), 'Host locale dictionaries are flat string maps')
    assert.ok(Object.values(dictionaries.zh).every(value => typeof value === 'string'))
    // The emitted bundle may predate a source change; boot/offline residue is
    // asserted against the source dictionaries in locale-coverage.test.mjs.
    return () => {}
  } }
  return context
}
export function schemaFields(dict) {
  Object.assign(dict, { runningChildGuidance: 'd', completedChildContinuation: 'e', teamRequestLimit: 'f' })
  return dict
}
