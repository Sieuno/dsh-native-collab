import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { SDK_TARGETS } from '../scripts/host-compatibility.mjs'

const require = createRequire(import.meta.url)

function packageIdentity(name) {
  const entry = require.resolve(name)
  let dir = dirname(entry)
  while (true) {
    try {
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
      if (pkg.name === name) return { name: pkg.name, version: pkg.version, entry }
    } catch (error) { if (error.code !== 'ENOENT') throw error }
    const parent = dirname(dir)
    if (parent === dir) throw new Error(`Unable to find package identity for ` + name)
    dir = parent
  }
}

export function sdkEnvironment() {
  const mode = process.env.DSH_SDK_ENVIRONMENT
  if (mode !== 'sdk-only' && mode !== 'host') {
    throw new Error('Set DSH_SDK_ENVIRONMENT=sdk-only or DSH_SDK_ENVIRONMENT=host explicitly.')
  }
  const sdk = packageIdentity('@deepseek-ai/dsh-tools')
  const selected = Object.entries(SDK_TARGETS).find(([, lane]) => lane.version === sdk.version)
  if (!selected) throw new Error('Unsupported SDK version ' + sdk.version)
  if (mode === 'sdk-only') {
    for (const name of ['@deepseek-ai/dsh-settings', '@deepseek-ai/dsh-config-editor', '@deepseek-ai/dsh-app-boot']) {
      assert.throws(() => require.resolve(name), { code: 'MODULE_NOT_FOUND' }, name + ' must remain unavailable in sdk-only mode')
    }
  } else {
    const host = packageIdentity('@deepseek-ai/dsh-app-boot')
    assert.equal(host.name, '@deepseek-ai/dsh-app-boot')
    assert.equal(host.version, sdk.version, 'Host package identity must match the selected DSH SDK line')
    // Deliberately inspect only package metadata and resolution; never import/evaluate Host code.
  }
  return { mode, version: sdk.version, line: selected[0], execution: selected[1].execution }
}

export async function mountToolExecutor(ctx, fibers) {
  const environment = sdkEnvironment()
  if (environment.line === 'alpha2') {
    const executorModule = await import('@deepseek-ai/dsh-tool-executor-native')
    fibers.push(await ctx.plugin(executorModule.default ?? executorModule))
  }
  return environment
}

export async function executeToolCall(ctx, input) {
  const environment = sdkEnvironment()
  if (environment.line === 'rc2') return ctx.tools.execute(input)
  const { ToolCallId } = await import('@deepseek-ai/dsh-llm')
  const batch = await ctx.tools.execute({
    calls: [{ type: 'tool-call', id: ToolCallId(String(input.callId)), name: input.name, arguments: JSON.stringify(input.arguments) }],
    signal: input.signal,
    ...(input.agent ? { agent: input.agent } : {}),
  })
  assert.equal(batch.results.length, 1, 'native executor must return exactly one outcome for one input call')
  assert.equal(String(batch.results[0].callId), String(input.callId), 'native executor outcome must correlate to its input call')
  return batch.results[0].result
}
