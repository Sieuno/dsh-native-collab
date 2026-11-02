/** Build private conversation panels; no runtime feature-plugin dependency. */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createRequire } from 'node:module'
const ts = createRequire(import.meta.url)('typescript')

export async function buildConversationPanels(root) {
  const base = join(root, 'packages/agent-team/browser-panels')
  const panels = [
    ['TeamAction', 'agent-team', ['TeamAction']],
    ['SubagentHeaderLineage', 'subagent', ['SubagentCatalogAction']],
  ]
  const built = [], styles = []
  for (const [file, namespace, exports] of panels) {
    const source = await readFile(join(base, file + '.tsx'), 'utf8')
    let css = await readFile(join(base, file + '.module.css'), 'utf8')
    const classes = new Map()
    css = css.replace(/\.([A-Za-z_][A-Za-z0-9_-]*)/g, (all, name) => {
      if (!classes.has(name)) classes.set(name, 'dsh-collab-' + file + '-' + name)
      return '.' + classes.get(name)
    })
    styles.push(css)
    const ast = ts.createSourceFile(file + '.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const imports = [], body = []
    for (const statement of ast.statements) {
      if (ts.isImportDeclaration(statement)) {
        const clause = statement.importClause
        if (!clause || clause.isTypeOnly) continue
        const specifier = statement.moduleSpecifier.text
        if (specifier.endsWith('.module.css')) continue
        const bindings = clause.namedBindings
        const names = bindings && ts.isNamedImports(bindings) ? bindings.elements.filter(item => !item.isTypeOnly) : []
        if (!names.length) continue
        const owner = specifier === 'react' ? 'React' : specifier === 'react-dom' ? 'ReactDOM'
          : specifier === '@deepseek-ai/dsh-client-ui-primitives' ? 'primitives' : specifier === './locales.ts' ? null : undefined
        if (owner === undefined) throw new Error('Forbidden private panel value import: ' + specifier)
        if (owner === null) {
          if (names.some(item => item.name.text !== 'NS')) throw new Error('Unexpected locale value import')
          continue
        }
        imports.push('const { ' + names.map(item => item.propertyName ? item.propertyName.text + ': ' + item.name.text : item.name.text).join(', ') + ' } = ' + owner + ';')
      } else body.push(statement.getFullText(ast))
    }
    const result = ts.transpileModule(body.join('\n'), { fileName: file + '.tsx', reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React, jsxFactory: 'React.createElement', jsxFragmentFactory: 'React.Fragment' } })
    const errors = (result.diagnostics ?? []).filter(item => item.category === ts.DiagnosticCategory.Error)
    if (errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, { getCurrentDirectory: () => root, getCanonicalFileName: value => value, getNewLine: () => '\n' }))
    const code = result.outputText.replace(/^export\s+/gm, '').replace(/^\s*export\s*\{\s*\};?\s*$/gm, '')
    built.push('...(() => { const NS = ' + JSON.stringify(namespace) + '; const css = ' + JSON.stringify(Object.fromEntries(classes)) + ';\n' + imports.join('\n') + '\n' + code + '\nreturn { ' + exports.join(', ') + ' }; })()')
  }
  return { code: '({ ' + built.join(',\n') + ' })', css: styles.join('\n') }
}
