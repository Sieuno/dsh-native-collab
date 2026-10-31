window.__ModuleLoader__.load({
  id: '@sieuno/dsh-native-collab',
  factory(require) {
    const React = require('react')
    const { Button, Modal } = require('@deepseek-ai/dsh-client-ui-primitives')
    const h = React.createElement
    const PACKAGE = '@sieuno/dsh-native-collab'
    const LOCALE = 'collabUi'
    // Replaced from the packaged dictionaries by emit-dist; no network locale lookup.
    const UI_LOCALES = null
    const UI_CSS = `
.dsh-native-collab-modal[role="dialog"] { width: min(960px, 100%); max-height: 100%; }
.dsh-native-collab-modal-content { min-height: 0; overflow: auto; overscroll-behavior: contain; }
.dsh-native-collab-table-frame { max-width: 100%; overflow: auto; }
.dsh-native-collab-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.dsh-native-collab-table th, .dsh-native-collab-table td { padding: 8px; text-align: left; vertical-align: top; border-bottom: 1px solid var(--dsw-alias-divider, currentColor); overflow-wrap: anywhere; word-break: break-word; }
.dsh-native-collab-targets th:first-child { width: 17%; }
.dsh-native-collab-targets th:last-child { width: 14%; }
.dsh-native-collab-targets td:nth-child(2) { font-family: monospace; font-size: 0.85em; }
.dsh-native-collab-table th, .dsh-native-collab-table td { box-sizing: border-box; font-weight: 400; font-style: normal; font-family: inherit; line-height: 1.4; font-variant-numeric: tabular-nums; }
.dsh-native-collab-saved th, .dsh-native-collab-saved td { box-sizing: border-box; font-weight: 400; font-style: normal; }
.dsh-native-collab-saved td[data-numeric="true"] { font-variant-numeric: tabular-nums lining-nums; font-feature-settings: "tnum" 1, "lnum" 1; text-align: left; font-weight: 400; }
.dsh-native-collab-row-label { display: block; }
.dsh-native-collab-options { margin-inline-start: 1.5em; }
[data-testid="enhancement-page"] fieldset { margin-block: 1em; padding: 1em; border: 1px solid var(--dsw-alias-divider, currentColor); border-radius: 8px; }
[data-testid="enhancement-page"] select { margin-inline-start: 0.5em; max-width: 100%; }
.dsh-native-collab-placeholder, .dsh-native-collab-module-note { display: block; margin: 0.45em 0 0; padding-top: 0.35em; border-top: 1px solid var(--dsw-alias-divider, currentColor); font-size: 0.85em; line-height: 1.45; }
.dsh-native-collab-operation { display: inline-block; white-space: nowrap; word-break: normal; overflow-wrap: normal; }
`
    const stylesheet = () => h('style', { key: 'collab-styles', 'data-testid': 'collab-styles' }, UI_CSS)
    // LocaleService.register stores flat paths: nested objects are not looked up.
    function flattenLocale(dictionary, prefix = '', output = {}) {
      for (const [key, value] of Object.entries(dictionary ?? {})) {
        const path = prefix ? prefix + '.' + key : key
        if (typeof value === 'string') output[path] = value
        else if (value && typeof value === 'object' && !Array.isArray(value)) flattenLocale(value, path, output)
      }
      return output
    }
    const MODAL_CLASS = 'dsh-native-collab-modal'
    const CONTENT_CLASS = 'dsh-native-collab-modal-content'
    const CONTROL_ENTRY_ID = 'dsh-native-collab-ui'
    const CONTROL_SLOT_KEY = `${PACKAGE}#${CONTROL_ENTRY_ID}`
    const ALLOWED_FIELDS = ['modelEnhancement', 'communicationEnhancement', 'modelSource', 'nativeModelSelectionCompatibility', 'runningChildGuidance', 'completedChildContinuation', 'teamRequestLimit']
    // Replaced by emit-dist with the authoritative assembly role inventory.
    const ASSEMBLY_LAYOUT = null
    const ROLE_LABELS = { subagent: 'subagent', 'subagent-control': 'control', 'subagent-list': 'listAgents', 'agent-team': 'agentTeam', 'team-tools': 'teamTools' }
    const CORE_PAIRS = (ASSEMBLY_LAYOUT ?? []).filter(row => row?.placement === 'runtime').map(row => ({ key: ROLE_LABELS[row.role], nativeId: row.nativeId, derivedId: row.legacyId, moduleName: row.moduleName }))
    const STATUS_IDS = (ASSEMBLY_LAYOUT ?? []).map(row => row.legacyId)
    const DERIVED_PLACEHOLDERS = new Set((ASSEMBLY_LAYOUT ?? []).filter(row => row.placement === 'preset').map(row => row.legacyId))
    const RUNTIME_ROLES = (ASSEMBLY_LAYOUT ?? []).filter(row => row.placement === 'runtime').map(row => row.role)
    const STATUS_TYPE = `${PACKAGE}/collab-ui#CollabUiStatus`
    function strictFailure(message) { throw new Error(message) }
    function isPlainObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value) }
    function exactKeys(value, required, optional = []) {
      const allowed = new Set([...required, ...optional])
      for (const key of Object.keys(value)) if (!allowed.has(key)) strictFailure(`unexpected field ${JSON.stringify(key)}`)
      for (const key of required) if (!Object.hasOwn(value, key)) strictFailure(`missing field ${JSON.stringify(key)}`)
    }
    function parseRow(value) {
      if (!isPlainObject(value)) strictFailure('collabUi row must be an object')
      exactKeys(value, ['id', 'moduleName', 'current', 'sourceLayer', 'runtimePhase'])
      if (typeof value.id !== 'string' || value.id.length === 0) strictFailure('collabUi row.id must be a nonempty string')
      if (typeof value.moduleName !== 'string' || value.moduleName.length === 0) strictFailure('collabUi row.moduleName must be a nonempty string')
      if (value.current !== 'enabled' && value.current !== 'disabled' && value.current !== 'unknown') strictFailure('collabUi row.current is not a known state')
      if (value.sourceLayer !== 'unknown') strictFailure('collabUi row.sourceLayer must be "unknown"')
      if (value.runtimePhase !== null && typeof value.runtimePhase !== 'string') strictFailure('collabUi row.runtimePhase must be a string or null')
      return { id: value.id, moduleName: value.moduleName, current: value.current, sourceLayer: 'unknown', runtimePhase: value.runtimePhase }
    }
    function parseAssembly(value) {
      if (value === null) return null
      if (!isPlainObject(value)) strictFailure('collabUi assembly must be an object or null')
      exactKeys(value, ['present'], ['modelEnhancement', 'communicationEnhancement', 'modelSource', 'nativeModelSelectionCompatibility', 'runningChildGuidance', 'completedChildContinuation', 'teamRequestLimit'])
      if (value.present !== true) strictFailure('collabUi assembly.present must be true')
      const parsed = { present: true }
      for (const key of ['modelEnhancement', 'communicationEnhancement', 'nativeModelSelectionCompatibility', 'runningChildGuidance', 'completedChildContinuation']) {
        if (!Object.hasOwn(value, key)) continue
        if (typeof value[key] !== 'boolean') strictFailure(`collabUi assembly.${key} must be a boolean`)
        parsed[key] = value[key]
      }
      if (Object.hasOwn(value, 'modelSource')) {
        if (!['conversation', 'settings', 'all'].includes(value.modelSource)) strictFailure('collabUi assembly.modelSource is invalid')
        parsed.modelSource = value.modelSource
      }
      if (Object.hasOwn(value, 'teamRequestLimit')) {
        if (typeof value.teamRequestLimit !== 'number' || !Number.isSafeInteger(value.teamRequestLimit) || value.teamRequestLimit < 1) strictFailure('collabUi assembly.teamRequestLimit must be a positive safe integer')
        parsed.teamRequestLimit = value.teamRequestLimit
      }
      return parsed
    }
    function parseRuntime(value) {
      if (value === undefined || value === null) return null // older installed server; never infer managed readiness
      if (!isPlainObject(value)) strictFailure('invalid managed runtime')
      exactKeys(value, ['mode', 'phase', 'services'])
      const phases = ['not-requested', 'loading', 'ready', 'failed', 'disposing', 'disposed']
      const roles = RUNTIME_ROLES
      if (!['native', 'managed'].includes(value.mode) || !phases.includes(value.phase) || !Array.isArray(value.services) || value.services.length !== roles.length) strictFailure('invalid managed runtime state')
      const seen = new Set()
      for (const item of value.services) {
        if (!isPlainObject(item)) strictFailure('invalid managed runtime role')
        exactKeys(item, ['role', 'phase', 'failure'])
        if (!roles.includes(item.role) || seen.has(item.role) || !phases.includes(item.phase) || item.failure !== null && (typeof item.failure !== 'string' || item.failure.length > 128)) strictFailure('invalid managed runtime role state')
        seen.add(item.role)
      }
      return value
    }
    function statusSchema() {
      return { parse(value) {
        if (!isPlainObject(value)) strictFailure('collabUi status must be an object')
        exactKeys(value, ['profileName', 'hmrEnabled', 'rows', 'desired', 'pendingRestart', 'writeSupport', 'operationError', 'error', 'assembly'], ['runtime', 'diagnosis'])
        if (value.diagnosis !== undefined && !['native', 'managed', 'legacy-mixed', 'unknown'].includes(value.diagnosis)) strictFailure('invalid runtime diagnosis')
        if (value.profileName !== null && (typeof value.profileName !== 'string' || value.profileName.length === 0)) strictFailure('collabUi status.profileName must be a nonempty string or null')
        if (value.hmrEnabled !== null && typeof value.hmrEnabled !== 'boolean') strictFailure('collabUi status.hmrEnabled must be a boolean or null')
        if (!Array.isArray(value.rows)) strictFailure('collabUi status.rows must be an array')
        if (value.desired !== 'unchanged') strictFailure('collabUi status.desired must be "unchanged"')
        if (value.pendingRestart !== 'unknown') strictFailure('collabUi status.pendingRestart must be "unknown"')
        if (value.writeSupport !== 'unsupported') strictFailure('collabUi status.writeSupport must be "unsupported"')
        if (value.operationError !== 'transaction-unavailable') strictFailure('collabUi status.operationError must be "transaction-unavailable"')
        if (value.error !== null && value.error !== 'profile-unavailable' && value.error !== 'inventory-unavailable') strictFailure('collabUi status.error is not a known code')
        return {
          profileName: value.profileName, hmrEnabled: value.hmrEnabled, rows: value.rows.map(parseRow),
          desired: 'unchanged', pendingRestart: 'unknown', writeSupport: 'unsupported', operationError: 'transaction-unavailable',
          error: value.error, assembly: parseAssembly(value.assembly),
          runtime: parseRuntime(value.runtime), diagnosis: value.diagnosis ?? 'unknown',
        }
      } }
    }
    function strictCodec(typeSymbol, schema) {
      return { mode: 'strict', typeSymbol, create: schema, decode: value => schema().parse(value) }
    }
    function limitsValues(value) {
      if (!isPlainObject(value)) strictFailure('invalid native limits')
      exactKeys(value, ['maxDepth', 'maxActiveSubagents'])
      if (!Number.isSafeInteger(value.maxDepth) || value.maxDepth < 0 || Object.is(value.maxDepth, -0)
        || !Number.isSafeInteger(value.maxActiveSubagents) || value.maxActiveSubagents < 1) strictFailure('invalid native limits')
      return { maxDepth: value.maxDepth, maxActiveSubagents: value.maxActiveSubagents }
    }
    function limitsViewSchema() { return { parse(value) {
      if (!isPlainObject(value)) strictFailure('invalid native limits view')
      exactKeys(value, ['values', 'revision', 'writable'], ['error'])
      if (typeof value.revision !== 'string' || !value.revision || value.revision.length > 256 || typeof value.writable !== 'boolean'
        || value.error !== undefined && typeof value.error !== 'string') strictFailure('invalid native limits view')
      return { ...value, values: limitsValues(value.values) }
    } } }
    function limitsRequestSchema() { return { parse(value) {
      if (!isPlainObject(value)) strictFailure('invalid native limits request')
      exactKeys(value, ['revision', 'maxDepth', 'maxActiveSubagents'])
      if (typeof value.revision !== 'string' || !value.revision || value.revision.length > 256) strictFailure('invalid native limits revision')
      return { revision: value.revision, ...limitsValues({ maxDepth: value.maxDepth, maxActiveSubagents: value.maxActiveSubagents }) }
    } } }
    const REMOTE = {
      package: PACKAGE,
      services: [{ namespace: 'collabUi' }],
      descriptors: [
        {
          id: `${PACKAGE}#collabUi/status`, service: 'collabUi', namespace: 'collabUi', method: 'status',
          invocation: { kind: 'direct' }, parameters: [], result: strictCodec(STATUS_TYPE, statusSchema),
        },
        {
          id: `${PACKAGE}#collabUi/limits`, service: 'collabUi', namespace: 'collabUi', method: 'limits',
          invocation: { kind: 'direct' }, parameters: [], result: strictCodec(`${PACKAGE}/native-subagent-limits#LimitsView`, limitsViewSchema),
        },
        {
          id: `${PACKAGE}#collabUi/saveLimits`, service: 'collabUi', namespace: 'collabUi', method: 'saveLimits',
          invocation: { kind: 'direct' }, parameters: [{ name: 'request', wire: 'request', source: 'json', codec: strictCodec(`${PACKAGE}/native-subagent-limits#LimitsRequest`, limitsRequestSchema) }],
          result: strictCodec(`${PACKAGE}/native-subagent-limits#LimitsView`, limitsViewSchema),
        },
      ],
    }
    function coreOf(subject) {
      if (subject?.kind === 'bundle' && subject.pkg?.name === PACKAGE) return { scope: 'bundle' }
      if (subject?.kind !== 'row' || !subject.row) return null
      const pair = CORE_PAIRS.find(item => item.derivedId === subject.row.rowId || item.nativeId === subject.row.rowId || item.moduleName === subject.row.moduleName)
      return pair ? { scope: 'core', pair } : null
    }
    function LifecycleNotice({ t, match }) {
      const pair = match?.scope === 'core' ? match.pair : null
      return h('details', { 'data-testid': 'lifecycle-warning', 'data-lifecycle-scope': pair ? pair.key : 'bundle' }, [
        h('summary', { key: 'title' }, t('lifecycleTitle')),
        h('p', { key: 'install' }, t('lifecycleInstall')),
        h('p', { key: 'remove', role: 'alert' }, t('lifecycleRemove')),
        pair ? h('p', { key: 'core' }, t(`lifecycleCore.${pair.key}`)) : null,
        h('p', { key: 'sidecar' }, t('lifecycleSidecar')),
      ])
    }
    function remoteValue(result) {
      if (!result || typeof result !== 'object' || Array.isArray(result)) return { ok: false, malformed: true }
      if (result.ok === true && Object.hasOwn(result, 'value')) return { ok: true, value: result.value }
      if (result.ok === false) return { ok: false, error: result.error }
      return { ok: false, malformed: true }
    }
    async function unwrap(call) {
      const result = remoteValue(await call)
      if (!result.ok) throw new Error(failureDetail(result.error) || 'Remote request failed')
      return result.value
    }
    function failureDetail(error) {
      return error && typeof error.message === 'string' && error.message !== '[object Object]' ? error.message : undefined
    }
    function failureReason(error, fallback) { return error?.code === 'settings/conflict' ? 'conflict' : fallback }
    function validValue(field, value) {
      if (field === 'teamRequestLimit') return Number.isSafeInteger(value) && value >= 1
      if (field === 'modelSource') return ['conversation', 'settings', 'all'].includes(value)
      return typeof value === 'boolean'
    }
    function readFlag(value) {
      try { const raw = value && typeof value.get === 'function' ? value.get() : value; return typeof raw === 'boolean' ? raw : undefined } catch { return undefined }
    }
    function allowlistedOps(patch) {
      return ALLOWED_FIELDS.filter(field => Object.hasOwn(patch, field)).flatMap(field => {
        const value = patch[field]
        return value === undefined ? [{ op: 'unset', path: [field] }] : validValue(field, value) ? [{ op: 'set', path: [field], value }] : []
      })
    }
    function schemaRoot(schema) {
      if (!schema || typeof schema !== 'object') return null
      if (schema.type === 'object' && schema.dict) return { root: schema, refs: schema.refs ?? null }
      const root = schema.refs?.[String(schema.uid)]
      return root?.type === 'object' && root.dict ? { root, refs: schema.refs } : null
    }
    function modelSourceSchema(node, refs) {
      if (node?.type === 'string' && Array.isArray(node.enum)) return node.enum.length === 3 && ['conversation', 'settings', 'all'].every(value => node.enum.includes(value))
      if (node?.type !== 'union' || !Array.isArray(node.list) || node.list.length !== 3) return false
      const constants = node.list.map(entry => {
        const item = entry && typeof entry === 'object' ? entry : refs?.[String(entry)]
        if (!item || typeof item !== 'object') return undefined
        if (typeof item.const === 'string') return item.const
        if (typeof item.value === 'string' && (item.type === 'const' || item.type === 'literal')) return item.value
        return undefined
      })
      return constants.every(value => typeof value === 'string') && new Set(constants).size === 3 && ['conversation', 'settings', 'all'].every(value => constants.includes(value))
    }
    function schemaIsExact(schema) {
      const located = schemaRoot(schema)
      if (!located) return false
      const keys = Object.keys(located.root.dict)
      // runtimeMode is an assembly control, not a browser-mutable preference.
      // Accept its known schema slot without adding it to the mutation allowlist.
      if (keys.length !== ALLOWED_FIELDS.length + (keys.includes('runtimeMode') ? 1 : 0) || ALLOWED_FIELDS.some(field => !keys.includes(field))) return false
      return ALLOWED_FIELDS.every(field => {
        const ref = located.root.dict[field]
        const node = ref && typeof ref === 'object' ? ref : located.refs?.[String(ref)]
        if (field === 'modelSource') return modelSourceSchema(node, located.refs) && node.meta?.required !== true
        return node?.type === (field === 'teamRequestLimit' ? 'number' : 'boolean') && node.meta?.required !== true
      })
    }
    function savedFlags(form) {
      const saved = {}
      for (const field of ALLOWED_FIELDS) {
        if (!Object.hasOwn(form?.state?.value ?? {}, field)) continue
        const value = form.state.value[field]
        saved[field] = field === 'teamRequestLimit' || field === 'modelSource' ? value : readFlag(value)
      }
      return saved
    }
    // User-facing failures never echo host exception messages, paths or tokens.
    function diagnosticCode(value) {
      const code = typeof value === 'string' ? value : value?.code
      return typeof code === 'string' && /^[a-z][a-z0-9/-]{0,79}$/.test(code) ? code : 'unexpected-error'
    }
    function FailureNotice({ t, code }) {
      const safe = diagnosticCode(code)
      // Only the codes the UI can display itself get user-facing copy; any other
      // host code stays visible as a collapsed technical detail.
      return h('div', { role: 'alert', 'data-testid': 'operation-error' }, [
        h('p', { key: 'message' }, t(safe === 'remote-unavailable' ? 'diagnosis.remote-unavailable' : 'diagnosis.unknown')),
        h('details', { key: 'details' }, [h('summary', { key: 'summary' }, t('technicalDetails')), h('code', { key: 'code' }, safe)]),
      ])
    }
    async function describeOwn(settings) {
      if (typeof settings?.describe !== 'function') return { reason: 'settings-missing' }
      let response
      try { response = remoteValue(await settings.describe()) } catch { return { reason: 'settings-unverified' } }
      if (!response.ok) return { reason: failureReason(response.error, 'settings-unverified'), detail: failureDetail(response.error) }
      const document = response.value
      if (document?.hasDocument !== true || !Array.isArray(document.namespaces)) return { reason: 'settings-unverified' }
      const rows = document.namespaces.filter(row => row?.ns === CONTROL_ENTRY_ID && schemaIsExact(row.schema))
      if (rows.length !== 1) return { reason: 'namespace-unverified' }
      const row = rows[0]
      if ((!Number.isSafeInteger(row.revision) || row.revision < 0)) return { reason: 'revision-missing' }
      if (document.writable !== true) return { reason: document.writable === false ? 'not-writable' : 'settings-unverified' }
      return { row }
    }
    async function commitViaVerifiedSettings(settings, ops, patch) {
      const snapshot = await describeOwn(settings)
      if (!snapshot.row) return { wrote: false, ...snapshot }
      let response
      try { response = remoteValue(await settings.mutate(snapshot.row.ns, ops, snapshot.row.revision)) } catch (error) { return { wrote: false, reason: failureReason(error, 'rejected'), code: diagnosticCode(error) } }
      if (!response.ok) return { wrote: false, reason: failureReason(response.error, 'rejected'), code: diagnosticCode(response.error) }
      const confirmed = await describeOwn(settings)
      if (!confirmed.row) return { wrote: false, reason: confirmed.reason ?? 'settings-unverified' }
      const values = confirmed.row.value ?? {}
      for (const [field, value] of Object.entries(patch)) {
        const actual = field === 'nativeModelSelectionCompatibility' ? readFlag(values[field]) : values[field]
        if (!Object.is(actual, value)) return { wrote: false, reason: 'write-unconfirmed' }
      }
      return { wrote: true, reason: 'saved-pending-restart', revision: confirmed.row.revision, row: confirmed.row }
    }
    async function commitOwnSettings({ settings, patch }) {
      if (Object.keys(patch).some(field => !ALLOWED_FIELDS.includes(field) || (patch[field] !== undefined && !validValue(field, patch[field])))) return { wrote: false, reason: 'field-rejected' }
      const ops = allowlistedOps(patch)
      if (!ops.length) return { wrote: false, reason: 'empty' }
      return commitViaVerifiedSettings(settings, ops, patch)
    }
    function NativeLimitsPage({ t, readLimits, writeLimits }) {
      const [state, setState] = React.useState({ view: null, depth: '', capacity: '', loading: true, saving: false, pending: false, error: null, saved: false, edit: 0 })
      const alive = React.useRef(true), dirty = React.useRef(new Map()), queue = React.useRef(null), draining = React.useRef(false)
      const sequence = React.useRef(0), draft = React.useRef({ depth: '', capacity: '' }), loadVersion = React.useRef(0)
      const fields = { depth: 'maxDepth', capacity: 'maxActiveSubagents' }
      const integer = (text, minimum) => /^(0|[1-9]\d*)$/.test(text) && Number.isSafeInteger(Number(text)) && Number(text) >= minimum
      const validDraft = () => integer(draft.current.depth, 0) && integer(draft.current.capacity, 1)
      const load = async () => {
        if (dirty.current.size || draining.current) return
        const version = ++loadVersion.current, editSequence = sequence.current
        const current = () => alive.current && version === loadVersion.current
        const pristine = () => sequence.current === editSequence && !dirty.current.size && !draining.current
        setState(old => ({ ...old, loading: true, error: null, saved: false }))
        try {
          const view = limitsViewSchema().parse(await readLimits())
          if (!current()) return
          // Focus reads may overlap; only the latest may apply, and never over a draft.
          if (!pristine()) { setState(old => ({ ...old, loading: false })); return }
          draft.current = { depth: String(view.values.maxDepth), capacity: String(view.values.maxActiveSubagents) }
          setState(old => ({ ...old, ...draft.current, view, loading: false }))
        } catch {
          if (current()) setState(old => pristine() ? { ...old, view: null, loading: false, error: 'unavailable' } : { ...old, loading: false })
        }
      }
      React.useEffect(() => {
        alive.current = true
        void load()
        const onFocus = () => { void load() }
        window.addEventListener?.('focus', onFocus)
        return () => { alive.current = false; loadVersion.current++; queue.current = null; window.removeEventListener?.('focus', onFocus) }
      }, [readLimits])
      const drain = async () => {
        if (draining.current) return
        draining.current = true
        try {
          while (queue.current && alive.current) {
            const task = queue.current; queue.current = null
            if (task.sequence !== sequence.current || !validDraft()) continue
            setState(old => ({ ...old, saving: true, pending: false, error: null, saved: false }))
            try {
              // Refresh the revision and preserve the sibling field if another editor changed it.
              const fresh = limitsViewSchema().parse(await readLimits())
              if (!alive.current || task.sequence !== sequence.current || !validDraft()) continue
              if (!fresh.writable) throw new Error('native-limits-readonly')
              const changed = [...task.fields].filter(([field, edit]) => dirty.current.get(field)?.version === edit.version)
              if (!changed.length) continue
              const values = { ...fresh.values }
              for (const [field, edit] of changed) values[fields[field]] = Number(edit.text)
              const view = limitsViewSchema().parse(await writeLimits({ revision: fresh.revision, ...values }))
              if (view.values.maxDepth !== values.maxDepth || view.values.maxActiveSubagents !== values.maxActiveSubagents) throw new Error('native-limits-unconfirmed')
              if (!alive.current) return
              for (const [field, edit] of task.fields) if (dirty.current.get(field)?.version === edit.version) dirty.current.delete(field)
              for (const [field, key] of Object.entries(fields)) if (!dirty.current.has(field)) draft.current[field] = String(view.values[key])
              setState(old => ({ ...old, ...draft.current, view, saved: dirty.current.size === 0, error: null }))
            } catch (error) {
              if (alive.current && task.sequence === sequence.current) {
                const conflict = error?.code === 'native-limits-conflict' || error?.message === 'native-limits-conflict'
                setState(old => ({ ...old, error: conflict ? 'conflict' : error?.message === 'native-limits-readonly' ? 'readonly' : 'saveFailed', saved: false }))
              }
            }
          }
        } finally { draining.current = false; if (alive.current) setState(old => ({ ...old, saving: false })) }
      }
      React.useEffect(() => {
        if (!dirty.current.size || !validDraft() || !state.view?.writable) { queue.current = null; return undefined }
        const timer = setTimeout(() => {
          queue.current = { sequence: sequence.current, fields: new Map(dirty.current) }
          void drain()
        }, 350)
        return () => clearTimeout(timer)
      }, [state.edit])
      const edit = (field, value) => {
        draft.current = { ...draft.current, [field]: value }
        const version = ++sequence.current
        dirty.current.set(field, { text: value, version })
        queue.current = null
        setState(old => ({ ...old, [field]: value, edit: version, pending: validDraft(), error: null, saved: false }))
      }
      const valid = integer(state.depth, 0) && integer(state.capacity, 1)
      const locked = state.loading || state.view?.writable !== true
      const input = (field, id, minimum) => h('p', { key: field }, h('label', { htmlFor: 'collab-' + id }, [t('limits.' + field), h('input', {
        id: 'collab-' + id, key: 'input', type: 'number', min: minimum, max: Number.MAX_SAFE_INTEGER, step: 1, value: state[field],
        disabled: locked, 'data-testid': id, onChange: event => { if (!locked) edit(field, event.target.value) },
      })]))
      return h('fieldset', { 'data-testid': 'native-limits', 'aria-busy': state.loading || state.saving }, [
        h('legend', { key: 'legend' }, t('limits.title')), h('p', { key: 'help' }, t('limits.help')),
        input('depth', 'native-max-depth', 0), input('capacity', 'native-max-active', 1),
        state.loading ? h('p', { key: 'loading', role: 'status' }, t('loading')) : null,
        !state.loading && state.view && !valid ? h('p', { key: 'invalid', role: 'alert', 'data-testid': 'native-limits-invalid' }, t('limits.invalid')) : null,
        !state.loading && state.view?.writable === false ? h('p', { key: 'readonly', role: 'alert' }, t('limits.readonly')) : null,
        state.error ? h('p', { key: 'error', role: 'alert', 'data-testid': 'native-limits-error' }, t('limits.' + state.error)) : null,
        !state.error && (state.saving || state.pending) ? h('p', { key: 'saving', role: 'status', 'data-testid': 'native-limits-saving' }, t('autoSaving')) : null,
        state.saved ? h('p', { key: 'saved', role: 'status', 'data-testid': 'native-limits-saved' }, t('limits.saved')) : null,
      ])
    }
    function EnhancementPage({ t, view, form, readStatus, settings, subject, readLimits, writeLimits }) {
      if (subject?.row?.rowId && subject.row.rowId !== CONTROL_ENTRY_ID) return null
      if (view === 'summary') return t('settingsSummary')
      if (view !== 'page') return null
      const [draft, setDraft] = React.useState({})
      const [observed, setObserved] = React.useState({ status: 'loading' })
      const [captured, setCaptured] = React.useState({ loading: true })
      const [notice, setNotice] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [fieldErrors, setFieldErrors] = React.useState({})
      const [saveStates, setSaveStates] = React.useState({})
      const queueRef = React.useRef(new Map())
      const drainingRef = React.useRef(false)
      const draftRef = React.useRef(draft)
      draftRef.current = draft
      const [pendingWrite, setPendingWrite] = React.useState(false)
      const refresh = async () => {
        if (busy) return
        setBusy(true)
        try {
          const next = await describeOwn(settings)
          setCaptured(next)
          let statusReady = false
          try {
            const result = await readStatus()
            statusReady = !result.error
            setObserved(statusReady ? { status: 'ready', result } : { status: 'unknown' })
          } catch { setObserved({ status: 'unknown' }) }
          setNotice(!next.row ? { reason: 'refresh-failed', failureReason: next.reason }
            : { reason: statusReady ? 'refreshed' : 'status-refresh-failed' })
        } finally { setBusy(false) }
      }
      React.useEffect(() => {
        let alive = true
        Promise.resolve().then(readStatus).then(result => { if (alive) setObserved({ status: 'ready', result }) }).catch(() => { if (alive) setObserved({ status: 'unknown' }) })
        void describeOwn(settings).then(result => { if (alive) setCaptured(result) })
        return () => { alive = false }
      }, [readStatus, settings, form])
      const saved = savedFlags({ state: { value: captured.row?.value } })
      const effective = observed.result?.assembly
      const defaults = { modelEnhancement: false, communicationEnhancement: false, modelSource: 'conversation', nativeModelSelectionCompatibility: false, runningChildGuidance: true, completedChildContinuation: true, teamRequestLimit: 32 }
      const baseline = field => field === 'modelSource'
        ? saved.modelSource ?? (Object.hasOwn(saved, 'nativeModelSelectionCompatibility') ? (saved.nativeModelSelectionCompatibility ? 'conversation' : 'settings') : 'conversation')
        : saved[field] ?? effective?.[field] ?? defaults[field]
      const shown = field => Object.hasOwn(draft, field) ? draft[field] : baseline(field)
      const settingsLoading = captured.loading === true
      const settingsReason = captured.row ? null : captured.reason ?? 'settings-unavailable'
      const settingsReady = !settingsReason
      const pending = pendingWrite || (effective && ALLOWED_FIELDS.some(field => field !== 'modelSource' && Object.hasOwn(saved, field) && (saved[field] ?? defaults[field]) !== (effective[field] ?? defaults[field])))
      const drainQueue = async () => {
        if (drainingRef.current) return
        drainingRef.current = true
        setBusy(true)
        try {
          while (queueRef.current.size) {
            const [field, value] = queueRef.current.entries().next().value
            queueRef.current.delete(field)
            const result = await commitOwnSettings({ settings, patch: { [field]: value } })
            const isCurrent = () => !queueRef.current.has(field) && Object.is(draftRef.current[field], value)
            if (result.wrote) {
              if (field !== 'modelSource') setPendingWrite(true)
              setCaptured({ row: result.row })
              if (isCurrent()) {
                setFieldErrors(current => ({ ...current, [field]: null }))
                setSaveStates(current => ({ ...current, [field]: 'saved' }))
                const nextDraft = Object.fromEntries(Object.entries(draftRef.current).filter(([key]) => key !== field))
                draftRef.current = nextDraft
                setDraft(nextDraft)
              }
            } else if (isCurrent()) {
              const reason = ['settings-missing', 'settings-unverified', 'namespace-unverified', 'revision-missing', 'not-writable', 'settings-unavailable', 'rejected', 'conflict', 'field-rejected', 'write-unconfirmed'].includes(result.reason) ? result.reason : 'rejected'
              setFieldErrors(current => ({ ...current, [field]: reason }))
              setSaveStates(current => ({ ...current, [field]: 'failed' }))
            }
          }
        } finally { drainingRef.current = false; setBusy(false) }
      }
      const enqueue = (field, value) => {
        if (!settingsReady) { setFieldErrors(current => ({ ...current, [field]: settingsReason ?? 'settings-unavailable' })); return }
        if (!validValue(field, value)) return
        setFieldErrors(current => ({ ...current, [field]: null }))
        setSaveStates(current => ({ ...current, [field]: 'saving' }))
        queueRef.current.set(field, value)
        void drainQueue()
      }
      const updateField = (field, value) => {
        const next = { ...draftRef.current, [field]: value }
        draftRef.current = next
        setDraft(next)
        setFieldErrors(current => ({ ...current, [field]: null }))
        if (field === 'teamRequestLimit') {
          if (!validValue(field, value)) {
            queueRef.current.delete(field)
            setSaveStates(current => ({ ...current, [field]: null }))
          } else if (settingsReady) {
            setSaveStates(current => ({ ...current, [field]: 'saving' }))
          }
        } else enqueue(field, value)
      }
      React.useEffect(() => {
        if (!Object.hasOwn(draft, 'teamRequestLimit')) return undefined
        const value = draft.teamRequestLimit
        if (!validValue('teamRequestLimit', value)) return undefined
        const timer = setTimeout(() => enqueue('teamRequestLimit', value), 350)
        return () => clearTimeout(timer)
      }, [draft.teamRequestLimit, settingsReady])
      const fieldError = field => fieldErrors[field] ? h('span', { key: field + '-error', role: 'alert', 'aria-live': 'polite', 'data-field-error': field, style: { color: 'var(--dsw-alias-danger, #d22)' } }, t('write.' + fieldErrors[field])) : null
      const fieldState = field => saveStates[field] ? h('span', { key: field + '-state', role: 'status', 'aria-live': 'polite' }, t(saveStates[field] === 'saving' ? 'autoSaving' : saveStates[field] === 'failed' ? 'autoSaveFailed' : 'autoSaved')) : null
      const locked = busy
      const editingLocked = !settingsReady
      const checkbox = (field, testId, disabled = false) => h('p', { key: field }, [h('label', { key: 'label' }, [
        h('input', { key: 'input', type: 'checkbox', 'data-testid': testId, checked: shown(field) === true, disabled: editingLocked || disabled,
          onChange: event => { if (!editingLocked && !disabled) updateField(field, event.target.checked === true) } }), t(field),
      ]), fieldState(field), fieldError(field)])
      const stateText = (value, field) => {
        if (value !== undefined) return typeof value === 'boolean' ? t(value ? 'on' : 'off') : String(value)
        const fallback = effective?.[field] ?? defaults[field]
        return t('defaultValue').replace('{value}', typeof fallback === 'boolean' ? t(fallback ? 'on' : 'off') : String(fallback))
      }
      const numericProps = value => typeof value === 'number' && Number.isFinite(value) ? { 'data-numeric': 'true', className: 'dsh-native-collab-num' } : {}
      return h('section', { 'data-testid': 'enhancement-page' }, [stylesheet(),
        h('h3', { key: 'title' }, t('settingsTitle')),
        h('p', { key: 'scope' }, t('settingsScope')),
        h('p', { key: 'autosave-description' }, t('autoSaveDescription')),
        !settingsReady ? h('div', { key: 'availability', role: settingsLoading ? 'status' : 'alert', 'data-testid': 'settings-availability' }, [
          h('p', { key: 'message' }, t(settingsLoading ? 'settingsLoading' : 'settingsUnavailable')),
          !settingsLoading ? h('p', { key: 'reason' }, t('write.' + settingsReason)) : null,
        ]) : null,
        h(NativeLimitsPage, { key: 'native-limits', t, readLimits, writeLimits }),
        h('fieldset', { key: 'communication', 'data-testid': 'communication-feature' }, [
          h('legend', { key: 'legend' }, t('communicationTitle')),
          checkbox('communicationEnhancement', 'switch-communication'),
          h('div', { key: 'options', className: 'dsh-native-collab-options' }, [
            checkbox('runningChildGuidance', 'switch-running-child', !shown('communicationEnhancement')),
            checkbox('completedChildContinuation', 'switch-completed-child', !shown('communicationEnhancement')),
          ]),
          h('p', { key: 'note' }, t('communicationOffNote')),
        ]),
        h('fieldset', { key: 'team', 'data-testid': 'team-feature' }, [
          h('legend', { key: 'legend' }, t('teamTitle')),
          checkbox('modelEnhancement', 'switch-model'),
          h('p', { key: 'note' }, t('teamDescription')),
          h('p', { key: 'selection' }, h('label', null, [t('modelSource'),
            h('select', { key: 'select', 'data-testid': 'model-selection', 'data-field': 'modelSource', disabled: editingLocked, value: shown('modelSource'),
              onChange: event => updateField('modelSource', event.target.value) }, [
              h('option', { key: 'conversation', value: 'conversation' }, t('modelSourceConversation')),
              h('option', { key: 'settings', value: 'settings' }, t('modelSourceSettings')),
              h('option', { key: 'all', value: 'all' }, t('modelSourceAll')),
            ]),
          ])),
          fieldState('modelSource'), fieldError('modelSource'),
        ]),
        h('fieldset', { key: 'quota', 'data-testid': 'quota-feature' }, [
          h('legend', { key: 'legend' }, t('quotaTitle')),
          h('p', { key: 'input' }, h('label', null, [t('teamRequestLimit'), h('input', { key: 'input', type: 'number', min: 1, max: Number.MAX_SAFE_INTEGER, step: 1,
            'data-testid': 'team-request-limit', value: Number.isFinite(shown('teamRequestLimit')) ? shown('teamRequestLimit') : '', disabled: editingLocked,
            onChange: event => { if (!editingLocked) updateField('teamRequestLimit', event.target.value === '' ? NaN : Number(event.target.value)) } })])),

          !validValue('teamRequestLimit', shown('teamRequestLimit')) ? h('p', { key: 'invalid', role: 'alert', 'aria-live': 'polite', 'data-testid': 'quota-validation', 'data-field-error': 'teamRequestLimit', style: { color: 'var(--dsw-alias-danger, #d22)' } }, t('quotaValidation')) : null,
          h('p', { key: 'note' }, t('quotaRemains')),
          fieldError('teamRequestLimit'), fieldState('teamRequestLimit'),
        ]),
        h('section', { key: 'progress', 'data-testid': 'progress-results' }, [
          h('h4', { key: 'title' }, t('progressTitle')),
          h('p', { key: 'scope' }, t('progressScope')),
          h('details', { key: 'help', 'data-testid': 'progress-help' }, [
            h('summary', { key: 'entry' }, t('progressEntry')),
            h('ol', { key: 'steps' }, [
              h('li', { key: 'team' }, t('progressTeam')),
              h('li', { key: 'child' }, t('progressChild')),
              h('li', { key: 'action' }, t('progressAction')),
            ]),
          ]),
        ]),
        pending ? h('p', { key: 'pending', role: 'status', 'data-testid': 'pending-state' }, t('pendingRestartYes')) : null,
        notice ? h('div', { key: 'notice', role: notice.reason === 'refresh-failed' ? 'alert' : 'status', 'data-testid': 'write-notice' }, [
          h('p', { key: 'message' }, t('write.' + notice.reason)),
          notice.failureReason ? h('p', { key: 'reason', 'data-testid': 'write-failure-reason' }, t('write.' + notice.failureReason)) : null,
          notice.code ? h(FailureNotice, { key: 'error', t, code: notice.code }) : null,
        ]) : null,
        h(Button, { key: 'refresh', disabled: locked, 'data-testid': 'refresh-settings', onClick: () => { void refresh() } }, t('refreshSettings')),
        h('details', { key: 'diagnostics', 'data-testid': 'settings-diagnostics' }, [
          h('summary', { key: 'summary' }, t('settingsDiagnostics')),
          h('p', { key: 'restart' }, t('restartRequired')),
          h('p', { key: 'usage' }, t('quotaUsageUnknown')),
          h('table', { key: 'saved', className: 'dsh-native-collab-table dsh-native-collab-saved', 'data-testid': 'saved-state' }, [
            h('thead', { key: 'head' }, h('tr', null, [t('component'), t('savedState'), t('observedState')].map((text, index) => h('th', { key: index, scope: 'col' }, text)))),
            h('tbody', { key: 'body' }, ALLOWED_FIELDS.map(field => h('tr', { key: field }, [
              h('th', { key: 'name', scope: 'row' }, t(field)),
              h('td', { key: 'saved', ...numericProps(saved[field]) }, settingsReady ? stateText(saved[field], field) : t(settingsLoading ? 'loading' : 'unknown')),
              h('td', { key: 'active', ...numericProps(effective?.[field]) }, effective ? stateText(effective[field], field) : t('unknown')),
            ]))),
          ]),
        ]),
      ])
    }
    function RuntimeOverview({ t, status }) {
      const [snapshot, setSnapshot] = React.useState(null), [loading, setLoading] = React.useState(true), [failed, setFailed] = React.useState(false)
      const refresh = async () => { setLoading(true); try { const next = await status(); setSnapshot(next); setFailed(false) } catch { setSnapshot(null); setFailed(true) } finally { setLoading(false) } }
      React.useEffect(() => { void refresh() }, [status])
      const runtime = snapshot?.runtime, diagnosis = snapshot?.diagnosis ?? 'unknown'
      const allReady = diagnosis === 'managed' && runtime?.mode === 'managed' && runtime.phase === 'ready' && runtime.services?.length === RUNTIME_ROLES.length && RUNTIME_ROLES.length > 0 && runtime.services.every(service => service.phase === 'ready')
      const label = failed ? 'unknown' : diagnosis === 'native' ? 'native' : allReady ? 'managed' : diagnosis === 'legacy-mixed' ? 'mixed' : runtime?.phase === 'loading' ? 'loading' : runtime?.phase === 'failed' ? 'failed' : 'unknown'
      const failures = new Map()
      for (const item of runtime?.services ?? []) {
        if (!item.failure) continue
        const code = diagnosticCode(item.failure)
        const reason = ['ownership-unverified', 'ownership-not-released', 'inventory-unavailable'].includes(code) ? 'ownership-unverified'
          : ['plugin-start-failed', 'plugin-cleanup-failed'].includes(code) ? code : 'unknown'
        const group = failures.get(reason) ?? { roles: [], codes: new Set() }
        group.roles.push(t('runtime.role.' + item.role)); group.codes.add(code); failures.set(reason, group)
      }
      return h('section', { 'data-testid': 'runtime-overview', 'aria-busy': loading }, [h('h3', { key: 'title' }, t('runtime.title')),
        h('p', { key: 'state', role: failed || label === 'failed' || label === 'mixed' ? 'alert' : 'status' }, t('runtime.' + label)), label === 'native' ? h('p', { key: 'native-note' }, t('runtime.nativeNote')) : null,
        allReady ? h('p', { key: 'ready-note' }, t('runtime.readyNote')) : null,
        ...[...failures].map(([reason, group]) => h('div', { key: 'failure-' + reason, role: 'alert', 'data-runtime-failure': reason }, [
          h('p', { key: 'message' }, t('runtime.failure.' + reason)),
          h('details', { key: 'code' }, [h('summary', null, t('technicalDetails')), h('p', null, group.roles.join(', ')), h('code', null, [...group.codes].join(', '))]),
        ])),
        h(Button, { key: 'refresh', disabled: loading, onClick: () => { void refresh() } }, t('refreshRuntime')),
        runtime ? h('details', { key: 'details' }, [h('summary', null, t('runtime.details')),
          ...runtime.services.map(item => h('p', { key: item.role }, t('runtime.role.' + item.role) + ': ' + t('runtime.phase.' + item.phase))),
        ]) : null,
      ])
    }
    function BundleConfig(props) {
      if (props.view === 'summary') return props.t('settingsSummary')
      if (props.view !== 'page') return null
      return h(React.Fragment, null, [
        props.remoteDiagnosis ? h(FailureNotice, { key: 'diagnosis', t: props.t, code: props.remoteDiagnosis }) : null,
        h(RuntimeOverview, { key: 'runtime', t: props.t, status: props.readStatus }),
        h(EnhancementPage, { key: 'settings', ...props }),
        h('details', { key: 'status' }, [h('summary', { key: 'summary' }, props.t('title')), h(StatusPage, { key: 'status', t: props.t, status: props.readStatus, remoteDiagnosis: props.remoteDiagnosis })]),
      ])
    }
    function StatusPage({ t, status, remoteDiagnosis }) {
      const [state, setState] = React.useState({ loading: true })
      React.useEffect(() => { let alive = true; Promise.resolve().then(status).then(snapshot => { if (alive) setState({ snapshot }) }).catch(() => { if (alive) setState({ error: true }) }); return () => { alive = false } }, [status])
      const snapshot = state.snapshot
      const phaseText = phase => phase === null || phase === undefined ? t('unknown') : t('phase.' + phase)
      return h('section', { 'data-testid': 'collab-ui-status' }, [stylesheet(),
        ...(remoteDiagnosis ? [h(FailureNotice, { key: 'remote-diagnosis', t, code: remoteDiagnosis })] : []),
        h('h3', { key: 'title' }, t('title')),
        state.loading ? h('p', { key: 'loading' }, t('loading')) : state.error || !snapshot ? h('p', { key: 'error', role: 'alert' }, t('statusError')) : h('div', { key: 'rows', className: 'dsh-native-collab-table-frame' }, h('table', { className: 'dsh-native-collab-table', 'data-testid': 'runtime-state' }, [
          h('thead', { key: 'head' }, h('tr', null, ['component', 'currentState', 'sourceLayer', 'runtimePhase'].map(key => h('th', { key, scope: 'col' }, t(key))))),
          h('tbody', { key: 'body' }, (snapshot.rows ?? []).map(row => {
            const placeholder = DERIVED_PLACEHOLDERS.has(row.id)
            const nameId = 'dsh-native-collab-row-' + row.id
            const noteId = placeholder ? nameId + '-note' : null
            return h('tr', { key: row.id, 'data-kind': 'derived', 'data-placeholder': placeholder ? 'true' : 'false' }, [
              h('th', noteId
                ? { key: 'name', scope: 'row', 'aria-labelledby': nameId, 'aria-describedby': noteId }
                : { key: 'name', scope: 'row', 'aria-labelledby': nameId }, [
                h('span', { key: 'label', id: nameId, className: 'dsh-native-collab-row-label' }, [t('derivedKind'), ' ', t('row.' + row.id)]),
                noteId ? h('p', { key: 'placeholder', id: noteId, className: 'dsh-native-collab-placeholder', 'data-testid': 'derived-placeholder' }, t('statusPlaceholder')) : null,
              ]),
              h('td', { key: 'current' }, t(row.current ?? 'unknown')), h('td', { key: 'layer' }, t(row.sourceLayer ?? 'unknown')),
              h('td', { key: 'phase' }, phaseText(row.runtimePhase)),
            ])
          })),
        ])),
        h('p', { key: 'scope-note', 'data-testid': 'status-root-scope' }, t('statusRootScope')),
        h('p', { key: 'unknown' }, t('modalPresetUnknown')),
        h('p', { key: 'ro' }, t('statusReadOnly')),
      ])
    }
    function DetailBadge({ t, subject }) {
      const match = coreOf(subject)
      return match ? h('span', { 'data-testid': 'lifecycle-badge', 'data-lifecycle-scope': match.scope === 'core' ? match.pair.key : 'bundle' }, t('lifecycleBadge')) : null
    }
    function DetailSection({ t, subject }) {
      const match = coreOf(subject)
      return match ? h(LifecycleNotice, { t, match }) : null
    }
    return {
      inject: ['slots', 'remote', 'locale'],
      async apply(ctx) {
        let unmount = async () => {}
        let mountError = null
        try {
          const disposeRemote = await ctx.remote.$mount(REMOTE)
          if (typeof disposeRemote !== 'function') throw new Error('client api: Remote $mount did not return a disposer')
          unmount = disposeRemote
        } catch (error) {
          // Official $mount validates, then rolls its own partial install back
          // before throwing, and does not return a disposer. Keep that error
          // visible without failing Web startup.
          mountError = error && typeof error === 'object' && typeof error.message === 'string' ? error : new Error(String(error))
        }
        let unregisterLocale = () => {}
        const disposers = []
        const disposeSlots = () => { for (const dispose of disposers.splice(0).reverse()) if (typeof dispose === 'function') dispose() }
        const release = async () => { disposeSlots(); unregisterLocale(); unregisterLocale = () => {}; await unmount(); unmount = async () => {} }
        try {
          unregisterLocale = ctx.locale.register(LOCALE, Object.fromEntries(Object.entries(UI_LOCALES).map(([language, dictionary]) => [language, flattenLocale(dictionary)]))) ?? (() => {})
          // collabUi is created by this apply's $mount. Putting it in the
          // top-level inject parks the fiber before apply, so $mount never
          // runs. After the namespace exists, Cordis redirects
          // ctx.remote.<namespace> through the inject proxy and throws unless
          // that name was injected. Try the plain property first so fixture
          // objects keep working, then ctx.get, which reads the store without
          // inject. ctx.inject waits forever when the name is missing, so it
          // is not the failure path.
          const isCollab = value => !!value && typeof value.status === 'function'
          const isSettings = value => !!value && typeof value.describe === 'function' && typeof value.mutate === 'function'
          const resolveRemote = (name, accept) => {
            const suffix = name.startsWith('remote.') ? name.slice('remote.'.length) : name
            let denied = null
            let lookedUp = false
            try {
              const nested = ctx.remote?.[suffix]
              if (accept(nested)) return { service: nested }
            } catch (error) {
              denied = error instanceof Error ? error : new Error(String(error))
            }
            if (typeof ctx.get === 'function') {
              try {
                const service = ctx.get(name)
                lookedUp = true
                if (accept(service)) return { service }
              } catch { /* fixture get may throw; a missing Cordis service does not */ }
            }
            if (!lookedUp) try {
              const keyed = ctx[name]
              if (accept(keyed)) return { service: keyed }
            } catch (error) {
              denied ??= error instanceof Error ? error : new Error(String(error))
            }
            return { error: denied ?? new Error(`client api: Remote namespace ${suffix} is not mounted`) }
          }
          const note = resolved => resolved && !resolved.service ? (failureDetail(resolved.error) || resolved.error?.message) : null
          const collabProbe = mountError ? null : resolveRemote('remote.collabUi', isCollab)
          const settingsProbe = resolveRemote('remote.settings', isSettings)
          const settingsDenied = settingsProbe.error && /without inject/.test(settingsProbe.error.message) ? note(settingsProbe) : null
          const accessNotes = [mountError ? null : note(collabProbe), settingsDenied].filter(Boolean)
          const diagnosis = mountError || accessNotes.length ? 'remote-unavailable' : null
          const namespace = () => {
            const resolved = resolveRemote('remote.collabUi', isCollab)
            if (resolved.service) return resolved.service
            throw resolved.error
          }
          const status = () => {
            if (mountError) return Promise.reject(mountError)
            try { return unwrap(namespace().status()) } catch (error) { return Promise.reject(error) }
          }
          const callSettings = (method, args) => {
            const resolved = resolveRemote('remote.settings', isSettings)
            if (!resolved.service) return Promise.reject(resolved.error)
            try { return resolved.service[method](...args) } catch (error) { return Promise.reject(error) }
          }
          const settings = { describe: () => callSettings('describe', []), mutate: (...args) => callSettings('mutate', args) }
          const callLimits = async (method, args) => {
            if (mountError) throw new Error('native-limits-unavailable')
            const result = remoteValue(await namespace()[method](...args))
            if (!result.ok) {
              const conflict = result.error?.code === 'native-limits-conflict' || result.error?.message === 'native-limits-conflict'
              throw new Error(conflict ? 'native-limits-conflict' : 'native-limits-save-failed')
            }
            return result.value
          }
          const readLimits = () => callLimits('limits', [])
          const writeLimits = request => callLimits('saveLimits', [request])
          const register = (name, spec, Component) => { disposers.push(ctx.slots.inject(name, () => ctx.slots.register({ name, locale: LOCALE, ...spec }, Component))) }
          register('plugins.bundle.config', { key: PACKAGE, inject: () => ({ readStatus: status, settings, readLimits, writeLimits, remoteMountError: mountError, remoteDiagnosis: diagnosis }) }, BundleConfig)
          register('plugins.detail.badge', { id: 'collab-ui-status', order: 50 }, DetailBadge)
          register('plugins.detail.section', { id: 'collab-ui-status', order: 50 }, DetailSection)
          register('plugins.row.config', { key: CONTROL_SLOT_KEY, inject: () => ({ readStatus: status, settings, readLimits, writeLimits }) }, EnhancementPage)
          return release
        } catch (error) {
          await release()
          throw error
        }
      },
    }
  },
})
