import { createHash } from 'node:crypto'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'

const repository = 'Sieuno/dsh-native-collab'
const tag = process.argv[2]
if (!/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag ?? '')) {
  throw new Error('Usage: node scripts/publish-release.mjs vX.Y.Z')
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
const publishArgs = ['publish', filename, '--access', 'public', '--ignore-scripts', '--registry', 'https://registry.npmjs.org/']
// Accounts with two-factor auth for writes need the current code; it is read from the
// environment so it never lands in a shell history file or this script.
const otp = process.env.NPM_OTP?.trim()
if (otp) {
  if (!/^\d{6,8}$/.test(otp)) throw new Error('NPM_OTP must be the current one-time password digits')
  publishArgs.push('--otp', otp)
}
if (process.platform === 'win32') {
  // Node refuses to spawn .cmd shims without a shell on Windows, so run the npm CLI
  // bundled next to the current Node binary instead of resolving `npm.cmd`.
  command(process.execPath, [join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'), ...publishArgs])
} else {
  command('npm', publishArgs)
}
