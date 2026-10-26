import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
test('release metadata is pinned for public npm publication', () => {
  assert.equal(pkg.name, '@sieuno/dsh-native-collab')
  assert.equal(pkg.version, '0.2.1')
  assert.notEqual(pkg.private, true)
  assert.equal(pkg.publishConfig.access, 'public')
  assert.equal(pkg.publishConfig.registry, 'https://registry.npmjs.org/')
  assert.equal(pkg.engines.node, '>=22.19.0')
  assert.equal(pkg.engines.dsh, '>=0.2.1-rc.1 <0.2.2-0')
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(pkg.dependencies.zod, '4.4.3')
  assert.equal(pkg.devDependencies.typescript, '5.9.3')
  for (const peer of Object.keys(pkg.peerDependencies)) assert.equal(pkg.peerDependenciesMeta[peer]?.optional, true)
})
test('staging package metadata adds only packaging controls while preserving runtime identity', async () => {
  assert.equal(pkg.scripts['validate:package'], 'node scripts/check-release.mjs')
  assert.ok(pkg.files.includes('docs/INSTALL.md'))
  assert.ok(pkg.files.includes('docs/FAQ.md'))
  assert.ok(!pkg.files.includes('TESTING.md'))
  assert.ok(!pkg.files.includes('HANDOFF.md'))
  assert.ok(!pkg.files.includes('.npmrc'))
  const npmrc = (await readFile(join(root, '.npmrc'), 'utf8')).trim().split(/\r?\n/)
  assert.deepEqual(npmrc, ['auto-install-peers=false', 'verify-deps-before-run=false', 'ignore-scripts=true'])
  assert.ok(!/(?:_authToken|password|registry|https?:)/i.test(npmrc.join('\n')))
})
test('runtime subpath exports resolve to included files', async () => {
  for (const target of Object.values(pkg.exports)) {
    if (typeof target === 'string' && target.startsWith('./') && !target.includes('*')) {
      await readFile(join(root, target))
    }
  }
})
test('discovered host modules plus browser client entry are present', async () => {
  async function walk(dir) { let result=[]; for (const e of await readdir(dir,{withFileTypes:true})) { const p=join(dir,e.name); result.push(...(e.isDirectory()?await walk(p):[p])) } return result }
  const js = (await walk(join(root,'dist'))).filter(f=>f.endsWith('.js')).map(file => file.replaceAll('\\', '/'))
  const sources = (await walk(join(root,'packages'))).filter(file => file.endsWith('.ts') && !file.endsWith('.d.ts') && /[\\/]src[\\/]/.test(file))
  assert.equal(js.length, sources.length + 1)
  for (const file of ['dist/client.js', 'dist/tool-subagent/delegation.js', 'dist/tool-subagent/fork.js', 'dist/agent-team/own-model.js']) {
    assert.equal(js.some(item => item.endsWith(file)), true, file)
  }
  assert.equal(pkg.exports['./client'], './dist/client.js')
  assert.equal(pkg.dsh.client.platform, 'web')
})
test('bundle patch activates the bare UI anchor and keeps feature IDs disabled', async () => {
  const patch = await readFile(join(root,'cordis.patch.yml'),'utf8')
  const entries = [...patch.matchAll(/- id: "([^"]+)"\s*\n\s+name: "([^"]+)"\s*\n\s+disabled: (\w+)/g)]
  assert.equal(entries.length, 8)
  for (const id of ['dsh-native-collab-tool-subagent', 'dsh-native-collab-tool-subagent-fork']) {
    assert.equal(entries.find(entry => entry[1] === id)?.[3], 'true')
  }
  const anchor = entries.find(entry => entry[1] === 'dsh-native-collab-ui')
  assert.ok(anchor)
  assert.equal(anchor[2], '@sieuno/dsh-native-collab')
  assert.equal(anchor[3], 'false')
  const features = entries.filter(entry => entry[1] !== 'dsh-native-collab-ui')
  assert.ok(features.every(entry => entry[3] === 'true'))
  assert.ok(features.every(entry => entry[2].startsWith('@sieuno/dsh-native-collab/')))
})
