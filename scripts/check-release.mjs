import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const issues = []
const rows = [
  { id: 'dsh-native-collab-subagent', module: 'subagent', runtime: './dist/subagent/index.js', icon: './icons/subagent.svg' },
  { id: 'dsh-native-collab-tool-subagent-control', module: 'tool-subagent-control', runtime: './dist/tool-subagent-control/index.js', icon: './icons/tool-subagent-control.svg' },
  { id: 'dsh-native-collab-tool-subagent-list-agents', module: 'tool-subagent-control/list-agents', runtime: './dist/tool-subagent-control/list-agents.js', icon: './icons/tool-subagent-list-agents.svg' },
  { id: 'dsh-native-collab-agent-team', module: 'agent-team', runtime: './dist/agent-team/index.js', icon: './icons/agent-team.svg' },
  { id: 'dsh-native-collab-tool-agent-team', module: 'tool-agent-team', runtime: './dist/tool-agent-team/index.js', icon: './icons/tool-agent-team.svg' },
  { id: 'dsh-native-collab-tool-subagent', module: 'tool-subagent', runtime: './dist/tool-subagent/index.js', icon: './icons/tool-subagent.svg' },
  { id: 'dsh-native-collab-tool-subagent-fork', module: 'tool-subagent/fork', runtime: './dist/tool-subagent/fork.js', icon: './icons/tool-subagent-fork.svg' },
]
if (pkg.name !== '@dsh-native-collab/derived' || pkg.version !== '0.2.0' || pkg.private !== true) issues.push('package identity/private safety mismatch')
if (pkg.engines?.dsh !== '>=0.2.1-rc.1 <0.2.2-0' || pkg.engines?.node !== '>=22.19.0') issues.push('engine compatibility range mismatch')
if (pkg.dependencies?.zod !== '4.4.3' || pkg.dependencies?.['@deepseek-ai/schemastery'] !== undefined) issues.push('runtime dependency declaration mismatch')
if (pkg.devDependencies?.typescript !== '5.9.3') issues.push('typescript source-build dependency missing')
if (pkg.dsh?.bundle?.patch !== './cordis.patch.yml') issues.push('dsh.bundle.patch must point to ./cordis.patch.yml')
if (pkg.scripts?.['validate:package'] !== 'node scripts/check-release.mjs') issues.push('validate:package must be a direct Node-only package check')
for (const doc of ['TESTING.md', 'COVERAGE.md', 'PLUGIN-INTRODUCTION.md', 'PUBLISHING.md']) if (!(pkg.files ?? []).includes(doc)) issues.push(`${doc} must be included in the package files whitelist`)
if ((pkg.files ?? []).includes('.npmrc')) issues.push('.npmrc must remain source-project-only, not a runtime package file')
if (pkg.exports?.['.'] !== './dist/agent-team/bootstrap.js') issues.push('root export must point to the UI-only bootstrap')
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
  if (runtime !== row.runtime) issues.push(`runtime mapping mismatch for ${row.module}`)
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
  await mustExist(row.icon.replace('./', ''), `${row.id} icon`)
}
const patch = await readFile(join(root, 'cordis.patch.yml'), 'utf8')
if (!patch.includes('\n- insert:')) issues.push('default patch must declare insert entries')
const patchRows = [...patch.matchAll(/- id: "([^\"]+)"\s*\n\s+name: "([^\"]+)"\s*\n\s+disabled: (\w+)/g)]
if (patchRows.length < 1) issues.push('default patch has no rows')
const ui = patchRows.find(([, id]) => id === 'dsh-native-collab-ui')
if (ui?.[2] !== '@dsh-native-collab/derived' || ui?.[3] !== 'false') issues.push('default UI anchor must be the active bare package row')
for (const match of patchRows) if (match[1] !== 'dsh-native-collab-ui' && match[3] !== 'true') issues.push(`${match[1]} must default disabled`)
for (const row of rows) {
  if (!patch.includes(`id: "${row.id}"`) || !patch.includes(`name: "@dsh-native-collab/derived/${row.module}"`)) issues.push(`default patch row missing or mismapped: ${row.id}`)
}
const js = (await walk(join(root, 'dist'))).filter(file => file.endsWith('.js'))
const requiredJs = ['dist/client.js', 'dist/tool-subagent/delegation.js', 'dist/tool-subagent/fork.js', 'dist/agent-team/own-model.js']
for (const file of requiredJs) if (!js.some(item => item.replaceAll('\\', '/').endsWith(file))) issues.push(`missing dist file ${file}`)
if (js.length < requiredJs.length) issues.push(`dist JS count ${js.length} is below the required entries`)
for (const file of js) {
  const check = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' })
  if (check.status !== 0) issues.push(`${relative(root, file)} syntax failed (${check.status})`)
}

// Scan only controlled plugin content: dependencies, generated test output and caches are never traversed.
const candidates = [
  ...(await walk(join(root, 'dist'))),
  ...(await walk(join(root, 'icons'))),
  ...(await walk(join(root, 'locale'))),
  ...(await walk(join(root, 'packages'))).filter(file => /[\\/]packages[\\/][^\\/]+[\\/](?:src|locale)[\\/]/.test(file)),
  ...['package.json', 'cordis.patch.yml', 'README.md', 'TESTING.md', 'COVERAGE.md', 'UPSTREAM.md', 'THIRD_PARTY_NOTICES.md', 'CHANGELOG.md', 'RELEASE.md', 'CHANGE-MAP.md', 'HANDOFF.md', 'PLUGIN-INTRODUCTION.md', 'PUBLISHING.md', 'LICENSE'].map(file => join(root, file)),
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
else console.log(`release metadata, exports, locale/icon assets, active UI anchor, disabled feature rows, and ${js.length} JS syntax checks passed`)
