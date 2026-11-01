import { dirname, extname, isAbsolute, join, resolve, win32 } from 'node:path'

/** Explicit opt-in only: never install or discover another package manager. */
export function parsePublishOptions(argv) {
  const [tag, ...options] = argv
  if (!/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag ?? '')) {
    throw new Error('Usage: node scripts/publish-release.mjs vX.Y.Z [--pnpm-cli <existing pnpm JS entry>]')
  }
  if (options.length === 0) return { tag, pnpmCli: null }
  if (options.length !== 2 || options[0] !== '--pnpm-cli' || !options[1] || options[1].startsWith('-')) {
    throw new Error('Only --pnpm-cli <existing pnpm JS entry> is supported')
  }
  const pnpmCli = resolve(options[1])
  if (!['.js', '.cjs', '.mjs'].includes(extname(pnpmCli))) throw new Error('pnpm CLI must be an existing JavaScript entry')
  return { tag, pnpmCli }
}

/** Choose an executable, not a shell; publish the supplied verified TGZ only. */
export function publicationCommand({ execPath, platform, filename, pnpmCli = null, otp = '' }) {
  if (!isAbsolute(filename) || extname(filename) !== '.tgz') throw new Error('An absolute verified TGZ path is required')
  if (otp && !/^\d{6,8}$/.test(otp)) throw new Error('NPM_OTP must be the current one-time password digits')
  const args = ['publish', filename, '--access', 'public', '--ignore-scripts', '--registry', 'https://registry.npmjs.org/']
  if (otp) args.push('--otp', otp)
  if (pnpmCli) {
    if (!isAbsolute(pnpmCli)) throw new Error('pnpm CLI path must be absolute')
    return { program: execPath, args: [pnpmCli, ...args] }
  }
  if (platform === 'win32') {
    return { program: execPath, args: [win32.join(win32.dirname(execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'), ...args] }
  }
  return { program: 'npm', args }
}

export function pnpmManifestPath(pnpmCli) {
  return join(dirname(pnpmCli), '..', 'package.json')
}
