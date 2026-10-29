import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { sourceContract } from './source-contract-fixture.mjs'
import { createRequire, registerHooks } from 'node:module'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageName = '@sieuno/dsh-native-collab'
const officialRoot = process.env.DSH_OFFICIAL_SOURCE_ROOT
if (!officialRoot) throw new Error('DSH_OFFICIAL_SOURCE_ROOT must point to the read-only official DSH source checkout')
const require = createRequire(import.meta.url)
const ts = require('typescript')
const officialSiblingPath = join(officialRoot, 'packages/test-support/client-runtime/src/assembly/roster.ts')
const manifestPath = join(officialRoot, 'packages/client/modules/src/client/manifest.ts')
const { rosterSource: source } = await sourceContract(officialRoot)
const initializerStart = source.indexOf("\nconst webProfileServices: Readonly<Record<string, object | undefined>> = { profileContext: { name: 'web' } }")
assert.notEqual(initializerStart, -1)
assert.deepEqual(source.slice(initializerStart).trimEnd().split(/\r?\n/), [
  '',
  "const webProfileServices: Readonly<Record<string, object | undefined>> = { profileContext: { name: 'web' } }",
  '',
  '/** The `web` profile\'s browser roster, composed with its profile name and no business Host services. */',
  'export const webApp: ClientRoster = bundleRoster(WEB_PROFILE_BUNDLES, undefined, {',
  '  get: (name: string) => webProfileServices[name],',
  '})',
])

test('official bundleRoster discovers the active bare root and excludes disabled and subpath rows', async () => {
  const artifacts = process.env.DSH_TEST_ARTIFACTS || join(root, '.test-artifacts')
  await mkdir(artifacts, { recursive: true })
  const temp = await mkdtemp(join(artifacts, 'client-discovery-'))
  let hooks
  try {
    // Only the eagerly composed web profile is removed; both source files are otherwise verbatim.
    const adapter = join(temp, 'bundle-roster.ts')
    await writeFile(adapter, `${source.slice(0, initializerStart).trimEnd()}\n`)
    await writeFile(join(temp, 'roster.ts'), await readFile(officialSiblingPath, 'utf8'))
    const aliases = new Map(Object.entries({
      '@deepseek-ai/cordis-plugin-loader': join(officialRoot, 'vendor/loader/src/index.ts'),
      '@deepseek-ai/cordis-plugin-include': join(officialRoot, 'vendor/include/src/index.ts'),
      '@deepseek-ai/dsh-client-modules/client': manifestPath,
      '@deepseek-ai/dsh-client-web/src/platform.ts': join(officialRoot, 'packages/client/web/src/platform.ts'),
      '@deepseek-ai/cordis': join(officialRoot, 'vendor/cordis/src/index.ts'),
      '@deepseek-ai/cosmokit': require.resolve('@deepseek-ai/cosmokit', { paths: [dirname(require.resolve('@deepseek-ai/cordis'))] }),
      'js-yaml': require.resolve('js-yaml'),
    }))
    // Transpile actual TypeScript modules in memory; aliases map to actual official sources or installed packages.
    hooks = registerHooks({
      resolve(specifier, context, nextResolve) {
        if (aliases.has(specifier)) return nextResolve(pathToFileURL(aliases.get(specifier)).href, context)
        return nextResolve(specifier, context)
      },
      load(url, context, nextLoad) {
        if (!url.startsWith('file:') || !url.endsWith('.ts')) return nextLoad(url, context)
        const result = nextLoad(url, context)
        return { format: 'module', shortCircuit: true, source: ts.transpileModule(String(result.source), {
          fileName: fileURLToPath(url), compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
        }).outputText }
      },
    })
    const { bundleRoster } = await import(pathToFileURL(adapter).href)
    const officialManifest = await import(pathToFileURL(manifestPath).href)
    const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
    const patchText = await readFile(join(root, 'cordis.patch.yml'), 'utf8')
    const installed = join(temp, 'node_modules', '@sieuno', 'dsh-native-collab')
    await mkdir(installed, { recursive: true })
    await writeFile(join(installed, 'package.json'), JSON.stringify(manifest))
    await writeFile(join(installed, 'cordis.patch.yml'), patchText)
    const base = join(temp, 'node_modules', '@fixture', 'base')
    await mkdir(base, { recursive: true })
    await writeFile(join(base, 'package.json'), JSON.stringify({ name: '@fixture/base', dsh: { bundle: { patch: './patch.json' } } }))
    const anchors = [
      ['subagent', '@deepseek-ai/dsh-subagent'],
      ['agent-team', '@deepseek-ai/dsh-experimental-agent-team'],
      ['tool-agent-team', '@deepseek-ai/dsh-experimental-tool-agent-team'],
      ...['standard', 'minimal', 'ptc', 'cordis'].map(name => [`preset-${name}`, '@deepseek-ai/dsh-agent-preset']),
      ...['subagent', 'agent-team', 'tool-agent-team', 'tool-subagent-control', 'tool-subagent-list-agents', 'tool-subagent', 'tool-subagent-fork'].map((id, i) => [
        `dsh-native-collab-${id}`,
        `${packageName}/${['subagent', 'agent-team', 'tool-agent-team', 'tool-subagent-control', 'tool-subagent-control/list-agents', 'tool-subagent', 'tool-subagent/fork'][i]}`,
      ]),
    ]
    const baseRows = anchors.map(([id, name]) => ({ id, name, disabled: true }))
    baseRows.push({ id: 'enabled-subpath', name: `${packageName}/subagent`, disabled: false })
    baseRows.push({ id: 'disabled-bare', name: '@fixture/not-installed', disabled: true })
    await writeFile(join(base, 'patch.json'), JSON.stringify([{ insert: baseRows }]))
    const anchor = join(temp, 'anchor.mjs')
    await writeFile(anchor, '')
    const context = { [Symbol.for('cordis.entry')]: { parent: { data: [{ id: 'dsh-native-collab-ui', name: packageName, disabled: false }] } } }
    const roster = bundleRoster(['@fixture/base', packageName], anchor, context)
    assert.deepEqual(roster.rows, [{ name: packageName, inject: manifest.dsh.client.inject, immediately: true }])
    assert.equal(officialManifest.exactPackageSpecifier(`${packageName}/subagent`), undefined)
    assert.deepEqual(officialManifest.parseDshClient(packageName, manifest.dsh.client), manifest.dsh.client)
    assert.equal(manifest.exports['.'], './dist/agent-team/bootstrap.js')
    assert.equal(manifest.exports['./client'], './dist/client.js')
    await stat(join(root, manifest.exports['.']))
    await stat(join(root, manifest.exports['./client']))
    hooks.deregister()
    hooks = undefined
    const rootPlugin = await import(pathToFileURL(join(root, manifest.exports['.'])).href)
    assert.equal(rootPlugin.default?.name, 'CollabUiService')
  } finally {
    hooks?.deregister()
    await rm(temp, { recursive: true, force: true })
  }
})
