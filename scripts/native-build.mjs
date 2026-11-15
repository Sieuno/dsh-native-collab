import ts from 'typescript'
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const checking = process.argv.includes('--check')
if (process.argv.slice(2).some(arg => arg !== '--check')) throw new Error('Usage: node scripts/native-build.mjs [--check]')
const root = new URL('../', import.meta.url)
if (!checking) await mkdir(new URL('dist/native/', root), { recursive: true })
for (const file of (await readdir(new URL('src/', root))).filter(name => name.endsWith('.ts'))) {
  const source = await readFile(new URL(`src/${file}`, root), 'utf8')
  const result = ts.transpileModule(source, { fileName: file, reportDiagnostics: true, compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true,
  } })
  const diagnostics = result.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error)
  if (diagnostics.length) throw new Error(ts.formatDiagnostics(diagnostics, { getCurrentDirectory: () => '.', getCanonicalFileName: x => x, getNewLine: () => '\n' }))
  const output = result.outputText.replace(/(from\s+['"]\.\.?\/[^'"]+)\.ts(['"])/g, '$1.js$2')
  const target = new URL(`dist/native/${file.replace(/\.ts$/, '.js')}`, root)
  if (checking) {
    if (await readFile(target, 'utf8') !== output) throw new Error(`Build differs: ${file}`)
  } else await writeFile(target, output)
  const check = spawnSync(process.execPath, ['--check', fileURLToPath(target)], { encoding: 'utf8' })
  if (check.status) throw new Error(check.stderr)
}
const client = await readFile(new URL('src/client.js', root), 'utf8')
const clientTarget = new URL('dist/client.js', root)
if (checking) {
  if (await readFile(clientTarget, 'utf8') !== client) throw new Error('Client build differs')
} else await writeFile(clientTarget, client)
const clientCheck = spawnSync(process.execPath, ['--check', fileURLToPath(clientTarget)], { encoding: 'utf8' })
if (clientCheck.status) throw new Error(clientCheck.stderr)
console.log(`Native extension and settings client ${checking ? 'build match' : 'build emitted'}; syntax checked (not a typecheck).`)
