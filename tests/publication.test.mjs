import test from 'node:test'
import assert from 'node:assert/strict'
import { join, resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { parsePublishOptions, publicationCommand } from '../scripts/publish-command.mjs'
const root = resolve('.')
test('publication options require explicit existing-manager opt-in and reject ambiguous arguments', () => {
  assert.deepEqual(parsePublishOptions(['v0.3.2']), { tag: 'v0.3.2', pnpmCli: null })
  const cli = join(root, 'temporary manager', 'bin', 'pnpm.mjs')
  assert.deepEqual(parsePublishOptions(['v0.3.2','--pnpm-cli',cli]), { tag: 'v0.3.2', pnpmCli: cli })
  for (const argv of [[], ['main'], ['v0.3.2','--force'], ['v0.3.2','--pnpm-cli'], ['v0.3.2','--pnpm-cli','--install'], ['v0.3.2','--pnpm-cli','pnpm.cmd']]) assert.throws(() => parsePublishOptions(argv))
})
test('publication keeps the verified TGZ arguments and never uses a shell', () => {
  const filename = join(root,'verified release','package.tgz'), cli = join(root,'existing manager','bin','pnpm.mjs')
  const base = { execPath: process.execPath, platform: process.platform, filename }
  const expected = ['publish',filename,'--access','public','--ignore-scripts','--registry','https://registry.npmjs.org/']
  assert.deepEqual(publicationCommand({ ...base,pnpmCli: cli }), { program: process.execPath,args:[cli,...expected] })
  assert.deepEqual(publicationCommand({ ...base,platform:'linux' }), { program:'npm',args:expected })
  const windows = publicationCommand({ ...base,platform:'win32',execPath:String.raw`C:\Program Files\nodejs\node.exe` })
  assert.equal(windows.program,String.raw`C:\Program Files\nodejs\node.exe`)
  assert.equal(windows.args[0],String.raw`C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js`)
  assert.deepEqual(windows.args.slice(1),expected)
  assert.throws(() => publicationCommand({ ...base,filename:'relative.tgz' }))
  assert.throws(() => publicationCommand({ ...base,otp:'not-a-code' }))
})
test('npm publication continues to require the same verified GitHub Release asset', async () => {
  const source = await readFile('scripts/publish-release.mjs','utf8')
  assert.match(source,/assets.length !== 1/)
  assert.match(source,/digest !== asset.digest/)
  assert.match(source,/data.length !== asset.size/)
  assert.doesNotMatch(source,/command\(['"]npm['"],\s*\[['"](?:pack|publish)/)
})
