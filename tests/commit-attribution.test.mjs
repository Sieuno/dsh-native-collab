import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { forbiddenIdentity, inspectCommit, scanHistory } from '../scripts/check-commit-attribution.mjs'

const script = resolve('scripts/check-commit-attribution.mjs')
const owner = { name: 'Test Owner', email: 'owner@example.com' }
const raw = (author = owner, committer = owner, message = 'Update Codex and Claude Code documentation') =>
  `tree ${'0'.repeat(40)}\nauthor ${author.name} <${author.email}> 1 +0000\ncommitter ${committer.name} <${committer.email}> 1 +0000\n\n${message}\n`

test('rejects known Codex and Claude Code identities including aliases and bot addresses', () => {
  for (const [name, email] of [
    ['Codex', 'codex@openai.com'], ['OpenAI Codex', 'custom@example.com'], ['alias', 'noreply@openai.com'],
    ['GPT 5.4', 'codex@openai.com'], ['alias', 'codex@example.com'],
    ['alias', '199175422+chatgpt-codex-connector[bot]@users.noreply.github.com'],
    ['Claude Code', 'custom@example.com'], ['Claude Opus 4.7 (1M context)', 'custom@example.com'],
    ['Claude Sonnet 4.6', 'noreply@anthropic.com'], ['Claude Haiku', 'custom@example.com'],
    ['alias', 'claude-code@anthropic.com'], ['alias', 'code@anthropic.com'],
    ['alias', '123+claude[bot]@users.noreply.github.com'], ['Ｃｏｄｅｘ', 'custom@example.com'],
  ]) assert.ok(forbiddenIdentity(name, email), `${name} <${email}>`)
  for (const [name, email] of [
    ['Sieuno', '62740936+Sieuno@users.noreply.github.com'], ['GitHub', 'noreply@github.com'],
    ['dependabot[bot]', '49699333+dependabot[bot]@users.noreply.github.com'], ['Claude Shannon', 'claude@example.com'],
  ]) assert.equal(forbiddenIdentity(name, email), undefined)
})

test('checks author, committer, co-authors, and generated-by footers without rejecting ordinary tool mentions', () => {
  assert.equal(inspectCommit(raw()).length, 0)
  assert.equal(inspectCommit(raw({ name: 'Codex', email: 'codex@openai.com' }))[0].field, 'author')
  assert.equal(inspectCommit(raw(owner, { name: 'alias', email: 'noreply@anthropic.com' }))[0].field, 'committer')
  for (const message of [
    'Update\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>',
    'Update\n\nco-authored-by: GPT 5.4 <codex@openai.com>',
    'Update\n\nCO-COMMITTED-BY: Claude Code <code@anthropic.com>',
    'Update\n\n🤖 Generated with [Claude Code](https://claude.ai/code)',
  ]) assert.ok(inspectCommit(raw(owner, owner, message)).length)
  assert.equal(inspectCommit(raw(owner, owner, 'Discuss Codex setup\n\nCo-authored-by: Human <human@example.com>')).length, 0)
})

async function repository(t) {
  const base = resolve('.test-artifacts')
  await mkdir(base, { recursive: true })
  const root = await mkdtemp(join(base, 'attribution-'))
  t.after(async () => {
    assert.equal(dirname(resolve(root)), base)
    await rm(root, { recursive: true, force: true })
  })
  const git = (args, identities = {}) => execFileSync('git', args, { cwd: root, encoding: 'utf8', env: {
    ...process.env, GIT_AUTHOR_NAME: owner.name, GIT_AUTHOR_EMAIL: owner.email,
    GIT_COMMITTER_NAME: owner.name, GIT_COMMITTER_EMAIL: owner.email, ...identities,
  } }).trim()
  git(['init', '-q', '--initial-branch=main'])
  const commit = (message, identities) => git(['-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-q', '-m', message], identities)
  return { root, git, commit }
}

test('real Git history scan catches an old author even behind a human commit and a mailmap', async t => {
  const repo = await repository(t)
  repo.commit('Initial human commit')
  repo.commit('Earlier work', { GIT_AUTHOR_NAME: 'Codex', GIT_AUTHOR_EMAIL: 'codex@openai.com' })
  const bad = repo.git(['rev-parse', 'HEAD'])
  await writeFile(join(repo.root, '.mailmap'), 'Test Owner <owner@example.com> Codex <codex@openai.com>\n')
  repo.git(['add', '.mailmap'])
  repo.commit('Document attribution policy')
  const result = scanHistory({ cwd: repo.root })
  assert.equal(result.commits, 3)
  assert.deepEqual(result.violations, [{ commit: bad, field: 'author', agent: 'Codex' }])
  const cli = spawnSync(process.execPath, [script], { cwd: repo.root, encoding: 'utf8' })
  assert.equal(cli.status, 1)
  assert.match(cli.stderr, /forbidden author identity/)
})

test('CLI accepts a human history and rejects missing or shallow history', async t => {
  const repo = await repository(t)
  repo.commit('Update Claude Code documentation')
  repo.commit('Add Codex examples\n\nCo-authored-by: Human <human@example.com>')
  assert.equal(spawnSync(process.execPath, [script], { cwd: repo.root }).status, 0)
  assert.throws(() => scanHistory({ cwd: repo.root, revision: 'missing-commit' }))
  const parent = dirname(repo.root)
  const shallow = await mkdtemp(join(parent, 'attribution-shallow-'))
  t.after(async () => { assert.equal(dirname(resolve(shallow)), parent); await rm(shallow, { recursive: true, force: true }) })
  execFileSync('git', ['clone', '-q', '--depth=1', pathToFileURL(repo.root).href, shallow])
  assert.throws(() => scanHistory({ cwd: shallow }), /fetch-depth: 0/)
  const cli = spawnSync(process.execPath, [script], { cwd: shallow, encoding: 'utf8' })
  assert.equal(cli.status, 1)
  assert.match(cli.stderr, /full history/)
})
