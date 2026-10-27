/** Opt-in isolated module/configuration checks; never opens a Profile or executes Agent tasks. */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const readRoots = []
let root = resolve(here, '..'), sdkMap = '', report = ''
for (let i=0;i<args.length;i++) {
  const option = args[i], value = args[++i]
  if (!value) throw new Error(`Missing value for ${option}`)
  if (option === '--package-dir') root = resolve(value)
  else if (option === '--sdk-map') sdkMap = resolve(value)
  else if (option === '--read-root') readRoots.push(resolve(value))
  else if (option === '--report') report = resolve(value)
  else throw new Error(`Unknown option ${option}`)
}
if (!readRoots.length) readRoots.push(root)
if (!report) report = join(root, '.test-artifacts/isolated-load.json')
const scratch = join(dirname(report), 'isolated-empty-home')
await mkdir(scratch, {recursive:true})
const pkg = JSON.parse(await readFile(join(root,'package.json'),'utf8'))
async function walk(directory) {
  const files = []
  for (const item of await readdir(directory, {withFileTypes:true})) {
    const path = join(directory,item.name)
    if (item.isDirectory()) files.push(...await walk(path))
    else if (item.name.endsWith('.js')) files.push(path)
  }
  return files
}
const files = [...new Set([...Object.values(pkg.exports).filter(value=>typeof value==='string' && value.endsWith('.js')).map(path=>resolve(root,path)), ...await walk(join(root,'dist'))])]
const results = []
for (const file of files) {
  const child = spawnSync(process.execPath, ['--permission', ...readRoots.map(root=>`--allow-fs-read=${root}`), join(here,'isolated-load-child.mjs'),file,sdkMap], {
    cwd:scratch, encoding:'utf8', timeout:15000, maxBuffer:2*1024*1024,
    env:{SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,USERPROFILE:scratch,HOME:scratch,APPDATA:scratch,LOCALAPPDATA:scratch,TEMP:scratch,TMP:scratch,NO_COLOR:'1'},
  })
  const row = {file,status:child.status,signal:child.signal,output:child.stdout.trim(),error:child.stderr.trim(),runnerError:child.error?.message}
  results.push(row)
  if (row.status !== 0) console.error(JSON.stringify(row))
}
const summary = {package:pkg.name,version:pkg.version,modules:results.length,passed:results.filter(row=>row.status===0).length,readRoots,sdkMap:sdkMap || null,scope:'actual module evaluation, schema parsing and in-memory isolated root construction; browser registration only; no Profile, gateway, tasks, managed service business flow or real renderer',results}
await writeFile(report,JSON.stringify(summary,null,2))
console.log(`${summary.passed}/${summary.modules} shipped modules passed isolated loading. Report: ${report}`)
if (summary.passed !== summary.modules) process.exitCode = 1
