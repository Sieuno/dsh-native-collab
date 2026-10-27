/** Opt-in strict source check against caller-supplied, already installed SDK declarations. */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let sdkTypesMap = '', typeRoot = '', reportFile = join(root, '.test-artifacts/types.json')
const args = process.argv.slice(2)
for (let i = 0; i < args.length; i++) {
  const key = args[i], value = args[++i]
  if (!value) throw new Error(`Missing value for ${key}`)
  if (key === '--sdk-types-map') sdkTypesMap = resolve(value)
  else if (key === '--type-root') typeRoot = resolve(value)
  else if (key === '--report') reportFile = resolve(value)
  else throw new Error(`Unknown option ${key}`)
}
async function walk(dir) {
  const files = []
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, item.name)
    if (item.isDirectory()) files.push(...await walk(path))
    else if (item.name.endsWith('.ts')) files.push(path)
  }
  return files
}
const paths = {}
if (sdkTypesMap) {
  const map = JSON.parse(await readFile(sdkTypesMap, 'utf8'))
  if (!map || typeof map !== 'object' || Array.isArray(map)) throw new Error('SDK declaration map must be an object')
  for (const [name, file] of Object.entries(map)) {
    if (!name.startsWith('@deepseek-ai/') || typeof file !== 'string' || !file.endsWith('.d.ts')) throw new Error(`Invalid SDK declaration mapping: ${name}`)
    paths[name] = [resolve(dirname(sdkTypesMap), file)]
  }
}
for (const name of ['agent-team', 'subagent', 'tool-agent-team', 'tool-subagent-control']) paths[`@dsh-native-collab/${name}`] = [join(root, 'packages', name, 'src/index.ts')]
paths['@dsh-native-collab/subagent/internal'] = [join(root, 'packages/subagent/src/internal.ts')]
paths['@dsh-native-collab/tool-subagent-control/list-agents'] = [join(root, 'packages/tool-subagent-control/src/list-agents.ts')]
const files = await walk(join(root, 'packages'))
const options = {
  noEmit: true, strict: true, skipLibCheck: true,
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext,
  allowImportingTsExtensions: true, lib: ['lib.es2024.d.ts', 'lib.esnext.disposable.d.ts', 'lib.dom.d.ts'],
  types: ['node'], ...(typeRoot ? { typeRoots: [typeRoot] } : {}), paths,
}
const program = ts.createProgram(files, options)
const diagnostics = ts.getPreEmitDiagnostics(program).map(d => ({
  code: d.code, file: d.file?.fileName,
  line: d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : null,
  message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
}))
const report = { sourceFiles: files.length, typescript: ts.version, strict: true, skipLibCheck: true, sdkTypesMap: sdkTypesMap || null, typeRoot: typeRoot || null, diagnostics }
await mkdir(dirname(reportFile), { recursive: true })
await writeFile(reportFile, JSON.stringify(report, null, 2))
console.log(`${files.length} source files checked; ${diagnostics.length} diagnostics. Report: ${reportFile}`)
for (const d of diagnostics) console.error(`${d.file ?? ''}:${d.line ?? ''} TS${d.code} ${d.message}`)
if (diagnostics.length) process.exitCode = 1
