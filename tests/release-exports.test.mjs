import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkRoleExports } from '../scripts/check-release.mjs'
import { ASSEMBLY_ROLES } from '../dist/agent-team/assembly-layout.js'

const packageName = '@sieuno/dsh-native-collab'
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

test('release check rejects wrong existing targets and missing role exports', async () => {
  assert.deepEqual(checkRoleExports(manifest, ASSEMBLY_ROLES), [])
  const cases = [
    ['./subagent', './dist/agent-team/index.js', 'dist/agent-team/index.js'],
    ['./subagent/icon', './icons/agent-team.svg', 'icons/agent-team.svg'],
    ['./subagent/locale/*.json', './packages/agent-team/locale/*.json', 'packages/agent-team/locale/en.json'],
  ]
  for (const [key, wrong, existing] of cases) {
    await stat(join(root, existing))
    const altered = structuredClone(manifest)
    altered.exports[key] = wrong
    assert.ok(checkRoleExports(altered, ASSEMBLY_ROLES).some(issue => issue.includes(`export mapping mismatch for ${key}:`)), key)
    delete altered.exports[key]
    assert.ok(checkRoleExports(altered, ASSEMBLY_ROLES).some(issue => issue.includes(`export mapping mismatch for ${key}:`)), `missing ${key}`)
  }
  assert.ok(checkRoleExports(manifest, ASSEMBLY_ROLES.slice(1)).some(issue => issue.includes('assembly role modules')))
})

test('default patch declares exactly one management anchor with non-insert startup overrides', async () => {
  assert.equal(manifest.dsh?.bundle?.patch, './cordis.patch.yml')
  const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  const { parse } = await import('yaml')
  const parsed = parse(patch, { customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: value => ({ __jsExpr: value }) }] })
  const inserted = parsed.flatMap(row => row.insert ?? [])
  assert.equal(inserted.length, 1)
  assert.deepEqual(inserted[0], { id: 'dsh-native-collab-ui', name: packageName, disabled: false, config: { runtimeMode: 'managed' } })
  assert.equal(parsed.filter(row => row.inject?.includes('subagents')).length, 4)
  assert.equal(parsed.filter(row => row.disabled?.__jsExpr).length, 3)
})

test('publication metadata, lockfile, and packaging controls preserve public runtime identity', async () => {
  const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'))
  assert.equal(manifest.name, packageName)
  assert.match(manifest.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/)
  assert.equal(lock.version, manifest.version)
  assert.equal(lock.packages[''].version, manifest.version)
  assert.notEqual(manifest.private, true)
  assert.equal(manifest.publishConfig.access, 'public')
  assert.equal(manifest.publishConfig.registry, 'https://registry.npmjs.org/')
  assert.equal(manifest.engines.node, '>=22.19.0')
  assert.equal(manifest.engines.dsh, '>=0.2.1-rc.1 <0.2.2-0 || >=0.2.2-0 <0.2.3-0')
  for (const key of ['engines', 'peerDependencies', 'peerDependenciesMeta']) assert.deepEqual(lock.packages[''][key], manifest[key])
  assert.equal(manifest.scripts['validate:package'], 'node scripts/check-release.mjs')
  for (const file of ['docs/INSTALL.md', 'docs/FAQ.md', 'TESTING.md', 'CONTRIBUTING.md']) assert.ok(manifest.files.includes(file))
  for (const file of ['HANDOFF.md', '.npmrc']) assert.ok(!manifest.files.includes(file))
  const npmrc = (await readFile(new URL('../.npmrc', import.meta.url), 'utf8')).trim().split(/\r?\n/)
  assert.deepEqual(npmrc, ['auto-install-peers=false', 'verify-deps-before-run=false', 'ignore-scripts=true'])
  assert.ok(!/(?:_authToken|password|registry|https?:)/i.test(npmrc.join('\n')))
})

test('all declared exports and generated JavaScript modules exist in the distribution', async () => {
  for (const target of Object.values(manifest.exports)) {
    if (typeof target === 'string' && target.startsWith('./') && !target.includes('*')) await stat(join(root, target))
  }
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true })
    return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]))).flat()
  }
  const emitted = (await walk(join(root, 'dist'))).filter(file => file.endsWith('.js'))
  const sources = (await walk(join(root, 'packages'))).filter(file => file.endsWith('.ts') && !file.endsWith('.d.ts') && /[\\/]src[\\/]/.test(file))
  assert.equal(emitted.length, sources.length + 1)
  assert.equal(manifest.exports['./client'], './dist/client.js')
  assert.equal(manifest.dsh.client.platform, 'web')
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

test('retired root-only generator refuses without emitting partial configuration', async () => {
  const out = await mkdtemp(join(tmpdir(), 'dsh-native-collab-retired-overlays-'))
  try {
    const result = spawnSync(process.execPath, [join(root, 'scripts/make-overlays.mjs'), '--out', out], { stdio: 'inherit' })
    assert.equal(result.status, 2)
    const { readdir } = await import('node:fs/promises')
    assert.deepEqual(await readdir(out), [])
  } finally { await rm(out, { recursive: true, force: true }) }
})

test('release waits for shared gates and preserves read-only checkout credentials', async () => {
  const { parse } = await import('yaml')
  assert.match(await readFile(join(root, '.gitattributes'), 'utf8'), /^\* text=auto eol=lf$/m)
  const workflow = parse(await readFile(join(root, '.github/workflows/release.yml'), 'utf8'))
  assert.equal(workflow.jobs.checks.uses, './.github/workflows/checks.yml')
  assert.equal(workflow.jobs.checks.permissions.contents, 'read')
  assert.equal(workflow.jobs.release.needs, 'checks')
  const checkout = workflow.jobs.release.steps.find(step => step.uses === 'actions/checkout@v4')
  assert.equal(checkout.with['persist-credentials'], false)
  const checks = parse(await readFile(join(root, '.github/workflows/checks.yml'), 'utf8'))
  for (const command of ['npm test', 'npm run check:types', 'npm run check:load', 'npm run test:sdk']) {
    assert.ok(Object.values(checks.jobs).flatMap(job => job.steps ?? []).some(step => step.run === command), command)
  }
  assert.equal(checks.jobs['source-contracts'].uses, './.github/workflows/source-contracts.yml')
})

test('release notes select only the exact version section and reject prefix collisions', async () => {
  const { parse } = await import('yaml')
  const { runInNewContext } = await import('node:vm')
  const workflow = parse(await readFile(join(root, '.github/workflows/release.yml'), 'utf8'))
  const step = workflow.jobs.release.steps.find(step => step.name === '生成 TGZ 和发布说明')
  const snippet = /node --input-type=module -e '([\s\S]*?)\n\s*'/.exec(step.run)?.[1]
  assert.ok(snippet, 'execute the actual release-note generator, without its shell or pack command')
  const program = snippet.replace('import fs from "node:fs";', '')
  assert.notEqual(program, snippet)
  const render = (version, changelog) => {
    let notes
    runInNewContext(program, {
      fs: {
        readFileSync(file) {
          if (file === 'package.json') return JSON.stringify({ version })
          assert.equal(file, 'CHANGELOG.md')
          return changelog
        },
        writeFileSync(file, body) { assert.equal(file, 'release-notes.md'); notes = body },
      },
      process: { env: { GITHUB_REF_NAME: 'v' + version } },
    })
    return notes
  }
  for (const heading of ['0.3.0', '0.3.0（2026-10-28）', '0.3.0 (2026-10-28)', '0.3.0 release']) {
    const notes = render('0.3.0', '## 0.3.0-rc.1\nwrong prerelease\n## ' + heading + '\nwanted\n## 0.2.0\nolder')
    assert.match(notes, /wanted/)
    assert.doesNotMatch(notes, /wrong prerelease|older/)
  }
  for (const heading of ['0.3.0-rc.1', '0.3.01', '0.3.0+build.1', '0x3x0']) {
    assert.throws(() => render('0.3.0', '## ' + heading + '\nwrong'), /Missing changelog section: 0.3.0/)
  }
  assert.match(render('0.3.0-rc.1', '## 0.3.0-rc.1\nprerelease'), /prerelease/)
})
