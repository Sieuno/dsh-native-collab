/** Build a declaration-only map for the isolated browser-panel type lane. */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SDK_TARGETS } from '../host-compatibility.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
let target = '', nodeModules = '', output = ''
const args = process.argv.slice(2)
for (let i = 0; i < args.length; i += 1) {
  const key = args[i], value = args[++i]
  if (!value) throw new Error(`Missing value for ${key}`)
  if (key === '--target') target = value
  else if (key === '--node-modules') nodeModules = resolve(value)
  else if (key === '--output') output = resolve(value)
  else throw new Error(`Unknown option ${key}`)
}
if (!(target in SDK_TARGETS) || !nodeModules) throw new Error('Provide a reviewed --target and --node-modules directory.')
output ||= join(root, '.test-artifacts/client-types', target + '-types-map.json')
const seenFiles = new Set()
const moduleNames = new Set()
const pending = [
  join(root, 'packages/agent-team/browser-panels/TeamAction.tsx'),
  join(root, 'packages/agent-team/browser-panels/SubagentHeaderLineage.tsx'),
  join(root, 'packages/agent-team/browser-panels/locales.ts'),
  join(root, 'packages/agent-team/browser-panels/css-modules.d.ts'),
]
while (pending.length) {
  const file = pending.pop()
  if (seenFiles.has(file)) continue
  seenFiles.add(file)
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(/(?:from\s*|import\s*|declare\s+module\s*)['\"](@deepseek-ai\/[^'\"]+)['\"]/g)) moduleNames.add(match[1])
  for (const match of source.matchAll(/(?:from\s*|import\s*)['\"]((?:\.\.?)\/[^'\"]+)['\"]/g)) {
    const imported = resolve(dirname(file), match[1])
    if (existsSync(imported) && /\.(?:ts|tsx)$/.test(imported)) pending.push(imported)
  }
}
const map = {}
const pendingModules = [...moduleNames].sort()
while (pendingModules.length) {
  const specifier = pendingModules.pop()
  if (map[specifier]) continue
  const segments = specifier.split('/')
  const packageName = segments.slice(0, 2).join('/')
  const subpath = segments.slice(2).join('/')
  const packageDir = join(nodeModules, packageName)
  const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
  const expectedVersion = packageName === '@deepseek-ai/cordis' ? SDK_TARGETS[target].cordis
    : packageName === '@deepseek-ai/schemastery' ? SDK_TARGETS[target].schemastery
      : packageName.startsWith('@deepseek-ai/dsh-') ? SDK_TARGETS[target].version : undefined
  if (expectedVersion !== undefined && manifest.version !== expectedVersion) {
    throw new Error(`${specifier}: expected ${expectedVersion}, found ${manifest.version}`)
  }
  const exportKey = subpath ? './' + subpath : '.'
  let declaration = manifest.exports?.[exportKey]
  if (declaration && typeof declaration === 'object') declaration = declaration.types ?? declaration.import?.types ?? declaration.default?.types
  if (typeof declaration !== 'string' && !subpath) declaration = manifest.types
  if (typeof declaration !== 'string' || !/\.d\.(?:ts|mts|cts)$/.test(declaration)) {
    throw new Error(`${specifier}: no published declaration export in ${join(packageDir, 'package.json')}`)
  }
  const file = resolve(packageDir, declaration)
  const source = readFileSync(file, 'utf8')
  map[specifier] = file
  // Verify and map every DeepSeek declaration dependency reachable from the
  // exported entry; skipLibCheck must not hide a missing Host/client contract.
  for (const match of source.matchAll(/(?:from\s*|import\s*|declare\s+module\s*)['\"](@deepseek-ai\/[^'\"]+)['\"]/g)) {
    if (!map[match[1]]) pendingModules.push(match[1])
  }
}
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify(map, null, 2) + '\n')
console.log(`${Object.keys(map).length} exact exported declaration modules mapped from ${target}: ${output}`)
