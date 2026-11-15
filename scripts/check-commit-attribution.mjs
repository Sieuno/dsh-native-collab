import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Known attribution formats, not a detector for AI-assisted source code.
// https://github.com/openai/codex/discussions/2807
// https://github.com/anthropics/claude-code/issues/102266
const agentEmails = new Set([
  'codex@openai.com', 'noreply@openai.com', 'codex@example.com',
  'noreply@anthropic.com', 'claude@anthropic.com', 'claude-code@anthropic.com', 'code@anthropic.com',
])

function canonical(value) {
  return value.normalize('NFKC').replace(/[\u200b-\u200d\ufeff]/g, '').trim()
}

/** Identify tool identities in Git identity fields and attribution trailers. */
export function forbiddenIdentity(name, email = '') {
  const label = canonical(name)
  const address = canonical(email).toLowerCase()
  if (/\bcodex\b/i.test(label)
    || /^(?:\d+\+)?(?:chatgpt-)?codex(?:-connector)?(?:\[bot\])?@users\.noreply\.github\.com$/.test(address)) return 'Codex'
  if (/^claude(?:$|\[bot\]|[ _-]+(?:code|opus|sonnet|haiku|agent|bot|\d))/i.test(label)
    || /^(?:\d+\+)?claude(?:-code)?(?:\[bot\])?@users\.noreply\.github\.com$/.test(address)) return 'Claude Code'
  if (agentEmails.has(address)) return /anthropic/.test(address) ? 'Claude Code' : 'Codex'
  return undefined
}

function identity(text) {
  const match = text.match(/^(.*?)\s*<([^<>]+)>/)
  return match ? { name: match[1].trim(), email: match[2] } : { name: text.trim(), email: '' }
}

/** Inspect raw commit metadata, without .mailmap or replacement-ref aliases. */
export function inspectCommit(raw) {
  const split = raw.indexOf('\n\n')
  if (split < 0) throw new Error('Malformed commit object')
  const headers = raw.slice(0, split).split('\n')
  const message = raw.slice(split + 2)
  const violations = []
  for (const field of ['author', 'committer']) {
    const header = headers.find(line => line.startsWith(field + ' '))
    if (!header) throw new Error(`Missing commit ${field}`)
    const value = identity(header.slice(field.length + 1))
    const agent = forbiddenIdentity(value.name, value.email)
    if (agent) violations.push({ field, agent })
  }
  for (const match of message.matchAll(/^[\t ]*(co-authored-by|co-committed-by):[\t ]*(.+)$/gim)) {
    const value = identity(match[2])
    const agent = forbiddenIdentity(value.name, value.email)
    if (agent) violations.push({ field: match[1].toLowerCase(), agent })
  }
  for (const line of message.split('\n')) {
    if (/^\s*(?:🤖\s*)?(?:generated|authored)\s+(?:with|by)\s+/i.test(line)
      && /\bcodex\b|\bclaude[ _-]+code\b/i.test(line)) {
      violations.push({ field: 'tool-attribution-footer', agent: /\bcodex\b/i.test(line) ? 'Codex' : 'Claude Code' })
    }
  }
  return violations
}

/** Scan every ancestor of the selected commit. Missing history fails explicitly. */
export function scanHistory({ cwd = process.cwd(), revision = 'HEAD' } = {}) {
  if (!revision || revision.startsWith('-') || revision.includes('\0')) throw new Error('Invalid commit reference')
  const git = (...args) => execFileSync('git', ['--no-replace-objects', ...args], {
    cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
  }).trimEnd()
  if (git('rev-parse', '--is-shallow-repository') !== 'false') {
    throw new Error('Commit attribution requires full history; configure actions/checkout with fetch-depth: 0')
  }
  const commit = git('rev-parse', '--verify', '--end-of-options', `${revision}^{commit}`)
  const commits = git('rev-list', commit).split('\n').filter(Boolean)
  const violations = commits.flatMap(hash => inspectCommit(git('cat-file', 'commit', hash)).map(item => ({ commit: hash, ...item })))
  return { commits: commits.length, violations }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2)
    if (args.length !== 0 && (args.length !== 2 || args[0] !== '--ref')) {
      throw new Error('Usage: node scripts/check-commit-attribution.mjs [--ref <commit>]')
    }
    const result = scanHistory({ revision: args[1] ?? 'HEAD' })
    if (result.violations.length) {
      for (const violation of result.violations) console.error(`${violation.commit.slice(0, 12)}: forbidden ${violation.field} identity (${violation.agent})`)
      console.error('Use the human contributor identity; remove tool co-author and generated-by attribution.')
      process.exitCode = 1
    } else console.log(`Commit attribution passed: ${result.commits} commits checked.`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
