import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageName = '@sieuno/dsh-native-collab'
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const patchText = await readFile(join(root, 'cordis.patch.yml'), 'utf8')
const officialRoot = process.env.DSH_OFFICIAL_SOURCE_ROOT
if (!officialRoot) throw new Error('DSH_OFFICIAL_SOURCE_ROOT must point to the read-only official DSH source checkout')
const adapterEntry = process.env.DSH_CLIENT_ROSTER_ADAPTER_ENTRY
if (!adapterEntry) throw new Error('DSH_CLIENT_ROSTER_ADAPTER_ENTRY must point to the review-only official source adapter')
const officialRosterPath = join(officialRoot, 'packages/test-support/client-runtime/src/assembly/bundle-roster.ts')
const adapterRosterPath = fileURLToPath(adapterEntry)
const officialSource = await readFile(officialRosterPath, 'utf8')
const adapterSource = await readFile(adapterRosterPath, 'utf8')
const initializerStart = officialSource.indexOf("\nconst webProfileServices: Readonly<Record<string, object | undefined>> = { profileContext: { name: 'web' } }")
assert.notEqual(initializerStart, -1, 'official source must retain the reviewed initializer location')
const initializerLines = officialSource.slice(initializerStart).trimEnd().split(/\r?\n/)
assert.deepEqual(initializerLines, [
  '',
  "const webProfileServices: Readonly<Record<string, object | undefined>> = { profileContext: { name: 'web' } }",
  '',
  "/** The `web` profile's browser roster, composed with its profile name and no business Host services. */",
  'export const webApp: ClientRoster = bundleRoster(WEB_PROFILE_BUNDLES, undefined, {',
  '  get: (name: string) => webProfileServices[name],',
  '})',
])
const expectedAdapter = `${officialSource.slice(0, initializerStart).trimEnd()}\n`
assert.equal(createHash('sha256').update(officialSource).digest('hex'), 'bbbced22b0a0e5ea7053edd51f755995fe49b874a88215d56b808d54f1d730b8')
assert.equal(adapterSource, expectedAdapter)
const officialRosterSibling = join(officialRoot, 'packages/test-support/client-runtime/src/assembly/roster.ts')
assert.equal(await readFile(join(dirname(adapterRosterPath), 'roster.ts'), 'utf8'), await readFile(officialRosterSibling, 'utf8'))
const officialManifest = await import(pathToFileURL(join(officialRoot, 'packages/client/modules/src/client/manifest.ts')).href)
const { bundleRoster } = await import(adapterEntry)

test('official bundleRoster discovers the active bare root and excludes disabled subpath rows', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dsh-collab-discovery-'))
  try {
    const installed = join(temp, 'node_modules', '@dsh-native-collab', 'derived')
    await mkdir(installed, { recursive: true })
    await writeFile(join(installed, 'package.json'), JSON.stringify(manifest, null, 2))
    await writeFile(join(installed, 'cordis.patch.yml'), patchText)
    const anchor = join(temp, 'anchor.mjs')
    await writeFile(anchor, '')

    const roster = bundleRoster([packageName], anchor)
    assert.deepEqual(roster.rows, [{
      name: packageName,
      inject: manifest.dsh.client.inject,
      immediately: true,
    }])

    const rows = [...patchText.matchAll(/- id: "([^"]+)"\s*\n\s+name: "([^"]+)"\s*\n\s+disabled: (\w+)/g)]
    const anchorRow = rows.find(([, id]) => id === 'dsh-native-collab-ui')
    assert.ok(anchorRow)
    assert.equal(anchorRow[2], packageName)
    assert.equal(anchorRow[3], 'false')
    assert.equal(officialManifest.exactPackageSpecifier(anchorRow[2]), packageName)

    const features = rows.filter(([, id]) => id !== 'dsh-native-collab-ui')
    assert.equal(features.length, 7)
    assert.ok(features.every(([, , name, disabled]) => name.startsWith(`${packageName}/`) && disabled === 'true'))
    assert.ok(features.every(([, , name]) => officialManifest.exactPackageSpecifier(name) === undefined))

    assert.deepEqual(officialManifest.parseDshClient(packageName, manifest.dsh.client), manifest.dsh.client)
    assert.equal(manifest.exports['.'], './dist/agent-team/bootstrap.js')
    assert.equal(manifest.exports['./client'], './dist/client.js')
    await stat(join(root, manifest.exports['.']))
    await stat(join(root, manifest.exports['./client']))
    const rootPlugin = await import(pathToFileURL(join(root, manifest.exports['.'])).href)
    assert.equal(rootPlugin.default?.name, 'CollabUiService')
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test('generated manual overlays remain limited to five feature rows', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dsh-collab-overlay-'))
  try {
    const out = join(temp, 'out')
    const result = spawnSync(process.execPath, [join(root, 'scripts/make-overlays.mjs'), '--out', out], {
      cwd: root,
      stdio: 'inherit',
    })
    assert.equal(result.status, 0, result.stderr)
    for (const name of ['root-enable.example.patch.yml', 'root-restore.example.patch.yml']) {
      const text = await readFile(join(out, name), 'utf8')
      const ids = [...text.matchAll(/- id: "([^"]+)"/g)].map(match => match[1])
      assert.equal(ids.length, 10)
      assert.ok(!ids.includes('dsh-native-collab-ui'))
      assert.equal(ids.filter(id => id.startsWith('dsh-native-collab-')).length, 5)
    }
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})
