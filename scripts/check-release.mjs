import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { parse } from 'yaml'
import { ASSEMBLY_ROLES } from '../dist/agent-team/assembly-layout.js'

// Independent public contract: never derive expected targets from the manifest under test.
const expectedModules = {
  'agent-team': ['agent-team/index.js', 'agent-team.svg', 'agent-team/locale'],
  'subagent': ['subagent/index.js', 'subagent.svg', 'subagent/locale'],
  'tool-agent-team': ['tool-agent-team/index.js', 'tool-agent-team.svg', 'tool-agent-team/locale'],
  'tool-subagent-control': ['tool-subagent-control/index.js', 'tool-subagent-control.svg', 'tool-subagent-control/locale'],
  'tool-subagent-control/list-agents': ['tool-subagent-control/list-agents.js', 'tool-subagent-list-agents.svg', 'tool-subagent-control/locale/list-agents'],
  'tool-subagent': ['tool-subagent/index.js', 'tool-subagent.svg', 'tool-subagent/locale'],
  'tool-subagent/fork': ['tool-subagent/fork.js', 'tool-subagent-fork.svg', 'tool-subagent/locale/fork'],
}

export function checkRoleExports(pkg, roles) {
  const issues = []
  const modules = roles.map(role => role.moduleName?.replace('@sieuno/dsh-native-collab/', ''))
  if (modules.length !== Object.keys(expectedModules).length || new Set(modules).size !== modules.length || modules.some(name => !Object.hasOwn(expectedModules, name))) issues.push('assembly role modules do not match the public contract')
  for (const [module, [runtime, icon, locale]] of Object.entries(expectedModules)) {
    for (const [key, expected] of [
      [`./${module}`, `./dist/${runtime}`],
      [`./${module}/icon`, `./icons/${icon}`],
      [`./${module}/locale/*.json`, `./packages/${locale}/*.json`],
    ]) if (pkg.exports?.[key] !== expected) issues.push(`export mapping mismatch for ${key}: expected ${expected}`)
  }
  return issues
}

async function main() {
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const issues = checkRoleExports(pkg, ASSEMBLY_ROLES)
const rows = ASSEMBLY_ROLES.map(role => {
  const module = role.moduleName.replace('@sieuno/dsh-native-collab/', '')
  const expected = expectedModules[module]
  return { id: role.legacyId, module, icon: expected && `./icons/${expected[1]}` }
})
if (ASSEMBLY_ROLES.filter(role => role.placement === 'runtime').length !== 3 || ASSEMBLY_ROLES.filter(role => role.placement === 'preset').length !== 4) issues.push('assembly must have 3 runtime roles and 4 preset tool roles')
if (pkg.name !== '@sieuno/dsh-native-collab' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(pkg.version ?? '') || pkg.private === true) issues.push('package identity/publication configuration mismatch')
if (pkg.publishConfig?.access !== 'public' || pkg.publishConfig?.registry !== 'https://registry.npmjs.org/') issues.push('npm publication target mismatch')
if (pkg.engines?.dsh !== '>=0.2.1-rc.1 <0.2.2-0' || pkg.engines?.node !== '>=22.19.0') issues.push('engine compatibility range mismatch')
if (pkg.dependencies?.zod !== '4.4.3' || pkg.dependencies?.['@deepseek-ai/schemastery'] !== undefined) issues.push('runtime dependency declaration mismatch')
if (pkg.devDependencies?.typescript !== '5.9.3') issues.push('typescript source-build dependency missing')
if (pkg.dsh?.bundle?.patch !== './cordis.patch.yml') issues.push('dsh.bundle.patch must point to ./cordis.patch.yml')
if (pkg.scripts?.['validate:package'] !== 'node scripts/check-release.mjs') issues.push('validate:package must be a direct Node-only package check')
for (const doc of ['README.md', 'README.en.md', 'docs/INSTALL.md', 'docs/FAQ.md', 'LICENSE']) if (!(pkg.files ?? []).includes(doc)) issues.push(`${doc} must be included in the package files whitelist`)
if ((pkg.files ?? []).includes('.npmrc')) issues.push('.npmrc must remain source-project-only, not a runtime package file')
if (pkg.exports?.['.'] !== './dist/agent-team/bootstrap.js') issues.push('root export must point to the single management bootstrap')
if (pkg.exports?.['./client'] !== './dist/client.js') issues.push('client subpath export must point to the browser entry')
if (pkg.dsh?.client?.platform !== 'web' || pkg.dsh?.client?.immediately !== true) issues.push('dsh.client must declare the immediate web client')
if ('bundleDependencies' in pkg || 'bundledDependencies' in pkg) issues.push('vendored dependencies are forbidden')
for (const peer of Object.keys(pkg.peerDependencies ?? {})) if (pkg.peerDependenciesMeta?.[peer]?.optional !== true) issues.push(`host peer must be optional: ${peer}`)
const requiredExports = ['.', './package.json', './cordis.patch.yml', './locale/*.json', './icon', './subagent/internal', './client']
for (const row of rows) requiredExports.push(`./${row.module}`, `./${row.module}/locale/*.json`, `./${row.module}/icon`)
for (const key of requiredExports) if (typeof pkg.exports?.[key] !== 'string') issues.push(`missing export ${key}`)
for (const path of pkg.files ?? []) if (/^(?:packages\/[^/]+\/src|tests|node_modules|dev-compiler|rawlogs)(?:\/|$)/.test(path)) issues.push(`non-runtime content is in files whitelist: ${path}`)
if (!(pkg.files ?? []).includes('./cordis.patch.yml') && !(pkg.files ?? []).includes('cordis.patch.yml')) issues.push('cordis.patch.yml is not packed')

async function walk(dir) {
  const result = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name)
    if (entry.isDirectory()) result.push(...await walk(file))
    else result.push(file)
  }
  return result
}
async function mustExist(target, label) {
  try { await stat(join(root, target)) } catch { issues.push(`${label} target missing: ${target}`) }
}
await mustExist(pkg.exports?.['.']?.replace(/^\.\//, '') ?? '', 'root')
await mustExist(pkg.exports?.['./client']?.replace(/^\.\//, '') ?? '', 'browser client')
await mustExist('cordis.patch.yml', 'bundle patch')
await mustExist('locale/en.json', 'bundle English locale')
await mustExist('locale/zh.json', 'bundle Chinese locale')
for (const row of rows) {
  const runtime = pkg.exports?.[`./${row.module}`]
  await mustExist(runtime?.replace(/^\.\//, '') ?? '', row.module)
  const localePattern = pkg.exports?.[`./${row.module}/locale/*.json`]
  if (!localePattern) issues.push(`locale mapping missing for ${row.module}`)
  const localeBase = localePattern?.replace('./', '').replace('*.json', '')
  for (const language of ['en.json', 'zh.json']) {
    const file = join(root, localeBase ?? '', language)
    try {
      const fields = JSON.parse(await readFile(file, 'utf8')).meta
      if (typeof fields?.title !== 'string' || !fields.title.trim() || typeof fields?.description !== 'string' || !fields.description.trim()) issues.push(`incomplete ${language} metadata for ${row.id}`)
    } catch { issues.push(`unreadable ${language} locale for ${row.id}`) }
  }
  if (row.icon) await mustExist(row.icon.replace('./', ''), `${row.id} icon`)
}
const patch = await readFile(join(root, 'cordis.patch.yml'), 'utf8')
if (!patch.includes('\n- insert:')) issues.push('default patch must declare insert entries')
const patchRows = [...patch.matchAll(/- id: "([^\"]+)"\s*\n\s+name: "([^\"]+)"\s*\n\s+disabled: (\w+)/g)]
if (patchRows.length < 1) issues.push('default patch has no rows')
const ui = patchRows.find(([, id]) => id === 'dsh-native-collab-ui')
if (ui?.[2] !== '@sieuno/dsh-native-collab' || ui?.[3] !== 'false') issues.push('default UI anchor must be the active bare package row')
if (patchRows.length !== 1) issues.push('bundle must expose exactly one management row, never internal service/tool switches')
const defaultPatch = parse(patch, { customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: value => ({ __jsExpr: value }) }] })
const inserted = defaultPatch.flatMap(row => row.insert ?? [])
if (inserted.length !== 1 || inserted[0]?.config?.runtimeMode !== 'managed') issues.push('install must own runtime through one management entry')
for (const row of rows) if (inserted.some(entry => entry.id === row.id)) issues.push(`legacy independent row must not be inserted: ${row.id}`)
for (const id of ['subagent', 'agent-team', 'tool-agent-team']) {
  const override = defaultPatch.find(row => row.id === id)
  if (typeof override?.disabled?.__jsExpr !== 'string' || !override.disabled.__jsExpr.includes("Symbol.for('cordis.entry')") || 'config' in override) issues.push(`native role must have a startup ownership guard without pinning config: ${id}`)
}
for (const id of ['preset-standard', 'preset-minimal', 'preset-ptc', 'preset-cordis']) {
  const override = defaultPatch.find(row => row.id === id)
  if (override?.name !== '@deepseek-ai/dsh-agent-preset' || JSON.stringify(override.inject) !== '["subagents"]' || 'config' in override) issues.push(`preset must wait for providers without pinning its config: ${id}`)
}
const js = (await walk(join(root, 'dist'))).filter(file => file.endsWith('.js'))
const requiredJs = ['dist/client.js', 'dist/tool-subagent/delegation.js', 'dist/tool-subagent/fork.js', 'dist/agent-team/own-model.js']
for (const file of requiredJs) if (!js.some(item => item.replaceAll('\\', '/').endsWith(file))) issues.push(`missing dist file ${file}`)
if (js.length < requiredJs.length) issues.push(`dist JS count ${js.length} is below the required entries`)
for (const file of js) {
  const code = await readFile(file, 'utf8')
  if (/\bimport\s*\{[^}]*\bFiberState\b[^}]*\}\s*from\s*['"]@deepseek-ai\/cordis['"]/.test(code)) issues.push(`${relative(root, file)} imports a const enum that Cordis does not export at runtime`)
  const check = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' })
  if (check.status !== 0) issues.push(`${relative(root, file)} syntax failed (${check.status})`)
}

// Scan only controlled plugin content: dependencies, generated test output and caches are never traversed.
const candidates = [
  ...(await walk(join(root, 'dist'))),
  ...(await walk(join(root, 'icons'))),
  ...(await walk(join(root, 'locale'))),
  ...(await walk(join(root, 'packages'))).filter(file => /[\\/]packages[\\/][^\\/]+[\\/](?:src|locale)[\\/]/.test(file)),
  ...['package.json', 'cordis.patch.yml', 'README.md', 'README.en.md', 'TESTING.md', 'UPSTREAM.md', 'THIRD_PARTY_NOTICES.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'docs/INSTALL.md', 'docs/FAQ.md', 'LICENSE'].map(file => join(root, file)),
]
const forbidden = [
  /\b[A-Z]:[\\/][^\r\n"'`<>|?*]*/i,
  /\/(?:Users|home)\/[^/\s"'`<>|?*]+/i,
  /file:\/\/(?:[A-Z]:|\/)/i,
  /\b(?:authorization|clientauth|api[_-]?key|access[_-]?token|password)\s*[:=]\s*["'][^"']+["']/i,
]
for (const file of candidates) {
  const raw = await readFile(file, 'utf8')
  const normalized = raw.replaceAll('\\\\', '\\')
  for (const pattern of forbidden) if (pattern.test(normalized)) issues.push(`${relative(root, file)} matched generic path/credential scan`)
}
if (issues.length) { console.error(issues.join('\n')); process.exitCode = 1 }
else console.log(`release metadata, exports, locale/icon assets, single management anchor, 3+4 layout, and ${js.length} JS syntax checks passed`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
