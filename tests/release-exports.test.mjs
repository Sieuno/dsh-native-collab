import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageName = '@dsh-native-collab/derived'
const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const modules = [
  ['agent-team', 'dsh-native-collab-agent-team', './dist/agent-team/index.js', './icons/agent-team.svg'],
  ['subagent', 'dsh-native-collab-subagent', './dist/subagent/index.js', './icons/subagent.svg'],
  ['tool-agent-team', 'dsh-native-collab-tool-agent-team', './dist/tool-agent-team/index.js', './icons/tool-agent-team.svg'],
  ['tool-subagent-control', 'dsh-native-collab-tool-subagent-control', './dist/tool-subagent-control/index.js', './icons/tool-subagent-control.svg'],
  ['tool-subagent-control/list-agents', 'dsh-native-collab-tool-subagent-list-agents', './dist/tool-subagent-control/list-agents.js', './icons/tool-subagent-list-agents.svg'],
  ['tool-subagent', 'dsh-native-collab-tool-subagent', './dist/tool-subagent/index.js', './icons/tool-subagent.svg'],
  ['tool-subagent/fork', 'dsh-native-collab-tool-subagent-fork', './dist/tool-subagent/fork.js', './icons/tool-subagent-fork.svg'],
]
async function resolvesTo(specifier, target) {
  const resolved = import.meta.resolve(specifier ? `${packageName}/${specifier}` : packageName)
  assert.equal(fileURLToPath(resolved), fileURLToPath(new URL(`../${target.replace(/^\.\//, '')}`, import.meta.url)))
  await stat(fileURLToPath(resolved))
}

test('public runtime, locale and icon export paths resolve to shipped files', async () => {
  await resolvesTo('', './dist/agent-team/bootstrap.js')
  await resolvesTo('cordis.patch.yml', './cordis.patch.yml')
  await resolvesTo('icon', './icons/subagent.svg')
  await resolvesTo('subagent/internal', './dist/subagent/internal.js')
  for (const [module, , runtime, icon] of modules) {
    await resolvesTo(module, runtime)
    await resolvesTo(`${module}/icon`, icon)
    for (const lang of ['en', 'zh']) {
      const expected = module === 'tool-subagent-control/list-agents'
        ? `./packages/tool-subagent-control/locale/list-agents/${lang}.json`
        : module === 'tool-subagent/fork'
          ? `./packages/tool-subagent/locale/fork/${lang}.json`
          : `./packages/${module}/locale/${lang}.json`
      await resolvesTo(`${module}/locale/${lang}.json`, expected)
      const locale = JSON.parse(await readFile(new URL(`../${expected.replace(/^\.\//, '')}`, import.meta.url), 'utf8'))
      assert.ok(locale.meta?.title?.trim(), `${module}/${lang}: meta.title`)
      assert.ok(locale.meta?.description?.trim(), `${module}/${lang}: meta.description`)
    }
  }
  for (const lang of ['en', 'zh']) await resolvesTo(`locale/${lang}.json`, `./locale/${lang}.json`)
})

test('default patch activates only the bare UI anchor and keeps five feature rows disabled', async () => {
  assert.equal(manifest.dsh?.bundle?.patch, './cordis.patch.yml')
  const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  const entries = [...patch.matchAll(/- id: "([^"]+)"\s*\n\s+name: "([^"]+)"\s*\n\s+disabled: (\w+)/g)]
  assert.equal(entries.length, 8)
  const anchor = entries.find(([, id]) => id === 'dsh-native-collab-ui')
  assert.ok(anchor)
  assert.equal(anchor[2], packageName)
  assert.equal(anchor[3], 'false')
  for (const [module, id] of modules.map(([module, id]) => [module, id])) {
    const entry = entries.find(([, actualId]) => actualId === id)
    assert.ok(entry, `patch row ${id}`)
    assert.equal(entry[2], `@dsh-native-collab/derived/${module}`)
    assert.equal(entry[3], 'true', `${id} must default disabled`)
  }
})

test('runtime and host peer dependency declarations avoid duplicate host core', () => {
  assert.equal(manifest.dependencies?.zod, '4.4.3')
  assert.equal(manifest.devDependencies?.typescript, '5.9.3')
  assert.ok(manifest.peerDependencies?.['@deepseek-ai/cordis'])
  assert.ok(manifest.peerDependencies?.['@deepseek-ai/schemastery'])
  for (const name of Object.keys(manifest.peerDependencies ?? {})) assert.equal(manifest.peerDependenciesMeta?.[name]?.optional, true, `${name} is optional`)
  assert.equal('bundleDependencies' in manifest, false)
  assert.equal('bundledDependencies' in manifest, false)
})

test('manual next-start overlays still contain only the five feature rows', async () => {
  const out = await mkdtemp(join(tmpdir(), 'dsh-native-collab-overlays-'))
  try {
    const result = spawnSync(process.execPath, [join(root, 'scripts/make-overlays.mjs'), '--out', out], { stdio: 'inherit' })
    assert.equal(result.status, 0, result.stderr)
    const expected = [
      ['subagent', 'dsh-native-collab-subagent'],
      ['tool-subagent-control', 'dsh-native-collab-tool-subagent-control'],
      ['tool-subagent-list-agents', 'dsh-native-collab-tool-subagent-list-agents'],
      ['agent-team', 'dsh-native-collab-agent-team'],
      ['tool-agent-team', 'dsh-native-collab-tool-agent-team'],
    ]
    for (const [file, enabled] of [['root-enable.example.patch.yml', true], ['root-restore.example.patch.yml', false]]) {
      const text = await readFile(join(out, file), 'utf8')
      const rows = [...text.matchAll(/- id: "([^"]+)"\s*\n\s+disabled: (true|false)/g)]
      assert.equal(rows.length, 10, `${file} must contain five native/feature pairs`)
      for (let i = 0; i < expected.length; i += 1) {
        const [nativeId, featureId] = expected[i]
        assert.equal(rows[i * 2][1], nativeId)
        assert.equal(rows[i * 2][2], enabled ? 'true' : 'false')
        assert.equal(rows[i * 2 + 1][1], featureId)
        assert.equal(rows[i * 2 + 1][2], enabled ? 'false' : 'true')
      }
      assert.ok(!text.includes('dsh-native-collab-ui'), 'UI bootstrap row must not be included in overlays')
    }
  } finally {
    await rm(out, { recursive: true, force: true })
  }
})
