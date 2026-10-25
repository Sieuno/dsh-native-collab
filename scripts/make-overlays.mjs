import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
let outArg = 'generated-overlays'
for (let i = 0; i < args.length; i += 1) {
  if (args[i] !== '--out' || args[i + 1] === undefined || args[i + 1].startsWith('--')) {
    throw new Error('usage: node scripts/make-overlays.mjs [--out <directory>]')
  }
  outArg = args[++i]
}
const out = isAbsolute(outArg) ? outArg : resolve(root, outArg)

// Root-level illustration only. It does not rewrite preset-standard.config.plugins.
const rows = [
  ['subagent', 'dsh-native-collab-subagent'],
  ['tool-subagent-control', 'dsh-native-collab-tool-subagent-control'],
  ['tool-subagent-list-agents', 'dsh-native-collab-tool-subagent-list-agents'],
  ['agent-team', 'dsh-native-collab-agent-team'],
  ['tool-agent-team', 'dsh-native-collab-tool-agent-team'],
]
function patch(enabled) {
  const lines = [
    '# MANUAL NEXT-START EXAMPLE ONLY; inspect and merge against your own profile.',
    '# Requires all five native root IDs to exist exactly once in this profile.',
    '# Preset-internal rows and arbitrary saved config are not handled.',
  ]
  for (const [nativeId, derivedId] of rows) {
    lines.push(`- id: "${nativeId}"`, `  disabled: ${enabled ? 'true' : 'false'}`)
    lines.push(`- id: "${derivedId}"`, `  disabled: ${enabled ? 'false' : 'true'}`)
  }
  return `${lines.join('\n')}\n`
}
await mkdir(out, { recursive: true })
await writeFile(join(out, 'root-enable.example.patch.yml'), patch(true))
await writeFile(join(out, 'root-restore.example.patch.yml'), patch(false))
const preset = [
  '# ISOLATED PRESET EXAMPLE. Do not merge this into the five-row root enable or restore examples.',
  '# Same-scope replacement only: disable the official tool rows in that preset, then enable the derived rows.',
  '# This script does not read or write a Profile.',
  '- id: "tool-subagent"',
  '  disabled: true',
  '- id: "dsh-native-collab-tool-subagent"',
  '  disabled: false',
  '- id: "tool-subagent-fork"',
  '  disabled: true',
  '- id: "dsh-native-collab-tool-subagent-fork"',
  '  disabled: false',
].join('\n') + '\n'
await writeFile(join(out, 'preset-tool-subagent-replacement.example.yml'), preset)
console.log(`Wrote root-level examples and one isolated preset example to ${out}; no profile was read or modified.`)
