import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, join, relative } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { checkHostImportContract } from './host-import-contract.mjs'
import { buildConversationPanels } from './client-panels.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
if (args.some(arg => arg !== '--check')) throw new Error('Usage: node scripts/emit-dist.mjs [--check]')
const checking = args.includes('--check')
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

async function emit(file, code) {
  if (!checking) {
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, code)
    return
  }
  try {
    if (await readFile(file, 'utf8') !== code) errors.push(`${relative(root, file)}: checked-in output differs; run npm run build`)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    errors.push(`${relative(root, file)}: checked-in output is missing; run npm run build`)
  }
}
async function walk(dir, extension = '.ts') {
  const found = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...await walk(file, extension))
    else if (entry.name.endsWith(extension) && !entry.name.endsWith('.d.ts')) found.push(file)
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
const sourceGroups = await Promise.all(packages.map(async name => {
  const src = join(root, 'packages', name, 'src')
  return { name, src, files: await walk(src) }
}))
const contractIssues = checkHostImportContract(sourceGroups.flatMap(group => group.files))
if (contractIssues.length) throw new Error(`Host import contract failed:\n${contractIssues.join('\n')}`)
for (const { name, src, files } of sourceGroups) {
  for (const file of files) {
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
    await emit(dest, code)
    output.push(dest)
  }
}
const clientSource = join(root, 'packages', 'agent-team', 'client.js')
const clientOutput = join(root, 'dist', 'client.js')
const dictionaries = Object.fromEntries(await Promise.all(['en', 'zh'].map(async language => [language,
  JSON.parse(await readFile(join(root, 'locale', `${language}.json`), 'utf8')).collabUi,
])))
// Read only literal AST data: never execute the server's module to build the browser inventory.
const layoutText = await readFile(join(root, 'packages', 'agent-team', 'src', 'assembly-layout.ts'), 'utf8')
const layoutAst = ts.createSourceFile('assembly-layout.ts', layoutText, ts.ScriptTarget.Latest, true)
const layoutDeclaration = layoutAst.statements.filter(ts.isVariableStatement).flatMap(statement => [...statement.declarationList.declarations]).find(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === 'ASSEMBLY_ROLES')
function literal(node) {
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) return literal(node.expression)
  if (ts.isStringLiteral(node)) return node.text
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal)
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(property => {
    if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name) && !ts.isStringLiteral(property.name)) throw new Error('Assembly layout must contain literal properties')
    return [property.name.text, literal(property.initializer)]
  }))
  throw new Error('Assembly layout must be literal data, not executable expressions')
}
const initializer = layoutDeclaration?.initializer
if (!initializer || !ts.isCallExpression(initializer) || initializer.expression.getText(layoutAst) !== 'Object.freeze' || initializer.arguments.length !== 1) throw new Error('Authoritative ASSEMBLY_ROLES declaration unavailable')
const layout = literal(initializer.arguments[0])
if (!Array.isArray(layout) || layout.length !== 7 || new Set(layout.map(row => row.role)).size !== layout.length) throw new Error('Invalid authoritative assembly roles')
let browserSource = await readFile(clientSource, 'utf8')
for (const [name, value] of [['UI_LOCALES', dictionaries], ['ASSEMBLY_LAYOUT', layout]]) {
  const placeholder = `const ${name} = null`
  if (browserSource.split(placeholder).length !== 2) throw new Error(`Expected one ${name} browser placeholder`)
  browserSource = browserSource.replace(placeholder, `const ${name} = ${JSON.stringify(value)}`)
}
const panels = await buildConversationPanels(root)
for (const [name, code] of [['CONVERSATION_PANELS', panels.code], ['CONVERSATION_CSS', JSON.stringify(panels.css)]]) {
  const placeholder = `const ${name} = null`
  if (browserSource.split(placeholder).length !== 2) throw new Error(`Expected one ${name} browser placeholder`)
  browserSource = browserSource.replace(placeholder, () => `const ${name} = ${code}`)
}
await emit(clientOutput, browserSource)
if (checking) {
  const expected = new Set([...output, clientOutput])
  for (const file of await walk(join(root, 'dist'), '.js')) {
    if (!expected.has(file)) errors.push(`${relative(root, file)}: stale output has no source`)
  }
}
for (const file of [...output, clientOutput]) {
  const check = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' })
  if (check.status !== 0) errors.push(`${relative(root, file)}: node --check failed (${check.status})`)
}
if (output.length === 0) errors.push('emitted no host JS modules')
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1 }
else console.log(`${checking ? 'Read-only build verification matched checked-in output byte-for-byte' : 'Transpile-only build'}: ${output.length} host JavaScript modules plus browser client entry passed node --check (not a typecheck)`)
