import test from 'node:test'
import assert from 'node:assert/strict'
import { fixture } from './native-fixture.mjs'

test('installed patch orders official tools behind extension without renaming them', async t => {
  const f = await fixture({ modelSource: 'all' }, { startup: true })
  t.after(() => f.dispose())
  assert.equal(f.ctx.loader.resolve('tool-subagent').options.name, '@deepseek-ai/dsh-tool-subagent')
  assert.equal(f.ctx.loader.resolve('tool-subagent-control').options.name, '@deepseek-ai/dsh-tool-subagent-control')
  assert.equal(f.ctx.tools.get('send_message').parameters.properties.task_result.type, 'boolean')
  assert.deepEqual([...f.ctx.loader.entries()].filter(entry => entry.options.name.startsWith('@sieuno/')).map(entry => entry.options.id), ['dsh-native-collab-ui'])
  assert.equal((await f.call('subagent', { description: 'Test', prompt: 'Test', provider: 'mock', model: 'extra' })).isError, false)
})

test('omitting the bundle layer starts unchanged native tools without an extension service', async t => {
  const f = await fixture({}, { startup: true, bundleEnabled: false })
  t.after(() => f.dispose())
  assert.equal(f.ctx.get('collabEnhancements'), undefined)
  assert.equal(f.entry, undefined)
  assert.equal(f.ctx.loader.resolve('tool-subagent').options.inject, undefined)
  assert.equal(f.ctx.tools.get('send_message').parameters.properties.task_result, undefined)
  assert.equal(f.ctx.tools.get('subagent').parameters.properties.model, undefined)
  assert.equal(f.ctx.tools.get('list_subagent_models'), undefined)
  for (let i = 0; i < 35; i++) assert.equal((await f.call('send_message', { agent: 'child', message: 'native' })).isError, false)
})

test('official provider tool reload reinstalls the extension exactly once', async t => {
  const f = await fixture({ modelSource: 'all' }, { startup: true })
  t.after(() => f.dispose())
  const entry = f.ctx.loader.resolve('tool-subagent')
  await entry.update({ config: { ...entry.options.config, agentOptions: { maxTokens: 128 } } })
  await entry.fiber.await()
  const result = await f.call('subagent', { description: 'Reload', prompt: 'Test', provider: 'mock', model: 'extra' })
  assert.equal(result.isError, false)
  assert.equal(f.starts[0].agentOptions.maxTokens, 128)
  const prompt = await f.ctx.systemPrompt.assemble({ agent: f.parent, scope: f.parent })
  assert.equal(prompt.sections.filter(section => section.name === 'native-collab:delegation').length, 1)
})
