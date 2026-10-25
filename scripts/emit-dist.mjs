import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, join, relative } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require('typescript')
const packages = (await readdir(join(root, 'packages'), { withFileTypes: true }))
  .filter(entry => entry.isDirectory() && entry.name !== 'node_modules')
  .map(entry => entry.name)
  .sort()
const aliases = new Map([
  ['@dsh-native-collab/agent-team', 'agent-team/index.js'],
  ['@dsh-native-collab/tool-agent-team', 'tool-agent-team/index.js'],
  ['@dsh-native-collab/subagent', 'subagent/index.js'],
  ['@dsh-native-collab/subagent/internal', 'subagent/internal.js'],
  ['@dsh-native-collab/tool-subagent-control', 'tool-subagent-control/index.js'],
  ['@dsh-native-collab/tool-subagent-control/list-agents', 'tool-subagent-control/list-agents.js'],
])
const specifierRe = /((?:from|import)\s*(?:\(\s*)?)(['"])([^'"]+)\2/g
const output = []
const errors = []

async function walk(dir) {
  const found = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...await walk(file))
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) found.push(file)
  }
  return found
}
function relativeImport(fromFile, targetFile) {
  let value = relative(dirname(fromFile), targetFile).replaceAll('\\', '/')
  if (!value.startsWith('.')) value = `./${value}`
  return value
}
function rewrite(code, dest) {
  return code.replace(specifierRe, (all, lead, quote, spec) => {
    if ((spec.startsWith('./') || spec.startsWith('../')) && spec.endsWith('.ts') && !spec.endsWith('.d.ts')) return `${lead}${quote}${spec.slice(0, -3)}.js${quote}`
    const target = aliases.get(spec)
    if (target) return `${lead}${quote}${relativeImport(dest, join(root, 'dist', target))}${quote}`
    if (spec.startsWith('@dsh-native-collab/')) errors.push(`unmapped package import: ${spec}`)
    return all
  })
}
for (const name of packages) {
  const src = join(root, 'packages', name, 'src')
  for (const file of await walk(src)) {
    const dest = join(root, 'dist', name, `${relative(src, file).replaceAll('\\', '/').slice(0, -3)}.js`)
    const result = ts.transpileModule(await readFile(file, 'utf8'), {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        experimentalDecorators: false,
        useDefineForClassFields: true,
        rewriteRelativeImportExtensions: true,
        verbatimModuleSyntax: false,
      },
    })
    for (const diagnostic of result.diagnostics ?? []) {
      if (diagnostic.category === ts.DiagnosticCategory.Error) errors.push(`${relative(root, file)}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`)
    }
    const code = rewrite(result.outputText, dest)
    if (/^\s*@\w/m.test(code) || /from\s+['"]@dsh-native-collab\//.test(code)) errors.push(`${relative(root, file)}: decorator or bare internal import remained`)
    await mkdir(dirname(dest), { recursive: true })
    await writeFile(dest, code)
    output.push(dest)
  }
}
const clientSource = join(root, 'packages', 'agent-team', 'client.js')
const clientOutput = join(root, 'dist', 'client.js')
await mkdir(dirname(clientOutput), { recursive: true })
const dictionaries = Object.fromEntries(await Promise.all(['en', 'zh'].map(async language => [language,
  JSON.parse(await readFile(join(root, 'locale', `${language}.json`), 'utf8')).collabUi,
])))
await writeFile(clientOutput, (await readFile(clientSource, 'utf8')).replace('const UI_LOCALES = null', `const UI_LOCALES = ${JSON.stringify(dictionaries)}`))
for (const file of [...output, clientOutput]) {
  const check = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' })
  if (check.status !== 0) errors.push(`${relative(root, file)}: node --check failed (${check.status})`)
}
if (output.length === 0) errors.push('emitted no host JS modules')
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1 }
else console.log(`transpile-only build: ${output.length} host JavaScript modules plus browser client entry passed node --check (not a typecheck)`)
