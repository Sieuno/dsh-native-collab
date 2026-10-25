window.__ModuleLoader__.load({
  id: '@dsh-native-collab/derived',
  factory(require) {
    const React = require('react')
    const { Button, Modal } = require('@deepseek-ai/dsh-client-ui-primitives')
    const h = React.createElement
    const PACKAGE = '@dsh-native-collab/derived'
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
.dsh-native-collab-placeholder, .dsh-native-collab-module-note { display: block; margin: 0.45em 0 0; padding-top: 0.35em; border-top: 1px solid var(--dsw-alias-divider, currentColor); font-size: 0.85em; line-height: 1.45; }
.dsh-native-collab-operation { display: inline-block; white-space: nowrap; word-break: normal; overflow-wrap: normal; }
`
    const stylesheet = () => h('style', { key: 'collab-styles', 'data-testid': 'collab-styles' }, UI_CSS)
    // Ordinary-tool root rows. They stay off; the tools themselves run inside presets.
    const DERIVED_PLACEHOLDERS = new Set(['dsh-native-collab-tool-subagent', 'dsh-native-collab-tool-subagent-fork'])
    // Restore and uninstall codes. An enable confirmation never shows these, even if a stale plan includes them.
    const ENABLE_SUPPRESSED_WARNINGS = new Set([
      'native-features-will-be-enabled',
      'original-disabled-state-not-restored',
      'clears-derived-row-overrides-and-preferences',
      'own-profile-preferences-will-be-cleared',
      'stop-profile-before-remove',
      'remove-only-after-off-and-verification',
    ])
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
    const ALLOWED_FIELDS = ['modelEnhancement', 'communicationEnhancement', 'nativeModelSelectionCompatibility', 'runningChildGuidance', 'completedChildContinuation', 'teamRequestLimit']
    const CORE_PAIRS = [
      { key: 'subagent', nativeId: 'subagent', derivedId: 'dsh-native-collab-subagent', moduleName: `${PACKAGE}/subagent` },
      { key: 'control', nativeId: 'tool-subagent-control', derivedId: 'dsh-native-collab-tool-subagent-control', moduleName: `${PACKAGE}/tool-subagent-control` },
      { key: 'listAgents', nativeId: 'tool-subagent-list-agents', derivedId: 'dsh-native-collab-tool-subagent-list-agents', moduleName: `${PACKAGE}/tool-subagent-control/list-agents` },
      { key: 'agentTeam', nativeId: 'agent-team', derivedId: 'dsh-native-collab-agent-team', moduleName: `${PACKAGE}/agent-team` },
      { key: 'teamTools', nativeId: 'tool-agent-team', derivedId: 'dsh-native-collab-tool-agent-team', moduleName: `${PACKAGE}/tool-agent-team` },
    ]
    const STATUS_IDS = [...CORE_PAIRS.map(row => row.derivedId), 'dsh-native-collab-tool-subagent', 'dsh-native-collab-tool-subagent-fork']
    const ACTION_TYPE = `${PACKAGE}/collab-ui#CollabUiAction`
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
      exactKeys(value, ['present'], ['modelEnhancement', 'communicationEnhancement', 'nativeModelSelectionCompatibility', 'runningChildGuidance', 'completedChildContinuation', 'teamRequestLimit'])
      if (value.present !== true) strictFailure('collabUi assembly.present must be true')
      const parsed = { present: true }
      for (const key of ['modelEnhancement', 'communicationEnhancement', 'nativeModelSelectionCompatibility', 'runningChildGuidance', 'completedChildContinuation']) {
        if (!Object.hasOwn(value, key)) continue
        if (typeof value[key] !== 'boolean') strictFailure(`collabUi assembly.${key} must be a boolean`)
        parsed[key] = value[key]
      }
      if (Object.hasOwn(value, 'teamRequestLimit')) {
        if (typeof value.teamRequestLimit !== 'number' || !Number.isSafeInteger(value.teamRequestLimit) || value.teamRequestLimit < 1) strictFailure('collabUi assembly.teamRequestLimit must be a positive safe integer')
        parsed.teamRequestLimit = value.teamRequestLimit
      }
      return parsed
    }
    function statusSchema() {
      return { parse(value) {
        if (!isPlainObject(value)) strictFailure('collabUi status must be an object')
        exactKeys(value, ['profileName', 'hmrEnabled', 'rows', 'desired', 'pendingRestart', 'writeSupport', 'operationError', 'error', 'assembly'])
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
        }
      } }
    }
    function actionSchema() {
      return { parse(value) {
        if (value !== 'enable' && value !== 'restore') strictFailure('collabUi/bootPlan action must be "enable" or "restore"')
        return value
      } }
    }
    function strictCodec(typeSymbol, schema) {
      return { mode: 'strict', typeSymbol, create: schema, decode: value => schema().parse(value) }
    }
    function bootSchema(kind) {
      return { parse(value) {
        if (!isPlainObject(value)) strictFailure('boot switch response must be an object')
        const fields = kind === 'status' ? ['profileName', 'configured', 'writeSupport', 'pendingRestart', 'error']
          : kind === 'plan' ? ['action', 'accepted', 'planId', 'targets', 'pendingRestart', 'error', 'warnings']
          : ['action', 'accepted', 'pendingRestart', 'error', 'configured']
        exactKeys(value, fields)
        if (value.error !== null && typeof value.error !== 'string') strictFailure('invalid boot switch error')
        if (!['required', 'unknown'].includes(value.pendingRestart)) strictFailure('invalid boot restart state')
        if (kind === 'status') {
          if (value.profileName !== null && typeof value.profileName !== 'string') strictFailure('invalid boot Profile')
          if (!['available', 'blocked'].includes(value.writeSupport)) strictFailure('invalid boot write support')
        } else {
          actionSchema().parse(value.action)
          if (typeof value.accepted !== 'boolean' || kind === 'plan' && value.accepted !== false) strictFailure('invalid boot acceptance')
          if (value.pendingRestart !== 'required') strictFailure('boot changes require restart')
        }
        if (kind !== 'plan' && !['enabled', 'disabled', 'mixed', 'unknown'].includes(value.configured)) strictFailure('invalid boot configured state')
        if (kind === 'plan') {
          if (value.planId !== null) bootPlanIdSchema().parse(value.planId)
          if (!Array.isArray(value.warnings) || value.warnings.some(item => typeof item !== 'string')) strictFailure('invalid boot warnings')
          if (!Array.isArray(value.targets)) strictFailure('invalid boot targets')
          for (const target of value.targets) {
            if (!isPlainObject(target)) strictFailure('invalid boot target')
            exactKeys(target, ['scope', 'id', 'moduleName', 'operation', 'previousModule'])
            for (const key of ['scope', 'id', 'moduleName']) if (typeof target[key] !== 'string' || !target[key]) strictFailure('invalid boot target identity')
            if (!['enable', 'disable', 'replace', 'clear'].includes(target.operation)) strictFailure('invalid boot target operation')
            if (target.previousModule !== null && typeof target.previousModule !== 'string') strictFailure('invalid previous boot module')
          }
        }
        return value
      } }
    }
    function bootPlanIdSchema() { return { parse(value) {
      if (typeof value !== 'string' || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value)) strictFailure('invalid boot confirmation token')
      return value
    } } }
    const actionCodec = strictCodec(ACTION_TYPE, actionSchema)
    const bootPlanIdCodec = strictCodec(PACKAGE + '/boot-switch#BootPlanId', bootPlanIdSchema)
    const REMOTE = {
      package: PACKAGE,
      services: [{ namespace: 'collabUi' }],
      descriptors: [
        {
          id: `${PACKAGE}#collabUi/status`, service: 'collabUi', namespace: 'collabUi', method: 'status',
          invocation: { kind: 'direct' }, parameters: [], result: strictCodec(STATUS_TYPE, statusSchema),
        },
        {
          id: PACKAGE + '#collabUi/bootStatus', service: 'collabUi', namespace: 'collabUi', method: 'bootStatus',
          invocation: { kind: 'direct' }, parameters: [], result: strictCodec(PACKAGE + '/boot-switch#BootStatus', () => bootSchema('status')),
        },
        {
          id: PACKAGE + '#collabUi/bootPlan', service: 'collabUi', namespace: 'collabUi', method: 'bootPlan', invocation: { kind: 'direct' },
          parameters: [{ name: 'action', wire: 'action', source: 'json', codec: actionCodec, strictCodec: actionCodec }],
          result: strictCodec(PACKAGE + '/boot-switch#BootPlan', () => bootSchema('plan')),
        },
        {
          id: PACKAGE + '#collabUi/bootApply', service: 'collabUi', namespace: 'collabUi', method: 'bootApply', invocation: { kind: 'direct' },
          parameters: [{ name: 'planId', wire: 'planId', source: 'json', codec: bootPlanIdCodec, strictCodec: bootPlanIdCodec }],
          result: strictCodec(PACKAGE + '/boot-switch#BootResult', () => bootSchema('result')),
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
      return h('section', { 'data-testid': 'lifecycle-warning', 'data-lifecycle-scope': pair ? pair.key : 'bundle' }, [
        h('h4', { key: 'title' }, t('lifecycleTitle')),
        h('p', { key: 'install' }, t('lifecycleInstall')),
        h('p', { key: 'remove', role: 'alert' }, t('lifecycleRemove')),
        h('p', { key: 'restore' }, t('lifecycleRestore')),
        pair ? h('p', { key: 'core' }, t(`lifecycleCore.${pair.key}`)) : h('ul', { key: 'cores' }, CORE_PAIRS.map(core => h('li', { key: core.key }, core.derivedId))),
        h('ol', { key: 'order', 'data-testid': 'lifecycle-order' }, ['stop', 'backup', 'withdraw', 'verify', 'remove', 'restart'].map(key => h('li', { key }, t(`lifecycleStep.${key}`)))),
        h('p', { key: 'sidecar' }, t('lifecycleSidecar')),
        h('p', { key: 'boundary' }, t('lifecycleNotAuto')),
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
      return field === 'teamRequestLimit' ? Number.isSafeInteger(value) && value >= 1 : typeof value === 'boolean'
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
    function schemaIsExact(schema) {
      const located = schemaRoot(schema)
      if (!located) return false
      const keys = Object.keys(located.root.dict)
      if (keys.length !== ALLOWED_FIELDS.length || ALLOWED_FIELDS.some(field => !keys.includes(field))) return false
      return ALLOWED_FIELDS.every(field => {
        const ref = located.root.dict[field]
        const node = ref && typeof ref === 'object' ? ref : located.refs?.[String(ref)]
        return node?.type === (field === 'teamRequestLimit' ? 'number' : 'boolean') && node.meta?.required !== true
      })
    }
    function savedFlags(form) {
      const saved = {}
      for (const field of ALLOWED_FIELDS) {
        if (!Object.hasOwn(form?.state?.value ?? {}, field)) continue
        const value = form.state.value[field]
        saved[field] = field === 'teamRequestLimit' ? value : readFlag(value)
      }
      return saved
    }
    function missingBases(observed) {
      const rows = observed?.status === 'ready' && Array.isArray(observed.result?.rows) ? observed.result.rows : []
      return STATUS_IDS.filter(id => rows.filter(row => row?.id === id && row.current === 'enabled').length !== 1)
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
      if (!Number.isSafeInteger(row.revision)) return { reason: 'revision-missing' }
      if (document.writable !== true) return { reason: document.writable === false ? 'not-writable' : 'settings-unverified' }
      return { row }
    }
    async function commitViaVerifiedSettings(settings, ops, captured) {
      const snapshot = captured ?? await describeOwn(settings)
      if (!snapshot.row) return { wrote: false, ...snapshot }
      let response
      try { response = remoteValue(await settings.mutate(snapshot.row.ns, ops, snapshot.row.revision)) } catch { return { wrote: false, reason: 'rejected' } }
      return response.ok ? { wrote: true, reason: 'saved-pending-restart' }
        : { wrote: false, reason: failureReason(response.error, 'rejected'), detail: failureDetail(response.error) }
    }
    async function commitOwnSettings({ form, settings, patch, captured }) {
      if (Object.keys(patch).some(field => !ALLOWED_FIELDS.includes(field) || (patch[field] !== undefined && !validValue(field, patch[field])))) return { wrote: false, reason: 'field-rejected' }
      const ops = allowlistedOps(patch)
      if (!ops.length) return { wrote: false, reason: 'empty' }
      if (!form) return commitViaVerifiedSettings(settings, ops, captured)
      if (form.state?.status !== 'ready' || !Number.isSafeInteger(form.state.revision)) return { wrote: false, reason: 'settings-unavailable' }
      if (form.state.writable === false) return { wrote: false, reason: 'not-writable' }
      try { const ok = await form.mutate(ops, form.state.revision); return { wrote: ok === true, reason: ok === true ? 'saved-pending-restart' : 'rejected' } }
      catch { return { wrote: false, reason: 'rejected' } }
    }
    function ActivationPrompt({ t, onDismiss, onOpenDetails }) {
      return h(Modal, {
        open: true, title: t('activationTitle'), className: MODAL_CLASS, contentClassName: CONTENT_CLASS, closeLabel: t('modalCancel'), onClose: onDismiss,
        footer: h(React.Fragment, null, [
          h(Button, { key: 'later', onClick: onDismiss, 'data-testid': 'activation-dismiss' }, t('activationLater')),
          h(Button, { key: 'details', variant: 'primary', onClick: onOpenDetails, 'data-testid': 'activation-details' }, t('activationDetails')),
        ]),
      }, [stylesheet(), h('p', { key: 'body' }, t('activationBody'))])
    }
    function EnhancementPage({ t, view, form, readStatus, settings, subject }) {
      if (subject?.row?.rowId && subject.row.rowId !== CONTROL_ENTRY_ID) return null
      if (view === 'summary') return t('settingsSummary')
      if (view !== 'page') return null
      const [draft, setDraft] = React.useState({})
      const [observed, setObserved] = React.useState({ status: 'loading' })
      const [captured, setCaptured] = React.useState({ reason: 'settings-unavailable' })
      const [modal, setModal] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      React.useEffect(() => {
        let alive = true
        Promise.resolve().then(readStatus).then(result => { if (alive) setObserved({ status: 'ready', result }) }).catch(() => { if (alive) setObserved({ status: 'unknown' }) })
        if (!form) void describeOwn(settings).then(result => { if (alive) setCaptured(result) })
        return () => { alive = false }
      }, [readStatus, settings, form])
      const saved = savedFlags(form ?? { state: { value: captured.row?.value } })
      const effective = observed.result?.assembly
      const defaults = { modelEnhancement: false, communicationEnhancement: false, nativeModelSelectionCompatibility: false, runningChildGuidance: true, completedChildContinuation: true, teamRequestLimit: 32 }
      const shown = field => Object.hasOwn(draft, field) ? draft[field] : saved[field] ?? effective?.[field] ?? defaults[field]
      const pending = notice?.reason === 'saved-pending-restart' || (effective && ALLOWED_FIELDS.some(field => Object.hasOwn(saved, field) && (saved[field] ?? defaults[field]) !== (effective[field] ?? defaults[field])))
      const patchFor = group => Object.fromEntries(Object.entries(draft).filter(([field]) => group === 'model' ? ['modelEnhancement', 'nativeModelSelectionCompatibility'].includes(field) : group === 'communication' ? ['communicationEnhancement', 'runningChildGuidance', 'completedChildContinuation'].includes(field) : field === 'teamRequestLimit'))
      const runCommit = async patch => {
        if (busy) return
        setBusy(true)
        try {
          const result = await commitOwnSettings({ form, settings, patch, captured })
          setNotice(result)
          if (result.wrote) {
            setDraft(current => Object.fromEntries(Object.entries(current).filter(([field]) => !Object.hasOwn(patch, field))))
            if (!form) setCaptured(await describeOwn(settings))
          }
        } finally { setBusy(false); setModal(null) }
      }
      const requestSave = group => {
        const patch = patchFor(group)
        if (!Object.keys(patch).length) { setNotice({ reason: 'empty' }); return }
        const missing = missingBases(observed)
        const nativeRisk = group === 'model' && (patch.modelEnhancement === false || (shown('modelEnhancement') && shown('nativeModelSelectionCompatibility')))
        if (group !== 'quota' && (missing.length || nativeRisk)) { setModal({ group, patch, missing, nativeRisk }); return }
        void runCommit(patch)
      }
      const checkbox = (field, testId, disabled = false) => h('p', { key: field }, h('label', null, [
        h('input', { key: 'input', type: 'checkbox', 'data-testid': testId, checked: shown(field) === true, disabled: busy || disabled,
          onChange: event => setDraft(current => ({ ...current, [field]: event.target.checked === true })) }), t(field),
      ]))
      const stateText = value => value === undefined ? t('unset') : typeof value === 'boolean' ? t(value ? 'on' : 'off') : String(value)
      const numericProps = value => typeof value === 'number' && Number.isFinite(value) ? { 'data-numeric': 'true', className: 'dsh-native-collab-num' } : {}
      return h('section', { 'data-testid': 'enhancement-page' }, [stylesheet(),
        h('h3', { key: 'title' }, t('settingsTitle')),
        h('p', { key: 'scope' }, t('settingsScope')),
        h('table', { key: 'settings-state', className: 'dsh-native-collab-table dsh-native-collab-saved', 'data-testid': 'saved-state' }, [
          h('thead', { key: 'head' }, h('tr', null, [t('component'), t('savedState'), t('observedState')].map((text, index) => h('th', { key: index, scope: 'col' }, text)))),
          h('tbody', { key: 'body' }, ALLOWED_FIELDS.map(field => {
            const savedValue = saved[field]
            const observedValue = effective ? (effective[field] ?? defaults[field]) : undefined
            return h('tr', { key: field }, [
              h('th', { key: 'name', scope: 'row' }, t(field)), h('td', { key: 'saved', ...numericProps(savedValue) }, stateText(savedValue)),
              h('td', { key: 'active', ...numericProps(observedValue) }, effective ? stateText(observedValue) : t('unknown')),
            ])
          })),
        ]),
        h('p', { key: 'pending', 'data-testid': 'pending-state' }, `${t('pendingState')}: ${t(pending ? 'pendingRestartYes' : effective ? 'same' : 'unknown')}`),
        h('p', { key: 'restart' }, t('restartRequired')),
        checkbox('modelEnhancement', 'switch-model'), checkbox('nativeModelSelectionCompatibility', 'switch-native-compat', !shown('modelEnhancement')),
        h('p', { key: 'compat-note' }, t('nativeCompatNote')),
        h(Button, { key: 'save-model', disabled: busy, 'data-testid': 'save-model', onClick: () => requestSave('model') }, t('saveModel')),
        checkbox('communicationEnhancement', 'switch-communication'),
        checkbox('runningChildGuidance', 'switch-running-child', !shown('communicationEnhancement')),
        checkbox('completedChildContinuation', 'switch-completed-child', !shown('communicationEnhancement')),
        h('p', { key: 'comm-note' }, t('communicationOffNote')),
        h(Button, { key: 'save-comm', disabled: busy, 'data-testid': 'save-communication', onClick: () => requestSave('communication') }, t('saveCommunication')),
        h('p', { key: 'quota' }, h('label', null, [t('teamRequestLimit'), h('input', { key: 'input', type: 'number', min: 1, max: Number.MAX_SAFE_INTEGER, step: 1,
          'data-testid': 'team-request-limit', value: Number.isFinite(shown('teamRequestLimit')) ? shown('teamRequestLimit') : '', disabled: busy,
          onChange: event => setDraft(current => ({ ...current, teamRequestLimit: event.target.value === '' ? NaN : Number(event.target.value) })) })])),
        h('p', { key: 'quota-note' }, t('quotaRemains')),
        h('p', { key: 'usage' }, t('quotaUsageUnknown')),
        h(Button, { key: 'save-quota', disabled: busy || !validValue('teamRequestLimit', shown('teamRequestLimit')), 'data-testid': 'save-quota', onClick: () => requestSave('quota') }, t('saveQuota')),
        notice ? h('p', { key: 'notice', role: 'status', 'data-testid': 'write-notice' }, [t(`write.${notice.reason}`), notice.detail ? h('span', { key: 'detail' }, notice.detail) : null]) : null,
        modal ? h(Modal, { key: 'modal', className: MODAL_CLASS, contentClassName: CONTENT_CLASS, open: true, title: t('modalTitle'), closeLabel: t('modalCancel'), onClose: () => { if (!busy) setModal(null) },
          footer: h(React.Fragment, null, [
            h(Button, { key: 'cancel', disabled: busy, 'data-testid': 'modal-cancel', onClick: () => setModal(null) }, t('modalCancel')),
            h(Button, { key: 'confirm', variant: 'primary', disabled: busy, 'data-testid': 'modal-confirm', onClick: () => { void runCommit(modal.patch) } }, t('modalSavePreference')),
          ]),
        }, [h('p', { key: 'missing' }, modal.missing.length ? t('modalPresetUnknown') : t('modalBasesReady')), modal.nativeRisk ? h('p', { key: 'risk', role: 'alert' }, t('modalScope')) : null]) : null,
      ])
    }
    function BootPanel({ t, boot, onApplied }) {
      const [state, setState] = React.useState(null)
      const [plan, setPlan] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [notice, setNotice] = React.useState(null)
      const [focusOwner] = React.useState(() => ({ node: null, restore: false }))
      // Capture before disabling the trigger; Modal otherwise snapshots body.
      // Run after the close commit, after host modal cleanup, with the trigger enabled.
      React.useEffect(() => {
        if (plan || busy || !focusOwner.restore) return
        focusOwner.restore = false
        const node = focusOwner.node
        if (!node || typeof node.focus !== 'function') return
        const timer = setTimeout(() => { if (node.isConnected !== false && !node.disabled) node.focus({ preventScroll: true }) }, 0)
        return () => clearTimeout(timer)
      }, [plan, busy, focusOwner])
      React.useEffect(() => { let alive = true; Promise.resolve().then(boot.status).then(value => { if (alive) setState(value) }).catch(error => { if (alive) setNotice(String(error.message || error)) }); return () => { alive = false } }, [boot])
      const closePlan = () => { if (!busy) { focusOwner.restore = true; setPlan(null) } }
      const review = async (action, event) => {
        if (busy) return
        // Repeated enable only rewrites the same module names. Do not open another confirmation or write.
        if (action === 'enable' && state?.configured === 'enabled') {
          setPlan(null)
          setNotice(t('boot.alreadyEnabled'))
          return
        }
        focusOwner.node = event?.currentTarget ?? globalThis.document?.activeElement ?? null
        focusOwner.restore = false
        setBusy(true); setNotice(null)
        try { setPlan(await boot.plan(action)) } catch (error) { setNotice(String(error.message || error)); focusOwner.restore = true }
        finally { setBusy(false) }
      }
      const commit = async () => {
        if (busy || !plan?.planId || plan.error) return
        setBusy(true)
        try {
          const result = await boot.apply(plan.planId)
          focusOwner.restore = true
          setPlan(null)
          if (result.accepted) {
            setState(current => ({ ...current, configured: result.configured, pendingRestart: 'required', error: null }))
            setNotice(t('boot.saved'))
            onApplied()
          } else setNotice(t('boot.failed') + ': ' + (result.error || t('unknown')))
        } catch (error) { setNotice(String(error.message || error)); focusOwner.restore = true; setPlan(null) }
        finally { setBusy(false) }
      }
      return h('section', { 'data-testid': 'boot-switch-panel' }, [stylesheet(),
        h('h3', { key: 'title' }, t('boot.title')),
        h('p', { key: 'scope' }, t('boot.scope')),
        h('p', { key: 'standing', 'data-testid': 'boot-standing' }, t('boot.standingNote')),
        h('p', { key: 'state', 'data-testid': 'boot-configured-state' }, t('boot.configured') + ': ' + t('boot.state.' + (state?.configured || 'unknown'))),
        state?.error ? h('p', { key: 'blocked', role: 'alert' }, t('boot.blocked') + ': ' + state.error) : null,
        h(Button, { key: 'on', 'data-testid': 'boot-enable', disabled: busy, onClick: event => { void review('enable', event) } }, t('boot.enable')),
        h(Button, { key: 'off', 'data-testid': 'boot-restore', disabled: busy, onClick: event => { void review('restore', event) } }, t('boot.restore')),
        notice ? h('p', { key: 'notice', role: 'status', 'data-testid': 'boot-notice' }, notice) : null,
        plan ? h(Modal, { key: 'review', className: MODAL_CLASS, contentClassName: CONTENT_CLASS, open: true, title: t('boot.confirmTitle'), closeLabel: t('modalCancel'), onClose: closePlan, 'data-action': plan.action, 'data-testid': 'boot-review',
          footer: h(React.Fragment, null, [
            h(Button, { key: 'cancel', disabled: busy, 'data-modal-autofocus': true, 'data-testid': 'boot-cancel', onClick: closePlan }, t('modalCancel')),
            h(Button, { key: 'confirm', variant: 'primary', disabled: busy || !plan.planId || !!plan.error, 'data-testid': 'boot-confirm', onClick: () => { void commit() } }, t('boot.confirm')),
          ]),
        }, [h('p', { key: 'intro', role: 'alert', 'data-testid': 'boot-intro' }, t(plan.action === 'enable' ? 'boot.enableIntro' : 'boot.restoreIntro')),
          h('p', { key: 'pin', 'data-testid': 'boot-preset-pin' }, t('boot.presetPin')),
          plan.action === 'restore' ? h('p', { key: 'uninstall', 'data-testid': 'boot-uninstall' }, t('boot.uninstall')) : null,
          h('p', { key: 'restart' }, t('boot.restart')),
          ...(Array.isArray(plan.warnings) ? plan.warnings : []).filter(code => typeof code === 'string' && (plan.action === 'restore' || !ENABLE_SUPPRESSED_WARNINGS.has(code))).map(code => h('p', { key: code, 'data-warning': code }, (() => { const text = t('boot.warning.' + code); return text === 'boot.warning.' + code ? code : text })())),
          plan.error ? h('p', { key: 'error', role: 'alert' }, t('boot.blocked') + ': ' + plan.error) : null,
          h('div', { key: 'target-frame', className: 'dsh-native-collab-table-frame', 'data-testid': 'boot-target-scroll' }, h('table', { className: 'dsh-native-collab-table dsh-native-collab-targets', 'data-testid': 'boot-target-list' }, [
            h('thead', { key: 'head' }, h('tr', null, ['scopeColumn', 'targetColumn', 'operationColumn'].map(key => h('th', { key, scope: 'col' }, t('boot.' + key))))),
            h('tbody', { key: 'body' }, plan.targets.map((target, index) => {
              const sameModule = !!(target.previousModule && target.previousModule === target.moduleName)
              const noteId = sameModule ? 'dsh-native-collab-module-note-' + index : null
              return h('tr', { key: index, 'data-module-unchanged': sameModule ? 'true' : 'false' }, [
                h('td', { key: 'scope' }, target.scope), h('td', { key: 'target' }, [target.id, ': ', target.previousModule ? target.previousModule + ' → ' : '', target.moduleName]),
                h('td', noteId ? { key: 'operation', 'aria-describedby': noteId } : { key: 'operation' }, [
                  h('span', { key: 'op', className: 'dsh-native-collab-operation' }, t('boot.operation.' + target.operation)),
                  noteId ? h('p', { key: 'unchanged', id: noteId, className: 'dsh-native-collab-module-note', 'data-testid': 'module-unchanged' }, t('boot.moduleUnchanged')) : null,
                ]),
              ])
            })),
          ])),
        ]) : null,
      ])
    }
    function BundleConfig(props) {
      const [bootChanged, setBootChanged] = React.useState(false)
      if (props.view === 'summary') return props.t('settingsSummary')
      if (props.view !== 'page') return null
      return h(React.Fragment, null, [
        props.remoteDiagnosis ? h('p', { key: 'diagnosis', role: 'alert', 'data-testid': 'remote-mount-diagnosis' }, props.remoteDiagnosis) : null,
        h(BootPanel, { key: 'boot', t: props.t, boot: props.boot, onApplied: () => setBootChanged(true) }),
        bootChanged ? h('p', { key: 'restart', role: 'alert' }, props.t('boot.restartBeforeSettings')) : h(EnhancementPage, { key: 'settings', ...props }),
        h('details', { key: 'status' }, [h('summary', { key: 'summary' }, props.t('title')), h(StatusPage, { key: 'status', t: props.t, status: props.readStatus, remoteDiagnosis: props.remoteDiagnosis })]),
      ])
    }
    function StatusPage({ t, status, remoteDiagnosis }) {
      const [state, setState] = React.useState({ loading: true })
      React.useEffect(() => { let alive = true; Promise.resolve().then(status).then(snapshot => { if (alive) setState({ snapshot }) }).catch(() => { if (alive) setState({ error: true }) }); return () => { alive = false } }, [status])
      const snapshot = state.snapshot
      const phaseText = phase => phase === null || phase === undefined ? t('unknown') : t('phase.' + phase)
      return h('section', { 'data-testid': 'collab-ui-status' }, [stylesheet(),
        ...(remoteDiagnosis ? [h('p', { key: 'remote-diagnosis', role: 'alert', 'data-testid': 'remote-mount-diagnosis' }, remoteDiagnosis)] : []),
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
          // visible without failing Web boot.
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
          const diagnosis = mountError ? (failureDetail(mountError) || 'Remote collabUi failed to mount') : (accessNotes.length ? accessNotes.join('\n') : null)
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
          const callBoot = (method, value) => {
            if (mountError) return Promise.reject(mountError)
            try {
              const argument = method === 'bootPlan' ? actionSchema().parse(value) : method === 'bootApply' ? bootPlanIdSchema().parse(value) : undefined
              const target = namespace()
              if (typeof target[method] !== 'function') throw new Error('Remote boot switch is unavailable')
              return unwrap(method === 'bootStatus' ? target[method]() : target[method](argument))
            } catch (error) { return Promise.reject(error) }
          }
          const boot = { status: () => callBoot('bootStatus'), plan: action => callBoot('bootPlan', action), apply: token => callBoot('bootApply', token) }
          const register = (name, spec, Component) => { disposers.push(ctx.slots.inject(name, () => ctx.slots.register({ name, locale: LOCALE, ...spec }, Component))) }
          register('plugins.bundle.config', { key: PACKAGE, inject: () => ({ readStatus: status, settings, boot, remoteMountError: mountError, remoteDiagnosis: diagnosis }) }, BundleConfig)
          register('plugins.detail.badge', { id: 'collab-ui-status', order: 50 }, DetailBadge)
          register('plugins.detail.section', { id: 'collab-ui-status', order: 50 }, DetailSection)
          register('plugins.row.config', { key: CONTROL_SLOT_KEY, inject: () => ({ readStatus: status, settings }) }, EnhancementPage)
          register('plugins.bundle.activation', { key: PACKAGE }, ActivationPrompt)
          return release
        } catch (error) {
          await release()
          throw error
        }
      },
    }
  },
})
