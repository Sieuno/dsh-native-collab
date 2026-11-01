import { createHash } from 'node:crypto'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { parsePublishOptions, pnpmManifestPath, publicationCommand } from './publish-command.mjs'

const repository = 'Sieuno/dsh-native-collab'
const { tag, pnpmCli } = parsePublishOptions(process.argv.slice(2))
if (pnpmCli) {
  const manager = JSON.parse(await readFile(pnpmManifestPath(pnpmCli), 'utf8'))
  // pnpm 11 publishes packed files directly; older releases may need an external npm.
  if (manager.name !== 'pnpm' || !/^\d+\./.test(manager.version) || Number(manager.version.split('.')[0]) < 11) {
    throw new Error('The explicitly selected entry must belong to an existing pnpm 11+ installation')
  }
  await readFile(pnpmCli)
}
function command(program, args, capture = false) {
  const result = spawnSync(program, args, { encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${program} failed; publication stopped`)
  return result.stdout
}
const release = JSON.parse(command('gh', ['release', 'view', tag, '--repo', repository, '--json', 'tagName,isDraft,assets'], true))
if (release.isDraft || release.tagName !== tag) throw new Error('A published matching GitHub Release is required')
const assets = release.assets.filter(asset => asset.name.endsWith('.tgz'))
if (assets.length !== 1) throw new Error('Release must contain exactly one TGZ installation package')
const asset = assets[0]
if (!/^sha256:[a-f0-9]{64}$/.test(asset.digest ?? '')) throw new Error('Missing GitHub asset SHA-256 digest')
const manifestResponse = JSON.parse(command('gh', ['api', `repos/${repository}/contents/package.json?ref=${encodeURIComponent(tag)}`], true))
const manifest = JSON.parse(Buffer.from(manifestResponse.content, 'base64').toString('utf8'))
if (manifest.name !== '@sieuno/dsh-native-collab' || `v${manifest.version}` !== tag) throw new Error('Tag and npm package identity do not match')
const directory = await mkdtemp(join(tmpdir(), 'dsh-native-collab-release-'))
command('gh', ['release', 'download', tag, '--repo', repository, '--pattern', asset.name, '--dir', directory])
const filename = join(directory, asset.name)
const data = await readFile(filename)
const digest = `sha256:${createHash('sha256').update(data).digest('hex')}`
if (digest !== asset.digest || data.length !== asset.size) throw new Error('Downloaded TGZ differs from GitHub Release asset')
console.log(`Publishing ${manifest.name}@${manifest.version} directly from GitHub Release ${tag}`)
console.log(`GitHub asset: ${asset.name}; ${digest}`)
// Publish this exact downloaded file. No npm pack, local build or folder fallback.
// Accounts with two-factor auth for writes may supply their current code via
// the environment; never store it in this script or print the command arguments.
const invocation = publicationCommand({
  execPath: process.execPath, platform: process.platform, filename, pnpmCli,
  otp: process.env.NPM_OTP?.trim() ?? '',
})
command(invocation.program, invocation.args)
