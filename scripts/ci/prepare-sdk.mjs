/** Install the lockfile-backed public SDK, never a Host or fabricated module. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { access, lstat, mkdir, readFile, realpath, rm, symlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { SDK_TARGETS } from '../host-compatibility.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const args = process.argv.slice(2)
let target = 'rc2', install = true
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--no-install') install = false
  else if (args[i] === '--target' && args[i + 1]) target = args[++i]
  else throw new Error('Usage: node scripts/ci/prepare-sdk.mjs [--target <reviewed-target>] [--no-install]')
}
assert(Object.hasOwn(SDK_TARGETS, target), 'Unknown SDK target: ' + target)
const lane = SDK_TARGETS[target]
const sdk = join(root, lane.sdkDirectory)
const sdkModules = join(sdk, 'node_modules')
const rootModules = join(root, 'node_modules')
const forbidden = ['@deepseek-ai/dsh-settings', '@deepseek-ai/dsh-config-editor', '@deepseek-ai/dsh-app-boot']
const manifest = JSON.parse(await readFile(join(sdk, 'package.json'), 'utf8'))
const lock = JSON.parse(await readFile(join(sdk, 'package-lock.json'), 'utf8'))
for (const [name, version] of Object.entries(manifest.dependencies)) {
  assert(/^\d+\.\d+\.\d+(?:-[\w.]+)?$/.test(version), `Not an exact SDK version: ${name}`)
  assert.equal(lock.packages[''].dependencies[name], version)
}
// Some real SDK packages depend on app-boot internally; never link Host packages
// at the repository root, where integration tests require MODULE_NOT_FOUND.
for (const name of forbidden) assert(!Object.hasOwn(manifest.dependencies, name), `Do not expose Host package: ${name}`)

for (const [name, version] of Object.entries(manifest.dependencies)) {
  if (name.startsWith('@deepseek-ai/dsh-')) assert.equal(version, lane.version, 'Mixed SDK line: ' + name)
}
for (const [name, version] of Object.entries({ '@deepseek-ai/cordis': lane.cordis, '@deepseek-ai/cordis-plugin-loader': lane.loader, '@deepseek-ai/schemastery': lane.schemastery })) {
  assert.equal(manifest.dependencies[name], version, 'Incorrect singleton/loader version: ' + name)
}
if (lane.execution === 'batch') assert.equal(manifest.dependencies['@deepseek-ai/dsh-tool-executor-native'], lane.version)

if (install) {
  const npmArgs = ['ci', '--prefix', sdk, '--cache', join(sdk, '.npm-cache'), '--ignore-scripts', '--legacy-peer-deps', '--no-audit', '--no-fund', '--fetch-timeout=30000', '--fetch-retries=1']
  let command = 'npm', commandArgs = npmArgs
  if (process.platform === 'win32') {
    const cli = process.env.npm_execpath || join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
    await access(cli)
    command = process.execPath
    commandArgs = [cli, ...npmArgs]
  }
  await new Promise((accept, reject) => {
    const child = spawn(command, commandArgs, { cwd: root, env: process.env, stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code, signal) => code === 0 ? accept() : reject(new Error(`npm ci failed: ${signal ?? code}`)))
  })
}

// Expose direct SDK requirements only, not transitive packages or Host peers.
// Existing packages can be replaced only when their name/version matches.
await mkdir(rootModules, { recursive: true })
for (const [name, version] of Object.entries(manifest.dependencies)) {
  const source = join(sdkModules, name)
  const installed = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'))
  assert.equal(installed.name, name)
  assert.equal(installed.version, version)
  const target = join(rootModules, name)
  await mkdir(dirname(target), { recursive: true })
  let current
  try { current = await lstat(target) } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (current) {
    if (current.isSymbolicLink() && await realpath(target) === await realpath(source) && realpathSync(target) === realpathSync(source)) continue
    const previous = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'))
    assert.equal(previous.name, name, `Refusing to replace unrelated package: ${target}`)
    assert.equal(previous.version, version, `Run clean root npm ci first; refusing another version: ${target}`)
    await rm(target, { recursive: !current.isSymbolicLink(), force: true })
  }
  if (process.platform === 'win32') {
    // Native PowerShell junctions need no symlink privilege and retain proper
    // DOS-drive targets; libuv junctions can produce unresolvable Global\Z paths.
    await new Promise((accept, reject) => {
      const child = spawn('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command',
        'New-Item -ItemType Junction -Path $env:DSH_CI_LINK_TARGET -Target $env:DSH_CI_LINK_SOURCE -ErrorAction Stop | Out-Null'], {
        cwd: root, stdio: 'inherit',
        env: { ...process.env, DSH_CI_LINK_TARGET: target, DSH_CI_LINK_SOURCE: source },
      })
      child.on('error', reject)
      child.on('exit', (code, signal) => code === 0 ? accept() : reject(new Error(`SDK junction failed: ${signal ?? code}`)))
    })
  } else {
    await symlink(relative(dirname(target), source), target, 'dir')
  }
}
const require = createRequire(join(root, 'package.json'))
const sdkRequire = createRequire(join(sdk, 'package.json'))
for (const name of forbidden) {
  assert.throws(() => require.resolve(name), { code: 'MODULE_NOT_FOUND' }, `Forbidden Host package is exposed: ${name}`)
}
for (const name of ['@deepseek-ai/cordis', '@deepseek-ai/schemastery', 'zod']) {
  const canonical = await realpath(require.resolve(name))
  assert.equal(await realpath(sdkRequire.resolve(name)), canonical, `Duplicate singleton: ${name}`)
  assert.equal(realpathSync(require.resolve(name)), realpathSync(sdkRequire.resolve(name)), `Node sync resolution duplicates singleton: ${name}`)
  for (const peer of Object.keys(manifest.dependencies).filter(item => item.startsWith('@deepseek-ai/'))) {
    const fromPeer = createRequire(join(sdkModules, peer, 'package.json'))
    assert.equal(await realpath(fromPeer.resolve(name)), canonical, `Duplicate ${name} from ${peer}`)
  }
}
for (const name of ['@deepseek-ai/dsh-tools', '@deepseek-ai/dsh-system-prompt', '@deepseek-ai/dsh-session-projection', '@deepseek-ai/dsh-scope']) {
  await import(pathToFileURL(require.resolve(name)).href)
}
console.log('Real pinned SDK ' + lane.version + ' ready; Cordis/Schemastery/zod are singletons; Host packages remain unresolvable.')
console.log('Types: npm run check:types')
