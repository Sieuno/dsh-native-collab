/**
 * Loads the installed DSH 0.2.1-rc.2 ClientRemote and TypertRegistry.
 * Source: the installed app.asar selected explicitly by DSH_OFFICIAL_ASAR.
 *   node_modules/@deepseek-ai/dsh-api-gateway/lib/client.node.js
 *     (package export "./client", node condition; version 0.2.1-rc.2)
 *   node_modules/@deepseek-ai/dsh-deque/lib/index.js
 *   node_modules/@deepseek-ai/dsh-typert-registry/lib/index.js
 * cordis, dsh-typert-protocol, and zod resolve from the node_modules
 * junction. Only those asar entries are read. The host is not copied, installed,
 * or started, and no socket is opened.
 */
import { createRequire } from 'node:module'
import { openSync, readSync, closeSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'

export const OFFICIAL_ASAR = process.env.DSH_OFFICIAL_ASAR
if (!OFFICIAL_ASAR) throw new Error('Set DSH_OFFICIAL_ASAR to an existing DSH 0.2.1-rc.2 app.asar; this test never installs a host.')
export const OFFICIAL_SOURCE = [
  'installed app.asar @deepseek-ai/dsh-api-gateway@0.2.1-rc.2 lib/client.node.js (export ./client, node condition)',
  'installed app.asar @deepseek-ai/dsh-deque lib/index.js',
  'installed app.asar @deepseek-ai/dsh-typert-registry lib/index.js',
].join('; ')

const require = createRequire(import.meta.url)

function fileURL(path) {
  return pathToFileURL(path).href
}

function resolveEsm(specifier, esmRelative) {
  const packageJson = require.resolve(`${specifier}/package.json`)
  return fileURL(join(dirname(packageJson), esmRelative))
}

function readAsar(path) {
  const fd = openSync(OFFICIAL_ASAR, 'r')
  try {
    const sizeBuf = Buffer.alloc(8)
    readSync(fd, sizeBuf, 0, 8, 0)
    const headerSize = sizeBuf.readUInt32LE(4)
    const headerBuf = Buffer.alloc(headerSize)
    readSync(fd, headerBuf, 0, headerSize, 8)
    const strLen = headerBuf.readUInt32LE(4)
    const tree = JSON.parse(headerBuf.subarray(8, 8 + strLen).toString('utf8'))
    const dataStart = 8 + headerSize
    let node = tree
    for (const part of path.split('/')) {
      node = node.files?.[part]
      if (!node) throw new Error(`asar entry missing: ${path}`)
    }
    const size = Number(node.size)
    const buf = Buffer.alloc(size)
    readSync(fd, buf, 0, size, dataStart + Number(node.offset))
    return buf.toString('utf8')
  } finally {
    closeSync(fd)
  }
}

function rewriteImports(source, replacements) {
  return source.replace(/^import\s+\{([^}]+)\}\s+from\s+"([^"]+)";/gm, (line, names, spec) => {
    const target = replacements[spec]
    if (!target) throw new Error(`unexpected bare import ${JSON.stringify(spec)} while loading official ClientRemote`)
    return `import {${names}} from ${JSON.stringify(target)};`
  })
}

let loaded
export async function loadOfficialClient() {
  if (loaded) return loaded
  const officialPackage = JSON.parse(readAsar('node_modules/@deepseek-ai/dsh-api-gateway/package.json'))
  if (officialPackage.name !== '@deepseek-ai/dsh-api-gateway' || officialPackage.version !== '0.2.1-rc.2') {
    throw new Error('DSH_OFFICIAL_ASAR must contain @deepseek-ai/dsh-api-gateway@0.2.1-rc.2')
  }
  const hashes = {}
  const readModule = path => {
    const source = readAsar(path)
    hashes[path] = createHash('sha256').update(source).digest('hex')
    return source
  }
  const cordis = fileURL(require.resolve('@deepseek-ai/cordis'))
  const protocol = fileURL(require.resolve('@deepseek-ai/dsh-typert-protocol'))
  const zod = resolveEsm('zod', 'index.js')
  const dequeSource = readModule('node_modules/@deepseek-ai/dsh-deque/lib/index.js')
  const registrySource = rewriteImports(
    readModule('node_modules/@deepseek-ai/dsh-typert-registry/lib/index.js'),
    { '@deepseek-ai/cordis': cordis, zod },
  )
  const clientSource = rewriteImports(
    readModule('node_modules/@deepseek-ai/dsh-api-gateway/lib/client.node.js'),
    { '@deepseek-ai/cordis': cordis, '@deepseek-ai/dsh-typert-protocol': protocol, '@deepseek-ai/dsh-deque': './deque.js' },
  )
  if (!clientSource.includes('function validateContribution') && !clientSource.includes('validateContribution')) {
    throw new Error('installed client.node.js does not contain validateContribution')
  }
  const dir = mkdtempSync(join(tmpdir(), 'dsh-official-client-'))
  try {
    writeFileSync(join(dir, 'deque.js'), dequeSource)
    writeFileSync(join(dir, 'registry.js'), registrySource)
    writeFileSync(join(dir, 'client.js'), clientSource)
    const clientURL = fileURL(join(dir, 'client.js'))
    const registryURL = fileURL(join(dir, 'registry.js'))
    const client = await import(clientURL)
    const registry = await import(registryURL)
    if (typeof client.apply !== 'function' || !Array.isArray(client.inject)) {
      throw new Error('installed client.node.js did not export apply/inject')
    }
    if (typeof registry.TypertRegistry !== 'function') {
      throw new Error('installed typert registry did not export TypertRegistry')
    }
    loaded = {
      source: OFFICIAL_SOURCE,
      hashes: Object.freeze(hashes),
      apply: client.apply,
      inject: client.inject,
      TypertRegistry: registry.TypertRegistry,
    }
    return loaded
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

export function offlineConnection(calls, respond) {
  return {
    interactions: 'none',
    isLoopback: true,
    openWebSocket() { throw new Error('network forbidden: openWebSocket') },
    generation: { getSnapshot: () => undefined, subscribe: () => () => {} },
    state: { getSnapshot: () => undefined, subscribe: () => () => {} },
    reconnect() { throw new Error('network forbidden: reconnect') },
    registerGenerationSource: () => () => {},
    start() { throw new Error('network forbidden: connection.start') },
    rpc: {
      open() { throw new Error('network forbidden: rpc.open') },
      async call(path, endpoint, body) {
        calls.push({ path, endpoint, args: body?.args })
        return respond(path, endpoint, body)
      },
    },
  }
}
