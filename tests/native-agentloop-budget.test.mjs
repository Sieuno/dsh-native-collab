import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const nodeBin = process.execPath
function configuredHostLoaderUrl() {
  const configured = process.env.DSH_RC3_HOST_HARNESS_ENTRY?.trim()
  if (!configured) {
    throw new Error('Host integration test requires DSH_RC3_HOST_HARNESS_ENTRY (local path or file URL); no fallback is provided')
  }
  let url
  try {
    url = configured.startsWith('file:') ? new URL(configured) : pathToFileURL(resolve(configured))
  } catch {
    throw new Error('DSH_RC3_HOST_HARNESS_ENTRY must be a valid local path or file URL')
  }
  if (url.protocol !== 'file:' || !existsSync(fileURLToPath(url))) {
    throw new Error('DSH_RC3_HOST_HARNESS_ENTRY must point to an existing local Host harness registration module')
  }
  return url.href
}

const loaderUrl = configuredHostLoaderUrl()
const childScript = join(repoRoot, 'tests', 'native-agentloop-budget.child.mjs')

function runPhase(mode, sessionRoot, storageRoot, controlRoot, timeout = 25_000) {
  const result = spawnSync(nodeBin, [
    '--import', loaderUrl,
    childScript, mode, sessionRoot, storageRoot, controlRoot,
  ], { cwd: repoRoot, stdio: 'inherit', timeout })
  assert.equal(result.error, undefined, `${mode} subprocess error: ${result.error?.message ?? 'none'}`)
  assert.equal(result.signal, null, `${mode} subprocess was signalled (${result.signal})`)
  assert.equal(result.status, 0, `${mode} subprocess exit code ${result.status}`)
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function waitForFile(path, child, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  return new Promise((resolvePromise, reject) => {
    const check = () => {
      if (existsSync(path)) { resolvePromise(); return }
      if (child.exitCode !== null) { reject(new Error(`A child exited early with code ${child.exitCode}`)); return }
      if (Date.now() >= deadline) { reject(new Error(`timeout waiting for ${path}`)); return }
      setTimeout(check, 25)
    }
    check()
  })
}

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode)
  return new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => reject(new Error('A process did not exit normally before timeout')), timeoutMs)
    child.once('exit', code => { clearTimeout(timer); resolvePromise(code) })
  })
}

test('real JSONL AgentLoop root handle leases across processes; sidecar budget survives normal A/B restart', { timeout: 90_000 }, async () => {
  const tempRoot = mkdtempSync(join(tmpdir(), 'dsh-rc3-budget-ab-'))
  const sessionRoot = join(tempRoot, 'sessions')
  const storageRoot = join(tempRoot, 'storage')
  const controlRoot = join(tempRoot, 'control')
  const readyFile = join(controlRoot, 'phase-a-ready.json')
  let holder
  let holderExited = false
  try {
    holder = spawn(nodeBin, [
      '--import', loaderUrl,
      childScript, 'A', sessionRoot, storageRoot, controlRoot,
    ], { cwd: repoRoot, stdio: 'inherit' })
    await waitForFile(readyFile, holder, 30_000)
    const phaseA = readJson(readyFile)
    assert.equal(phaseA.budget.limit, 3)
    assert.equal(phaseA.budget.used, 2)
    assert.equal(phaseA.adapterRequests, 2)

    runPhase('probe', sessionRoot, storageRoot, controlRoot)
    const probe = readJson(join(controlRoot, 'phase-probe.json'))
    assert.notEqual(phaseA.pid, probe.pid, 'lease probe must be a distinct process')
    assert.equal(probe.acquired, false, 'second process must not acquire the held root Session writer')
    assert.equal(probe.error?.name, 'SessionAlreadyOwnedError')
    assert.equal(probe.error?.message, 'session "rc3-recovery-root" is already owned by an active write handle')

    writeFileSync(join(controlRoot, 'dispose-a.flag'), 'normal dispose')
    const holderCode = await waitForExit(holder, 15_000)
    holderExited = true
    assert.equal(holderCode, 0, `A normal-exit subprocess code ${holderCode}`)
    assert.deepEqual(readJson(join(controlRoot, 'phase-a-exit.json')), { pid: phaseA.pid, exit: 0 })

    runPhase('B', sessionRoot, storageRoot, controlRoot)
    const phaseB = readJson(join(controlRoot, 'phase-b.json'))
    assert.notEqual(phaseA.pid, phaseB.pid, 'restart must use another process')
    assert.deepEqual(phaseB.before, { status: 'active', limit: 3, used: 2 })
    assert.deepEqual(phaseB.afterAllowed, { limit: 3, used: 3 })
    assert.equal(phaseB.afterDenied.limit, 3)
    assert.equal(phaseB.afterDenied.used, 3)
    assert.deepEqual(phaseB.afterDenied.firstDenied, { agentId: 'rc3-recovery-root', turn: 3, step: 1 })
    assert.equal(phaseB.adapterRequests, 1, 'B N+1 is denied before MockAdapter dispatch')

    const ledgerFile = join(
      storageRoot,
      'native_collab_team_budget',
      'ledgers',
      `r-${Buffer.from('rc3-recovery-root', 'utf8').toString('base64url')}.json`,
    )
    const persistedLedger = readFileSync(ledgerFile)
    const legacyEvidence = []
    for (const kind of ['missing', 'corrupt']) {
      if (kind === 'missing') rmSync(ledgerFile)
      else writeFileSync(ledgerFile, '{ malformed record')
      runPhase('legacy', sessionRoot, storageRoot, controlRoot)
      const legacy = readJson(join(controlRoot, 'phase-legacy.json'))
      assert.notEqual(phaseB.pid, legacy.pid, `${kind} legacy check uses a separate process`)
      assert.equal(legacy.error.code, 'TEAM_BUDGET_LEGACY', `${kind} ledger must never refill to zero`)
      assert.equal(legacy.adapterRequests, 0, `${kind} ledger fails closed before MockAdapter dispatch`)
      legacyEvidence.push({ kind, ...legacy })
      writeFileSync(ledgerFile, persistedLedger)
    }

    runPhase('missing-storage', sessionRoot, storageRoot, controlRoot)
    const missingStorage = readJson(join(controlRoot, 'phase-missing-storage.json'))
    assert.notEqual(phaseB.pid, missingStorage.pid, 'missing-storage check uses a separate process')
    assert.deepEqual(missingStorage.error, {
      name: 'TeamError',
      code: 'TEAM_BUDGET_STORAGE_UNAVAILABLE',
      message: 'Agent Teams require the Host storage-domain service; no in-memory or temporary fallback is allowed',
    })
    assert.equal(missingStorage.adapterRequests, 0, 'init failure must not remove the request guard')
    assert.deepEqual(missingStorage.toolErrors.map(error => error.code), [
      'TEAM_BUDGET_EXHAUSTED',
      'TEAM_BUDGET_LEGACY',
      'TEAM_BUDGET_STORAGE_UNAVAILABLE',
      'TEAM_BUDGET_SCOPE_UNKNOWN',
      'TEAM_SEND_FAILURE',
    ])
    console.log('REAL A/B evidence', JSON.stringify({ phaseA, probe, holderExitCode: holderCode, phaseB, legacyEvidence, missingStorage }))
  } finally {
    if (holder && !holderExited) {
      try { writeFileSync(join(controlRoot, 'dispose-a.flag'), 'cleanup normal dispose') } catch {}
      try { await waitForExit(holder, 10_000) } catch {
        holder.kill('SIGTERM')
        await waitForExit(holder, 5_000).catch(() => {})
      }
    }
    rmSync(tempRoot, { recursive: true, force: true })
  }
})
