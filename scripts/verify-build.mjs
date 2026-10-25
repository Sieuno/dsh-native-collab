import { readdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
async function snapshot(dir, prefix = '') {
  const result = new Map()
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = prefix + entry.name
    if (entry.isDirectory()) {
      for (const [key, hash] of await snapshot(join(dir, entry.name), name + '/')) result.set(key, hash)
    } else if (entry.name.endsWith('.js')) {
      result.set(name, createHash('sha256').update(await readFile(join(dir, entry.name))).digest('hex'))
    }
  }
  return result
}
const before = await snapshot(join(root, 'dist'))
if (!before.size) throw new Error('No checked-in dist JS to compare')
const build = spawnSync(process.execPath, [join(root, 'scripts/emit-dist.mjs')], { cwd: root, stdio: 'inherit' })
if (build.error) throw build.error
if (build.status !== 0) process.exit(build.status ?? 1)
const after = await snapshot(join(root, 'dist'))
const changed = [...new Set([...before.keys(), ...after.keys()])].filter(name => before.get(name) !== after.get(name))
if (changed.length) throw new Error(`Rebuild differs: ${changed.join(', ')}`)
console.log(`Rebuilt ${before.size} JS files match checked-in output byte-for-byte; not a full typecheck.`)
