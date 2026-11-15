import ts from 'typescript'
import { createRequire } from 'node:module'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
const sdk = resolve(process.env.DSH_NATIVE_SDK ?? '.github/sdk/native')
const require = createRequire(resolve(sdk, 'package.json'))
const dependencies = JSON.parse(readFileSync(resolve(sdk, 'package.json'), 'utf8')).dependencies
const paths = {}
for (const name of Object.keys(dependencies).filter(name => name.startsWith('@deepseek-ai/'))) {
  const manifest = require.resolve(`${name}/package.json`)
  const pkg = JSON.parse(readFileSync(manifest, 'utf8'))
  if (pkg.types) paths[name] = [resolve(dirname(manifest), pkg.types)]
  for (const [key, value] of Object.entries(pkg.exports ?? {})) {
    if (value?.types) paths[name + (key === '.' ? '' : key.slice(1))] = [resolve(dirname(manifest), value.types)]
  }
}
const files = readdirSync('src').filter(name => name.endsWith('.ts')).map(name => resolve('src', name))
const program = ts.createProgram(files, {
  noEmit: true, strict: true, skipLibCheck: true, isolatedModules: true, verbatimModuleSyntax: true, target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext,
  allowImportingTsExtensions: true, types: ['node'], typeRoots: [resolve(sdk, 'node_modules/@types')], paths,
})
const diagnostics = ts.getPreEmitDiagnostics(program)
console.log(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCurrentDirectory: () => process.cwd(), getCanonicalFileName: x => x, getNewLine: () => '\n',
}))
console.log(`Strict native extension typecheck: ${files.length} files, ${diagnostics.length} diagnostics.`)
if (diagnostics.length) process.exitCode = 1
