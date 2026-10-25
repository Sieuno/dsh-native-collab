import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { all, contract, fixture, inserted, PACKAGE, placeholderIds } from './rc8-boot-switch.test.mjs'

const rejectedModules = ['@deepseek-ai/dsh-agent-team', '@deepseek-ai/dsh-tool-agent-team', '@deepseek-ai/dsh-tool-subagent/fork']

function rc8Unique(rows, id, name) {
  const matches = rows.filter(row => row.id === id)
  return matches.length === 1 && matches[0].name === name
}

test('real fixture rejects RC8 fake modules and name-only ordinary matching', () => {
  const names = new Set([
    ...contract.nativeRoots.map(row => row.name),
    ...contract.presets.flatMap(preset => preset.config.plugins.map(plugin => plugin.name)),
  ])
  for (const name of rejectedModules) assert.equal(names.has(name), false, name)
  assert.equal(rc8Unique(contract.nativeRoots, 'agent-team', '@deepseek-ai/dsh-agent-team'), false)
  assert.equal(rc8Unique(contract.nativeRoots, 'tool-agent-team', '@deepseek-ai/dsh-tool-agent-team'), false)
  assert.equal(rc8Unique(contract.nativeRoots, 'agent-team', contract.nativeRoots.find(row => row.id === 'agent-team').name), true)
  for (const preset of contract.presets) {
    if (preset.config.plugins.length === 0) {
      assert.equal(preset.id, 'preset-minimal')
      continue
    }
    const nativeName = preset.config.plugins[0].name
    assert.equal(preset.config.plugins.filter(plugin => plugin.name === nativeName).length, 2)
    assert.equal(preset.config.plugins.filter(plugin => plugin.name === '@deepseek-ai/dsh-tool-subagent/fork').length, 0)
    assert.equal(new Set(preset.config.plugins.map(plugin => plugin.id)).size, 2)
    assert.deepEqual(preset.config.plugins.map(plugin => plugin.config.provider).sort(), ['fork', 'spawn'])
  }
})

test('RC9 plans and applies enable/restore against the real fixture without touching unrelated config', async () => {
  const f = await fixture()
  const namesBefore = new Set(await readdir(f.context.dir))
  const preview = await f.component.plan('enable')
  assert.equal(preview.error, null)
  const standard = preview.targets.filter(target => target.scope === 'preset:preset-standard')
  const fixtureName = contract.presets.find(preset => preset.id === 'preset-standard').config.plugins[0].name
  assert.equal(standard.length, 2)
  assert.ok(standard.every(target => target.previousModule === fixtureName))
  assert.deepEqual(standard.map(target => target.id).sort(), ['tool-subagent', 'tool-subagent-fork'])
  assert.equal((await f.component.apply(preview.planId)).accepted, true)
  const enabled = f.compose()
  for (const presetId of ['preset-standard', 'preset-ptc', 'preset-cordis']) {
    const plugins = all(enabled.find(row => row.id === presetId).config.plugins)
    const spawn = plugins.find(row => row.id === 'tool-subagent')
    const fork = plugins.find(row => row.id === 'tool-subagent-fork')
    assert.equal(spawn.name, inserted.find(row => row.id === 'dsh-native-collab-tool-subagent').name)
    assert.equal(fork.name, inserted.find(row => row.id === 'dsh-native-collab-tool-subagent-fork').name)
    assert.equal(spawn.config.provider, 'spawn')
    assert.equal(fork.config.provider, 'fork')
    assert.equal(spawn.config.toolName, 'subagent')
    assert.equal(fork.config.toolName, 'subagent_fork')
    assert.equal(spawn.id, 'tool-subagent')
    assert.equal(fork.id, 'tool-subagent-fork')
  }
  assert.equal(enabled.find(row => row.id === 'preset-standard').config.plugins.find(row => row.id === 'tool-subagent'), undefined)
  const nestedSpawn = all(enabled.find(row => row.id === 'preset-standard').config.plugins).find(row => row.id === 'tool-subagent')
  assert.equal(nestedSpawn.config.modelSelectionSettings, true)
  assert.deepEqual(enabled.find(row => row.id === 'agent-team').config, contract.nativeRoots.find(row => row.id === 'agent-team').config)
  assert.deepEqual(enabled.find(row => row.id === 'tool-agent-team').config, contract.nativeRoots.find(row => row.id === 'tool-agent-team').config)
  for (const id of placeholderIds) assert.equal(enabled.find(row => row.id === id).disabled, true)
  assert.deepEqual(enabled.find(row => row.id === 'preset-minimal').config.plugins, [])
  const off = await f.component.plan('restore')
  assert.equal(off.error, null)
  assert.equal(off.targets.find(target => target.scope === 'root' && target.id === 'tool-subagent-control').operation, 'enable')
  assert.equal(off.targets.find(target => target.scope === 'root' && target.id === 'tool-subagent-list-agents').operation, 'enable')
  assert.equal(off.targets.find(target => target.scope === 'root' && target.id === 'subagent').operation, 'enable')
  assert.equal((await f.component.apply(off.planId)).configured, 'disabled')
  const restored = f.compose()
  const restoredSpawn = all(restored.find(row => row.id === 'preset-standard').config.plugins).find(row => row.id === 'tool-subagent')
  assert.equal(restoredSpawn.name, fixtureName)
  assert.equal(restoredSpawn.config.provider, 'spawn')
  assert.equal(restoredSpawn.config.toolName, 'subagent')
  assert.equal(restoredSpawn.config.modelSelectionSettings, true)
  assert.equal(restored.find(row => row.id === 'tool-subagent-control').disabled, false)
  assert.equal(restored.find(row => row.id === 'tool-subagent-list-agents').disabled, false)
  assert.equal(restored.find(row => row.id === 'subagent').disabled, undefined)
  for (const name of await readdir(f.context.dir)) assert.ok(namesBefore.has(name), name)
})

function legacyRows() {
  const rows = contract.nativeRoots.map(root => ({ id: root.id, disabled: true }))
  for (const row of inserted) {
    if (row.id === 'dsh-native-collab-ui' || placeholderIds.has(row.id)) continue
    rows.push({ id: row.id, disabled: false })
  }
  for (const preset of contract.presets) {
    if (preset.config.plugins.length === 0) continue
    rows.push({
      id: preset.id,
      name: preset.name,
      config: {
        plugins: preset.config.plugins.map(plugin => {
          const derivedId = plugin.config.provider === 'fork' ? 'dsh-native-collab-tool-subagent-fork' : 'dsh-native-collab-tool-subagent'
          return {
            id: derivedId,
            name: inserted.find(row => row.id === derivedId).name,
            config: { provider: plugin.config.provider, toolName: plugin.config.toolName },
          }
        }),
      },
    })
  }
  return rows
}

test('in-profile legacy enable restores native identity; a CLI overlay is refused and left untouched', async () => {
  const legacy = await fixture({ content: `# legacy in-profile enable\n${JSON.stringify(legacyRows(), null, 2)}\n` })
  const before = await legacy.text()
  const status = await legacy.component.status()
  assert.equal(status.configured, 'enabled')
  assert.equal(status.writeSupport, 'available')
  const off = await legacy.component.plan('restore')
  assert.equal(off.error, null)
  assert.equal((await legacy.component.apply(off.planId)).accepted, true)
  const restored = legacy.compose()
  for (const preset of contract.presets) {
    const plugins = all(restored.find(row => row.id === preset.id).config.plugins)
    if (preset.config.plugins.length === 0) {
      assert.deepEqual(plugins, [])
      continue
    }
    for (const original of preset.config.plugins) {
      const row = plugins.find(item => item.id === original.id)
      assert.equal(row.name, original.name)
      assert.equal(row.config.provider, original.config.provider)
      assert.equal(row.config.toolName, original.config.toolName)
      assert.equal(row.config.modelSelectionSettings, undefined)
    }
  }
  const offText = await legacy.text()
  assert.match(offText, /legacy in-profile enable/)
  assert.ok(!offText.includes(PACKAGE))
  assert.notEqual(offText, before)
  for (const root of contract.nativeRoots) assert.notEqual(restored.find(row => row.id === root.id).disabled, true, `fixed native state must enable ${root.id}`)

  const overlay = [{ id: 'dsh-native-collab-agent-team', name: inserted.find(row => row.id === 'dsh-native-collab-agent-team').name, disabled: true }]
  const external = await fixture({ overlays: overlay })
  const externalBefore = await external.text()
  const refused = await external.component.plan('restore')
  assert.equal(refused.error, 'external-derived-reference')
  assert.ok(refused.warnings.includes('remove-external-overlay'))
  assert.equal(await external.text(), externalBefore)
  assert.deepEqual(external.context.overlays, overlay)

  const commandLine = await fixture({ overlays: [{ id: 'subagent', disabled: false }] })
  const commandBefore = await commandLine.text()
  const blocked = await commandLine.component.plan('enable')
  assert.equal(blocked.error, 'higher-priority-override')
  assert.ok(blocked.warnings.includes('remove-external-overlay'))
  assert.equal(await commandLine.text(), commandBefore)
  assert.deepEqual(commandLine.context.overlays, [{ id: 'subagent', disabled: false }])
})

test('writeSupport is blocked when the real target is missing or ambiguous', async () => {
  const ambiguous = await fixture({ content: '- id: preset-standard\n  config:\n    plugins:\n      - {id: a, name: "@deepseek-ai/dsh-tool-subagent"}\n      - {id: b, name: "@deepseek-ai/dsh-tool-subagent"}\n' })
  const ambiguousBefore = await ambiguous.text()
  const ambiguousStatus = await ambiguous.component.status()
  assert.equal(ambiguousStatus.writeSupport, 'blocked')
  assert.equal(ambiguousStatus.error, 'ambiguous-preset-target')
  assert.equal((await ambiguous.component.plan('enable')).error, 'ambiguous-preset-target')
  assert.equal(await ambiguous.text(), ambiguousBefore)

  const missing = await fixture({ omitRootId: 'agent-team' })
  const missingStatus = await missing.component.status()
  assert.equal(missingStatus.writeSupport, 'blocked')
  assert.equal(missingStatus.error, 'missing-or-ambiguous-target')
  assert.notEqual(missingStatus.writeSupport, 'available')
  const home = await fixture()
  const homeFile = join(home.context.home, 'cordis.patch.yml')
  const homeText = '- id: agent-team\n  disabled: true\n'
  const { writeFile } = await import('node:fs/promises')
  await writeFile(homeFile, homeText)
  const homePlan = await home.component.plan('restore')
  assert.equal(homePlan.error, 'higher-priority-override')
  assert.equal(await readFile(homeFile, 'utf8'), homeText)
})
