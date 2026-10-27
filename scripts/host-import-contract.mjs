/** Static declaration checks only. Does not import/execute host modules or start plugins. */
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')

export function checkHostImportContract(files) {
  const program = ts.createProgram(files, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    allowImportingTsExtensions: true,
    skipLibCheck: true,
    noEmit: true,
    types: [],
  })
  const checker = program.getTypeChecker()
  const issues = []
  for (const file of files) {
    const tree = program.getSourceFile(file)
    if (!tree) { issues.push(`${file}: cannot inspect source imports`); continue }
    const schemaBindings = new Map()
    for (const node of tree.statements) {
      if (!ts.isImportDeclaration(node) || !node.importClause || node.importClause.isTypeOnly) continue
      if (['@deepseek-ai/schemastery', 'zod'].includes(node.moduleSpecifier.text)) {
        const add = name => { if (name) schemaBindings.set(checker.getSymbolAtLocation(name), node.moduleSpecifier.text) }
        add(node.importClause.name)
        const names = node.importClause.namedBindings
        if (names && ts.isNamedImports(names)) { for (const spec of names.elements) if (!spec.isTypeOnly) add(spec.name) }
        else if (names && ts.isNamespaceImport(names)) add(names.name)
      }
      const bindings = node.importClause.namedBindings
      if (!bindings || !ts.isNamedImports(bindings)) continue
      for (const spec of bindings.elements) {
        if (spec.isTypeOnly) continue
        const alias = checker.getSymbolAtLocation(spec.name)
        const symbol = alias?.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(alias) : alias
        if (symbol?.flags & ts.SymbolFlags.ConstEnum) {
          issues.push(`${file}: ${spec.name.text} is a const enum, not a runtime export; use a type-only import and a verified runtime representation`)
        }
      }
    }
    function schemaRoot(node) {
      if (ts.isCallExpression(node) || ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) return schemaRoot(node.expression)
      if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)) return schemaRoot(node.expression)
      return ts.isIdentifier(node) ? schemaBindings.get(checker.getSymbolAtLocation(node)) : undefined
    }
    function visit(node) {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const access = node.expression
        const library = schemaRoot(access.expression)
        if (library) {
          const receiver = checker.getTypeAtLocation(access.expression)
          const method = checker.getPropertyOfType(receiver, access.name.text)
          const callable = checker.getSignaturesOfType(checker.getTypeAtLocation(access), ts.SignatureKind.Call).length > 0
          if (receiver.flags & ts.TypeFlags.Any || !method || !callable) {
            const line = tree.getLineAndCharacterOfPosition(access.name.getStart()).line + 1
            issues.push(`${file}:${line}: ${library} does not provide a verifiable callable ${access.name.text}; check the actual library, not a similarly named API`)
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(tree)
  }
  const managed = files.find(file => /[\\/]agent-team[\\/]src[\\/]managed-runtime\.ts$/.test(file))
  const tree = managed && program.getSourceFile(managed)
  const dependency = tree?.statements.find(node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === '@deepseek-ai/cordis')
  const bindings = dependency?.importClause?.namedBindings
  const imported = bindings && ts.isNamedImports(bindings) && bindings.elements.find(spec => (spec.propertyName ?? spec.name).text === 'FiberState')
  const alias = imported && checker.getSymbolAtLocation(imported.name)
  const symbol = alias && checker.getAliasedSymbol(alias)
  const declaration = symbol?.declarations?.find(ts.isEnumDeclaration)
  if (!declaration || !(symbol.flags & ts.SymbolFlags.ConstEnum)) {
    issues.push('Cannot verify Cordis FiberState declaration; restore the existing build SDK, do not guess lifecycle values')
    return issues
  }
  const declared = Object.fromEntries(declaration.members.map(member => [member.name.getText().replace(/^['"]|['"]$/g, ''), checker.getConstantValue(member)]))
  const local = tree.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations]).find(node => node.name.getText() === 'CORDIS_FIBER_STATE')
  let initializer = local?.initializer
  if (initializer && ts.isCallExpression(initializer) && initializer.expression.getText() === 'Object.freeze') initializer = initializer.arguments[0]
  while (initializer && (ts.isAsExpression(initializer) || ts.isParenthesizedExpression(initializer))) initializer = initializer.expression
  const values = initializer && ts.isObjectLiteralExpression(initializer) ? Object.fromEntries(initializer.properties.map(node => {
    if (!ts.isPropertyAssignment(node) || !ts.isNumericLiteral(node.initializer)) return ['', NaN]
    return [node.name.getText().replace(/^['"]|['"]$/g, ''), Number(node.initializer.text)]
  })) : {}
  if (Object.keys(declared).length !== 6 || Object.keys(values).length !== 6 || Object.entries(declared).some(([name, value]) => value !== values[name] || typeof value !== 'number')) {
    issues.push('CORDIS_FIBER_STATE does not match the installed Cordis const enum declaration')
  }
  return issues
}
