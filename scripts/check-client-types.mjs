/** Strict browser-panel source check against caller-supplied real client declarations. */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let sdkTypesMap = '', typeRoot = '', reportFile = join(root, '.test-artifacts/client-types.json')
const args = process.argv.slice(2)
for (let i = 0; i < args.length; i += 1) {
  const key = args[i], value = args[++i]
  if (!value) throw new Error(`Missing value for ${key}`)
  if (key === '--sdk-types-map') sdkTypesMap = resolve(value)
  else if (key === '--type-root') typeRoot = resolve(value)
  else if (key === '--report') reportFile = resolve(value)
  else throw new Error(`Unknown option ${key}`)
}
if (!sdkTypesMap || !typeRoot) throw new Error('Client panel types require real --sdk-types-map and --type-root inputs; no fallback shims are provided.')
const map = JSON.parse(await readFile(sdkTypesMap, 'utf8'))
if (!map || typeof map !== 'object' || Array.isArray(map)) throw new Error('SDK declaration map must be an object')
const paths = {}
for (const [name, file] of Object.entries(map)) {
  if (!name.startsWith('@deepseek-ai/') || typeof file !== 'string' || !/\.d\.(?:ts|mts|cts)$/.test(file)) {
    throw new Error(`Invalid SDK declaration mapping: ${name}`)
  }
  const declaration = resolve(dirname(sdkTypesMap), file)
  await readFile(declaration)
  paths[name] = [declaration]
}
const base = join(root, 'packages/agent-team/browser-panels')
const files = ['TeamAction.tsx', 'SubagentHeaderLineage.tsx', 'locales.ts', 'css-modules.d.ts'].map(name => join(base, name))
const options = {
  noEmit: true, strict: true, skipLibCheck: true,
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext,
  jsx: ts.JsxEmit.Preserve, allowImportingTsExtensions: true,
  lib: ['lib.es2024.d.ts', 'lib.esnext.disposable.d.ts', 'lib.dom.d.ts'],
  types: ['node'], typeRoots: [typeRoot], paths,
}
const program = ts.createProgram(files, options)
const diagnostics = ts.getPreEmitDiagnostics(program).map(d => ({
  code: d.code, file: d.file?.fileName,
  line: d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : null,
  message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
}))
const report = { sourceFiles: files.length, typescript: ts.version, strict: true, skipLibCheck: true,
  sdkTypesMap, typeRoot, declarationModules: Object.keys(paths).length, diagnostics }
await mkdir(dirname(reportFile), { recursive: true })
await writeFile(reportFile, JSON.stringify(report, null, 2))
console.log(`${files.length} browser-panel source files checked against ${Object.keys(paths).length} real SDK declarations; ${diagnostics.length} diagnostics. Report: ${reportFile}`)
for (const d of diagnostics) console.error(`${d.file ?? ''}:${d.line ?? ''} TS${d.code} ${d.message}`)
if (diagnostics.length) process.exitCode = 1
