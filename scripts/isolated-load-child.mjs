/** Runs only in the read-only, network-blocked child created by check-load.mjs. */
import net from 'node:net'
import tls from 'node:tls'
import http from 'node:http'
import https from 'node:https'
import http2 from 'node:http2'
import dgram from 'node:dgram'
import dns from 'node:dns'
import childProcess from 'node:child_process'
import { readFileSync } from 'node:fs'
import { syncBuiltinESMExports, registerHooks } from 'node:module'
import { pathToFileURL } from 'node:url'
const deny = () => { throw new Error('Isolation policy: network/process creation prohibited') }
for (const [module, names] of [[net,['connect','createConnection','createServer']], [tls,['connect','createServer']], [http,['request','get','createServer']], [https,['request','get','createServer']], [http2,['connect','createServer','createSecureServer']], [dgram,['createSocket']], [dns,['lookup','resolve','resolve4','resolve6']], [childProcess,['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork']]]) {
  for (const name of names) if (typeof module[name] === 'function') module[name] = deny
}
net.Socket.prototype.connect = deny
net.Server.prototype.listen = deny
for (const key of Object.keys(dns.promises)) if (typeof dns.promises[key] === 'function') dns.promises[key] = deny
for (const name of ['fetch','WebSocket','EventSource']) if (name in globalThis) globalThis[name] = deny
syncBuiltinESMExports()
const sdkMap = process.argv[3] ? JSON.parse(readFileSync(process.argv[3], 'utf8')) : {}
registerHooks({ resolve(specifier, context, next) {
  const file = sdkMap[specifier]
  return file ? { url: pathToFileURL(file).href, shortCircuit: true } : next(specifier, context)
} })
const check = (condition, message) => { if (!condition) throw new Error(message) }
const unwrap = value => typeof value?.get === 'function' ? value.get() : value
function rejects(schema, value, label) {
  let rejected = false
  try { schema(value) } catch { rejected = true }
  check(rejected, `Schema accepted invalid ${label}`)
}
try {
  const file = process.argv[2]
  const isClient = file.replaceAll('\\', '/').endsWith('/dist/client.js')
  const registrations = []
  if (isClient) globalThis.window = { __ModuleLoader__: { load: entry => registrations.push(entry) } }
  const module = await import(pathToFileURL(file).href)
  const config = module.Config ?? module.default?.Config
  let configChecks = 0
  if (config) {
    check(typeof config === 'function', 'Config is not a callable host schema')
    const defaults = config({})
    configChecks++
    if (config.dict?.runtimeMode) {
      check(unwrap(defaults.runtimeMode) === 'managed', 'Management entry must default to automatic assembly')
      for (const mode of ['native','managed']) { check(unwrap(config({runtimeMode:mode}).runtimeMode) === mode, `Wrong ${mode} mode`); configChecks++ }
      for (const mode of ['bad',1,{},[]]) { rejects(config, {runtimeMode:mode}, 'runtime mode'); configChecks++ }
      for (const name of ['modelEnhancement','communicationEnhancement','runningChildGuidance','completedChildContinuation','nativeModelSelectionCompatibility']) {
        check(unwrap(defaults[name]) === undefined, `${name} gained an unintended default`)
        for (const value of [true,false]) { check(unwrap(config({[name]:value})[name]) === value, `Wrong ${name} boolean`); configChecks++ }
        rejects(config, {[name]:'true'}, name); configChecks++
      }
      check(unwrap(defaults.modelSource) === undefined, 'Model source must remain optional for legacy migration')
      for (const source of ['conversation','settings','all']) { check(unwrap(config({modelSource:source}).modelSource) === source, 'Wrong model source'); configChecks++ }
      for (const source of ['unknown',true,0,{},[]]) { rejects(config, {modelSource:source}, 'model source'); configChecks++ }
      check(unwrap(defaults.teamRequestLimit) === undefined, 'Quota must remain unset by default')
      for (const value of [1,32,Number.MAX_SAFE_INTEGER]) { check(unwrap(config({teamRequestLimit:value}).teamRequestLimit) === value, 'Wrong quota'); configChecks++ }
      for (const value of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1,'32']) { rejects(config, {teamRequestLimit:value}, 'quota'); configChecks++ }
    }
    JSON.stringify(config.toJSON())
  }
  let isolatedConstruction = false
  if (file.replaceAll('\\', '/').endsWith('/dist/agent-team/bootstrap.js')) {
    const { Context } = await import('@deepseek-ai/cordis')
    const ctx = new Context()
    const fiber = ctx.plugin(module.default, {})
    try {
      await Promise.resolve()
      check(fiber.state !== 2 && ctx.get('collabUi') === undefined, 'Management entry must wait for startup inventory services')
      // Explicit empty-inventory fixtures, not SDK substitutes or a real Profile.
      ctx.provide('loader', { entries: () => [] })
      ctx.provide('pluginManager', { async listPlugins() { return [] } })
      await fiber
      check(fiber.state === 2, 'Root management fiber failed to activate in an isolated Context')
      const service = ctx.get('collabUi')
      check(service && typeof service.status === 'function', 'Management service was not provided')
      await Promise.resolve()
      const status = await service.status()
      check(status.runtime.mode === 'managed' && status.runtime.phase === 'failed', 'Isolated construction must fail closed without plugin inventory')
      check(status.runtime.services.length === 3 && status.runtime.services.every(row => row.failure === 'ownership-unverified'), 'Missing ownership must not start runtime providers')
      isolatedConstruction = true
    } finally { await fiber.dispose() }
  }
  if (isClient) check(registrations.length === 1 && registrations[0].id === '@sieuno/dsh-native-collab' && typeof registrations[0].factory === 'function', 'Browser module registration is invalid')
  console.log(JSON.stringify({ok:true,file,exports:Object.keys(module),configChecks,isolatedConstruction,browserRegistrationOnly:isClient}))
  process.exit(0)
} catch (error) {
  console.error(JSON.stringify({ok:false,file:process.argv[2],error:String(error?.stack ?? error)}))
  process.exit(1)
}
