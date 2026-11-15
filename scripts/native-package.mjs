import { readFile, access, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export async function validatePackage() {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'))
  const peers = ['cordis','schemastery', ...['agent','llm','session','session-projection','subagent','tool-subagent','tool-subagent-control','system-prompt','tools','settings'].map(name => `dsh-${name}`)].map(name => `@deepseek-ai/${name}`)
  if (JSON.stringify(Object.keys(pkg.peerDependencies).sort()) !== JSON.stringify(peers.sort())) throw new Error('Required host peer inventory differs')
  const files = ['dist/native/*.js','dist/client.js','locale/*.json','locale/settings.*.md','icons/subagent.svg','cordis.patch.yml','README.md','README.en.md','LICENSE','UPSTREAM.md','THIRD_PARTY_NOTICES.md','CHANGELOG.md','CONTRIBUTING.md','TESTING.md','docs/INSTALL*.md','docs/FAQ*.md']
  if (JSON.stringify([...pkg.files].sort()) !== JSON.stringify(files.sort())) throw new Error('Publish whitelist differs')
  if (pkg.engines.dsh !== '=0.2.2-rc.2 || =0.2.2-rc.3' || pkg.engines.node !== '>=24.9.0') throw new Error('Unsupported host declarations')
  if (pkg.dependencies && Object.keys(pkg.dependencies).length) throw new Error('The extension must not ship host dependencies')
  if (pkg.bundledDependencies || pkg.bundleDependencies) throw new Error('Bundled dependencies are forbidden')
  for (const [name, version] of Object.entries(pkg.peerDependencies)) {
    if (pkg.peerDependenciesMeta[name]?.optional !== true) throw new Error(`Host peer must be optional: ${name}`)
    if (name.startsWith('@deepseek-ai/dsh-') && version !== pkg.engines.dsh) throw new Error(`Mismatched host peer: ${name}`)
  }
  if (Object.keys(pkg.exports).some(key => /agent-team|subagent|fallback/.test(key))) throw new Error('Retired runtime exports remain')
  if (pkg.exports['./client'] !== './dist/client.js' || pkg.dsh.client?.platform !== 'web'
    || JSON.stringify(pkg.dsh.client.inject) !== JSON.stringify(['@deepseek-ai/dsh-client-locale','@deepseek-ai/dsh-client-ui-settings','@deepseek-ai/dsh-client-ui-plugin-manager','@deepseek-ai/dsh-client-ui-primitives'])) throw new Error('Settings client declarations differ')
  if (pkg.dsh.bundle?.patch !== './cordis.patch.yml') throw new Error('Missing bundle patch')
  for (const filename of Object.values(pkg.exports).filter(value => !value.includes('*'))) await access(filename)
  const sources = (await readdir('src')).filter(name => name.endsWith('.ts'))
  const outputs = (await readdir('dist/native')).filter(name => name.endsWith('.js'))
  if (JSON.stringify(outputs.sort()) !== JSON.stringify(sources.map(name => name.replace(/\.ts$/, '.js')).sort())) throw new Error('Missing or stale native build output')
  for (const file of outputs) {
    const code = await readFile(`dist/native/${file}`, 'utf8')
    if (/@dsh-native-collab\/|@sieuno\/dsh-native-collab\/(?:subagent|agent-team|tool-)/.test(code)) throw new Error(`Retired runtime dependency in ${file}`)
  }
  const lock = JSON.parse(await readFile('package-lock.json','utf8'))
  if (lock.version !== pkg.version || lock.packages[''].version !== pkg.version) throw new Error('Lockfile version differs')
  for (const key of ['engines','peerDependencies','peerDependenciesMeta','devDependencies']) {
    const canonical = value => JSON.stringify(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)))
    if (canonical(pkg[key]) !== canonical(lock.packages[''][key])) throw new Error(`Lockfile ${key} differs`)
  }
  const dictionaries = await Promise.all(['zh','en'].map(async lang => JSON.parse(await readFile(`locale/${lang}.json`,'utf8'))))
  const keys = value => JSON.stringify(Object.keys(value).sort().map(key => [key, value[key] && typeof value[key] === 'object' ? keys(value[key]) : typeof value[key]]))
  if (keys(dictionaries[0]) !== keys(dictionaries[1])) throw new Error('Locale keys differ')
  console.log('Native package declarations, exports, outputs, and bilingual locale keys validated.')
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await validatePackage()
