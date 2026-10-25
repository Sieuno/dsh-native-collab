import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require(process.env.DSH_TYPESCRIPT_ENTRY || 'typescript')
const root = resolve(import.meta.dirname, '..')
const official = process.env.DSH_SOURCE_ROOT || resolve(root, '../../plugins/deepseek-harness-dsh-v0.2.1-rc.2')
const file = resolve(official,'packages/client/locale/src/client/index.ts')
const settingsFile = resolve(official,'packages/client/locale/src/locale-settings.ts')
const source = readFileSync(file,'utf8'), settings = readFileSync(settingsFile,'utf8')
export const localeSourceEvidence = { file, sha256:createHash('sha256').update(source).digest('hex'), settingsFile, settingsSha256:createHash('sha256').update(settings).digest('hex') }
const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
const settingsTree = ts.createSourceFile(settingsFile, settings, ts.ScriptTarget.Latest, true)
const names = new Set(['FALLBACK_LOCALE','COMMON_NS','SETTINGS_NS','BUILT_IN_LOCALE_METADATA','BUILT_IN_LOCALES','LOCALE_SETTINGS_NAMESPACE','LOCALE_PREFERENCE_FIELD','LOCALE_ID_PATTERN','LOCALE_IDS'])
function select(tree) { return tree.statements.filter(node =>
 (ts.isClassDeclaration(node) && node.name?.text==='LocaleRuntime') ||
 (ts.isFunctionDeclaration(node) && node.name?.text!=='apply') ||
 (ts.isVariableStatement(node) && node.declarationList.declarations.every(declaration=>names.has(declaration.name.getText(tree))))
).map(node=>node.getText(tree)).join('\n') }
// Execute the unchanged public LocaleRuntime and its unchanged constants/helpers.
// No Host, UI renderer, language-row plugin or filesystem settings adapter is started.
const module = {exports:{}}
const output = ts.transpileModule(select(settingsTree)+'\n'+select(tree),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
new Function('module','exports',output)(module,module.exports)
export const LocaleRuntime = module.exports.LocaleRuntime
export function actualLocale(language) {
 return new LocaleRuntime({emit(){},effect(fn){return fn()}},undefined,{languages:[language],preference:language})
}
