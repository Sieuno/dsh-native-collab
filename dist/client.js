window.__ModuleLoader__.load({
  id: '@sieuno/dsh-native-collab',
  factory(require) {
    const React = require('react')
    const { Button, Modal } = require('@deepseek-ai/dsh-client-ui-primitives')
    const h = React.createElement
    const PACKAGE = '@sieuno/dsh-native-collab'
    const LOCALE = 'collabUi'
    // Replaced from the packaged dictionaries by emit-dist; no network locale lookup.
    const UI_LOCALES = {"en":{"title":"Collaboration component status","summary":"Collaboration preferences, component status and the plugin’s own startup-override master switch.","loading":"Loading current status…","profile":"Profile","hmr":"Hot reload","on":"On","off":"Off","component":"Component","currentState":"Current state","sourceLayer":"Source layer","runtimePhase":"Runtime phase","derivedKind":"Derived","statusPlaceholder":"Root placeholder, always off. Ordinary tools run inside presets, not in this row.","statusRootScope":"This table lists only the seven bundle derived roots. It does not report native roots or preset execution. Five derived roots can be active; the two ordinary-tool rows are root placeholders and stay off because those tools run inside presets. Native configured state together with all seven derived rows disabled is expected. Source layer stays unknown because the Host does not publish it.","statusReadOnly":"Diagnostic only. This table does not write configuration, and it does not treat an unknown source layer as a runtime phase.","current":"Current","desired":"Desired","pendingRestart":"Pending restart","operationError":"Write status","source":"Source layer","note":"Runtime note","unchanged":"No change requested","transactionUnavailable":"Safe Profile transaction is unavailable; no change was made.","unknown-pending":"Unknown — not written","enabled":"Enabled","disabled":"Disabled","unknown":"Unknown","sourceUnknown":"Source layer is not reported by the Host.","unknownNotice":"Some current settings could not be determined.","unknownStructure":"The Host returned an unsupported status shape; unknown rows are not guessed.","statusError":"The Host status service is unavailable.","capabilityImpact":"Derived subagent and subagent_fork default off. Turning one on in the same scope as the official tool replaces that tool name. The control row can save only its six own fields for the next assembly. It does not enable the five or seven rows, write presets, or change native switches. Off mode for model enhancement returns ordinary subagent selection to the native snapshot. On mode uses the compatibility sub-item: native snapshot or the live Host allowlist. These two tool rows are not part of the five-function root enable example.","lifecycleTitle":"Lifecycle warning","lifecycleBadge":"Lifecycle","lifecycleInstall":"Install enables only the management anchor. Native and derived services are not loaded together; review and confirm changes through the plugin’s own master switch.","lifecycleCore.subagent":"Enabling derived row dsh-native-collab-subagent replaces native subagent in that scope. Native and derived are not loaded together. If that capability was off, enabling turns it on.","lifecycleCore.control":"Enabling derived row dsh-native-collab-tool-subagent-control replaces native tool-subagent-control in that scope. Native and derived are not loaded together. If that capability was off, enabling turns it on.","lifecycleCore.listAgents":"Enabling derived row dsh-native-collab-tool-subagent-list-agents replaces native tool-subagent-list-agents in that scope. Native and derived are not loaded together. If that capability was off, enabling turns it on.","lifecycleCore.agentTeam":"Enabling derived row dsh-native-collab-agent-team replaces native agent-team in that scope. Native and derived are not loaded together. If that capability was off, enabling turns it on.","lifecycleCore.teamTools":"Enabling derived row dsh-native-collab-tool-agent-team replaces native tool-agent-team in that scope. Native and derived are not loaded together. If that capability was off, enabling turns it on.","lifecycleRestore":"Closing the master switch enables native rows and clears derived-row overrides and preferences. It is not a restore of the pre-install state.","lifecycleRemove":"Removing this plugin while an enable patch remains can leave native rows disabled and derived rows missing. The standard preset may then fail to activate, and tested new and old sessions can be unavailable. That is configuration unavailability, not log or data corruption.","lifecycleStep.stop":"Close this page’s master switch and confirm a successful write first. Running tasks are not terminated.","lifecycleStep.backup":"Review the exact rows, modules and scopes. Native capabilities that were originally OFF will also be enabled.","lifecycleStep.withdraw":"Check Profile, home and --patch overrides. Resolve reported conflicts before reviewing again; never clear the whole configuration blindly.","lifecycleStep.verify":"Verify that next-start native services are enabled and derived references withdrawn; this is not current runtime status.","lifecycleStep.remove":"Stop this Profile’s Host and Agent, then run dsh plugin --profile <p> remove @sieuno/dsh-native-collab.","lifecycleStep.restart":"Restart as the Host requires. Verify S0 pre-install sessions, S1 plugin-period sessions, and a new session.","lifecycleSidecar":"The budget sidecar is kept by default. Reinstalling the same root reuses its used count. This page does not delete the sidecar, the pnpm store, operation logs, or sessions.","lifecycleNotAuto":"Official Remove still does not close this switch. This component applies user-confirmed configuration changes only; dispose is not an uninstall hook.","readOnlyBadge":"Status only","row.dsh-native-collab-subagent":"Subagent runtime","row.dsh-native-collab-tool-subagent-control":"Subagent control tools","row.dsh-native-collab-tool-subagent-list-agents":"Subagent list-agents tool","row.dsh-native-collab-agent-team":"Agent Team runtime","row.dsh-native-collab-tool-agent-team":"Agent Team tools","row.dsh-native-collab-tool-subagent":"subagent tool","row.dsh-native-collab-tool-subagent-fork":"subagent fork tool","phase.active":"Running","phase.failed":"Failed","phase.pending":"Pending","phase.loading":"Loading","phase.unloading":"Unloading","settingsSummary":"Model, communication and Team request-limit settings; changes require full reassembly.","settingsScope":"These switches save a preference for the next full assembly. They do not install services, enable other rows, or switch the current Agent.","savedState":"Saved preference","observedState":"Observed startup snapshot","pendingState":"Pending versus observed","restartRequired":"A confirmed effect needs a normal restart and full assembly. This control does not hot-apply.","modelEnhancement":"Model enhancement","communicationEnhancement":"Communication enhancement","nativeModelSelectionCompatibility":"Native model-selection compatibility","nativeCompatNote":"Used only when model enhancement is on. On uses the native snapshot. Off uses the live allowlist. Unset follows the tool row.","communicationOffNote":"Off keeps native send_message, permissions, and sessions. It does not remove the Team quota guard.","quotaRemains":"Default: 32 requests per new Team root. Positive safe integers only. After full reassembly, new Team ledgers use this cap. Existing epochs keep their recorded limit and used requests; saving does not refill or resize them.","saveModel":"Save model preference","saveCommunication":"Save communication preference","activationTitle":"Collaboration bundle enabled","activationBody":"The status anchor is active. Underlying collaboration rows stay disabled until you enable them yourself. This dialog does not write settings.","activationLater":"Later","activationDetails":"Open details","modalTitle":"Enhancement preference needs review","modalMissing":"Not confirmed ready","modalBasesReady":"Listed base rows are enabled in the observed inventory.","modalScope":"A native standing combination can throw on apply when the preset scope is not verified. Saving this preference is not apply success.","modalCancel":"Cancel","modalDetails":"Open details","modalSavePreference":"Save preference only","write.saved-pending-restart":"Saved as the next assembly preference. It is not applied to the current Agent. Restart to confirm.","write.settings-missing":"Settings are not available. Nothing was written.","write.settings-unverified":"Settings identity could not be verified. Nothing was written.","write.namespace-unverified":"The control entry namespace was not uniquely verified. Nothing was written.","write.revision-missing":"Settings revision is missing. Nothing was written.","write.not-writable":"Settings are not writable. Nothing was written.","write.settings-unavailable":"The row form is not ready. Nothing was written.","write.rejected":"The write was rejected. Nothing else was changed.","write.conflict":"The settings revision changed. Nothing was written. Re-read before another save.","write.empty":"No allowlisted field was changed.","write.field-rejected":"A field outside the allowlist was refused.","settingsTitle":"Collaboration settings","runningChildGuidance":"Guide running child conversations","completedChildContinuation":"Continue completed child conversations","teamRequestLimit":"Team request limit","quotaUsageUnknown":"Usage belongs to each Team root, not this profile. Inspect that Team’s budget status; no global total is inferred here.","saveQuota":"Save request limit","unset":"Not set","pendingRestartYes":"Restart required","same":"Matches observed snapshot","modalPresetUnknown":"Root rows do not prove preset assembly. Disabled at root does not mean missing inside a preset.","boot":{"title":"Collaboration master switch — startup overrides","scope":"This is the plugin’s own switch, not the official Enable/Disable button. Install alone does not replace native services. Review the concrete targets before confirming.","uninstall":"Before uninstalling, close this switch, verify the native configuration, stop this Profile’s Host/Agent, and only then remove the bundle. Direct official Remove bypasses this component.","standingNote":"Closing and uninstall order are reviewed with the close action. This page does not remove the bundle.","enableIntro":"Enable selects derived services for the next start. It does not turn native features on, and it is not a live switch. Confirm only after reviewing the listed targets.","restoreIntro":"Close explicitly enables all five native roots — subagent, control, list-agents, agent-team, and team tools — including control and list-agents even if they were originally disabled. This is a fixed enable of those native roots, not a historical restoration.","alreadyEnabled":"Already enabled. Repeating enable would only rewrite the same module names, so this button does not open another confirmation and writes nothing.","moduleUnchanged":"Module name unchanged. This is not a byte-for-byte no-op; the row may still be rewritten.","presetPin":"Enable copies complete preset configs (size depends on your Profile) into this Profile’s overrides and pins later preset changes until you review them. Close changes module names back to native but does not remove those snapshots.","configured":"Configured next-start state (not live services)","enable":"Enable — review concrete changes","restore":"Close switch — review native configuration","confirmTitle":"Confirm startup override changes","confirm":"Confirm these changes","fixed":"This applies a fixed target state, not a historical restore. It may turn ON capabilities that were previously OFF. Closing the switch turns native capabilities ON, restores ordinary subagent/fork module names, and clears derived-row overrides including their saved preferences.","restart":"The running Host, Agent and tools are NOT switched. Stop/restart this Profile for complete reassembly. No active conversations are migrated or cancelled.","restartBeforeSettings":"Startup overrides changed. Stop/restart the Profile and reopen this page before editing preferences; the previous settings view is now stale.","saved":"Startup configuration written. Restart required; this is not proof of live switching or uninstall completion.","failed":"Not written","blocked":"Blocked — resolve this condition and review again","scopeColumn":"Scope","targetColumn":"Exact row and module","operationColumn":"Change","state":{"enabled":"Derived services selected","disabled":"Native services selected","mixed":"Mixed / requires review","unknown":"Unknown"},"operation":{"enable":"Enable","disable":"Disable","replace":"Replace module and enable","clear":"Clear derived-row overrides (including preferences)"},"warning":{"next-start-only":"Next-start only; no live activation is promised.","original-disabled-state-not-restored":"Original disabled states are deliberately not restored.","stop-profile-before-remove":"Stop the Profile’s Host and Agent before uninstall.","clears-derived-row-overrides-and-preferences":"Closing clears saved derived-row preferences so no missing-row reference survives removal.","native-features-will-be-enabled":"Native features will be enabled even if they were previously disabled.","fixed-state-not-history-restore":"Fixed-state switching, not a historical restore.","stop-agents-and-restart":"Stop Agents and fully restart the Profile to take effect.","remove-only-after-off-and-verification":"Close the switch and verify native configuration, then stop Host/Agent before removal.","own-profile-preferences-will-be-cleared":"Closing clears derived-row overrides, including preferences, to avoid missing-row references after removal.","remove-external-overlay":"An external overlay still references this bundle. Remove that overlay yourself; this switch does not clear it."}}},"zh":{"title":"协作组件状态","summary":"协作偏好、组件状态及插件自有启动覆盖总开关。","loading":"正在读取当前状态…","profile":"Profile","hmr":"热重载","on":"开启","off":"关闭","component":"组件","currentState":"当前启用状态","sourceLayer":"来源层","runtimePhase":"运行阶段","derivedKind":"派生","statusPlaceholder":"根层占位，始终关闭。普通工具在 preset 内运行，不在此行。","statusRootScope":"本表只列出七项插件派生根，不报告原生根，也不报告 preset 内的实际执行。五项派生根可以处于启用；两项普通工具行是根层占位，按设计始终关闭，因为这些工具在 preset 内运行。原生已配置、同时七项派生行均为禁用，是预期状态。来源层保持未知，因为 Host 不发布该信息。","statusReadOnly":"仅供诊断。本表不写入配置，也不会把未知来源层当成运行阶段。","unknown-pending":"未知 — 尚未写入","current":"当前状态","desired":"目标状态","pendingRestart":"待重启状态","operationError":"写入状态","source":"来源层","note":"运行备注","unchanged":"未请求更改","transactionUnavailable":"安全的 Profile 事务不可用；未进行更改。","enabled":"已启用","disabled":"已禁用","unknown":"未知","sourceUnknown":"Host 未提供来源层信息。","unknownNotice":"部分当前配置无法确定。","unknownStructure":"Host 返回了不支持的状态结构；不会猜测未知行。","statusError":"Host 状态服务不可用。","capabilityImpact":"派生 subagent 与 subagent_fork 默认关闭。在与官方工具相同的 scope 中启用会替换该工具名。控制行只能保存自己的六个字段，供下次组装使用。它不会启用五项或七项行，不写 preset，也不改原生开关。模型增强关闭时，普通 subagent 回到原生快照选择。开启时由兼容子项选择原生快照或当前 Host 允许列表。这两行不属于五项根启用示例。","lifecycleTitle":"生命周期警告","lifecycleBadge":"生命周期","lifecycleInstall":"安装仅启用管理 anchor。派生行不会与原生同时加载；请使用插件自有总开关查看目标并确认切换。","lifecycleCore.subagent":"启用派生行 dsh-native-collab-subagent 会替换该 scope 中的原生 subagent，不会与原生同时加载。若该能力原来关闭，启用会开启它。","lifecycleCore.control":"启用派生行 dsh-native-collab-tool-subagent-control 会替换该 scope 中的原生 tool-subagent-control，不会与原生同时加载。若该能力原来关闭，启用会开启它。","lifecycleCore.listAgents":"启用派生行 dsh-native-collab-tool-subagent-list-agents 会替换该 scope 中的原生 tool-subagent-list-agents，不会与原生同时加载。若该能力原来关闭，启用会开启它。","lifecycleCore.agentTeam":"启用派生行 dsh-native-collab-agent-team 会替换该 scope 中的原生 agent-team，不会与原生同时加载。若该能力原来关闭，启用会开启它。","lifecycleCore.teamTools":"启用派生行 dsh-native-collab-tool-agent-team 会替换该 scope 中的原生 tool-agent-team，不会与原生同时加载。若该能力原来关闭，启用会开启它。","lifecycleRestore":"关闭总开关会强制启用原生行，并清除派生行覆盖和偏好。这不是恢复安装前状态。","lifecycleRemove":"在启用覆盖仍在时直接 remove，可能留下 disabled 的原生行和已缺失的派生行。standard preset 可能因此无法激活，被测的新会话和旧会话也可能不可用。这是配置不可用，不是日志或数据损坏。","lifecycleStep.stop":"先在本页关闭总开关、确认写入成功；不会终止正在运行的任务。","lifecycleStep.backup":"执行前查看具体行、模块和 scope；原先未开启的原生能力也会开启。","lifecycleStep.withdraw":"核对 Profile、home 和 --patch 覆盖。若冲突被阻止，请先处理冲突再重新确认，不要盲清整个配置。","lifecycleStep.verify":"确认下次启动的原生服务已启用、派生引用已撤销；这不是当前运行状态。","lifecycleStep.remove":"停止该 Profile 的 Host 和 Agent 后，再执行 dsh plugin --profile <p> remove @sieuno/dsh-native-collab。","lifecycleStep.restart":"按 Host 要求重启，并核验 S0 安装前会话、S1 插件期会话和新会话。","lifecycleSidecar":"预算 sidecar 默认保留。同一 root 重装会沿用已记录的 used。此页不删除 sidecar、pnpm store、操作日志或会话。","lifecycleNotAuto":"官方 Remove 仍不会自动关闭总开关。此组件仅提供用户确认后的配置切换；dispose 不是卸载钩子。","readOnlyBadge":"仅状态","row.dsh-native-collab-subagent":"Subagent 运行时","row.dsh-native-collab-tool-subagent-control":"Subagent 控制工具","row.dsh-native-collab-tool-subagent-list-agents":"Subagent list-agents 工具","row.dsh-native-collab-agent-team":"Agent Team 运行时","row.dsh-native-collab-tool-agent-team":"Agent Team 工具","row.dsh-native-collab-tool-subagent":"subagent 工具","row.dsh-native-collab-tool-subagent-fork":"subagent fork 工具","phase.active":"运行中","phase.failed":"失败","phase.pending":"待处理","phase.loading":"加载中","phase.unloading":"卸载中","settingsSummary":"模型、消息及 Team 请求上限设置；修改需完整重新组装生效。","settingsScope":"这些开关只保存下次完整组装的偏好。它们不安装服务、不启用其他行，也不切换当前 Agent。","savedState":"已保存偏好","observedState":"已观察到的启动快照","pendingState":"相对当前生效","restartRequired":"确认生效需要正常重启并完整组装。此控件不会热应用。","modelEnhancement":"模型增强","communicationEnhancement":"通信增强","nativeModelSelectionCompatibility":"原生模型选择兼容","nativeCompatNote":"仅在模型增强开启时生效。开为原生快照，关为实时允许列表。未设置则沿用工具行。","communicationOffNote":"关闭后仍保留原生 send_message、权限和会话。不会取消 Team 配额保护。","quotaRemains":"默认每个新 Team 根对话 32 次请求，仅接受正安全整数。完整重新组装后，新 Team 账本使用该上限；已有 epoch 保留已记录的上限和用量，保存不会补满或调整已有账本。","saveModel":"保存模型偏好","saveCommunication":"保存通信偏好","activationTitle":"协作包已启用","activationBody":"状态 anchor 已激活。底层协作行在你自己启用之前保持禁用。此对话框不写设置。","activationLater":"稍后","activationDetails":"查看详情","modalTitle":"增强偏好需要确认","modalMissing":"尚未确认就绪","modalBasesReady":"观察到的清单里，所列基础行均已启用。","modalScope":"作用域未核清时，已知的 native standing 组合可能在 apply 时抛错。保存偏好不是 apply 成功。","modalCancel":"取消","modalDetails":"查看详情","modalSavePreference":"仅保存偏好","write.saved-pending-restart":"已保存为下次组装偏好。当前 Agent 尚未切换。需要重启后确认。","write.settings-missing":"设置不可用。未写入。","write.settings-unverified":"无法核验设置身份。未写入。","write.namespace-unverified":"控制项命名空间未能唯一核验。未写入。","write.revision-missing":"缺少设置修订号。未写入。","write.not-writable":"设置不可写。未写入。","write.settings-unavailable":"行表单未就绪。未写入。","write.rejected":"写入被拒绝。未改动其他项。","write.conflict":"设置修订已变化。未写入。请重新读取后再保存。","write.empty":"没有允许字段被修改。","write.field-rejected":"允许列表之外的字段已被拒绝。","settingsTitle":"协作插件设置","runningChildGuidance":"引导运行中的子对话","completedChildContinuation":"继续已完成的子对话","teamRequestLimit":"Team 请求次数上限","quotaUsageUnknown":"用量属于各个 Team 根对话，而非整个 Profile。请查看该 Team 的预算状态；此处不推测全局总数。","saveQuota":"保存请求上限","unset":"未设置","pendingRestartYes":"需要重启","same":"与观察快照一致","modalPresetUnknown":"根层清单不能证明 preset 内的装配状态；根层禁用不等于 preset 内缺失。","boot":{"title":"协作总开关 · 启动覆盖管理","scope":"这是插件自己的总开关，不是官方启用/禁用按钮。安装本身不替换原生服务；请先查看具体目标再确认。","uninstall":"卸载前请先关闭此开关，核对原生配置，停止该 Profile 的 Host/Agent，再移除插件。直接点击官方 Remove 会绕过此组件。","standingNote":"关闭与卸载顺序在核对关闭操作时显示。本页不会移除插件。","enableIntro":"启用会为下次启动选择派生服务。它不会打开原生功能，也不是即时开关。请核对列出的目标后再确认。","restoreIntro":"关闭会显式启用全部五项原生根：subagent、control、list-agents、agent-team 与 team tools，包括原先禁用的 control 与 list-agents。这是对这五项原生根的固定启用，不是历史状态恢复。","alreadyEnabled":"已经启用。再次启用只会重写相同的模块名，因此此按钮不再打开确认，也不会写入。","moduleUnchanged":"模块名未变。这不是逐字节无操作；该行仍可能被重写。","presetPin":"启用会把完整 preset 配置（大小依实际 Profile 而定）复制进本 Profile 覆盖，并固定后续 preset 改动，直到你手动核对。关闭只把模块名换回原生，不会删除这些快照。","configured":"下次启动的配置状态（不是运行状态）","enable":"启用总开关 · 查看具体变更","restore":"关闭总开关 · 查看原生配置","confirmTitle":"确认启动覆盖变更","confirm":"确认执行上述变更","fixed":"按固定目标状态切换，不恢复历史状态：原先关闭的能力也可能被开启。关闭总开关将启用原生能力、恢复普通 subagent/fork 的模块名，并清除派生行的覆盖（包括其保存的偏好设置）。","restart":"当前运行的 Host、Agent 和工具不会切换。请停止并重启该 Profile，完成完整重新组装。不会迁移或取消运行中的对话。","restartBeforeSettings":"启动覆盖已更改。请停止并重启 Profile，再重新打开本页编辑偏好；原设置视图已过期。","saved":"已写入启动配置，需重启。这不证明运行服务已切换，也不代表已完成卸载。","failed":"未写入","blocked":"已阻止，请先处理此条件再重新核对","scopeColumn":"作用范围","targetColumn":"具体行及模块","operationColumn":"变更","state":{"enabled":"已选择派生服务","disabled":"已选择原生服务","mixed":"混合状态，需核对","unknown":"未知"},"operation":{"enable":"启用","disable":"禁用","replace":"替换模块并启用","clear":"清除派生行覆盖（含偏好）"},"warning":{"next-start-only":"仅修改下次启动配置，不承诺当前实时激活。","original-disabled-state-not-restored":"按约定不恢复原先的禁用状态。","stop-profile-before-remove":"卸载前先停止该 Profile 的 Host 与 Agent。","clears-derived-row-overrides-and-preferences":"关闭时清除派生行的偏好覆盖，避免卸载后残留缺失行引用。","native-features-will-be-enabled":"即使原生功能原先未启用，本次也会启用。","fixed-state-not-history-restore":"固定状态切换，不恢复历史启停状态。","stop-agents-and-restart":"停止 Agent 并完整重启 Profile 后生效。","remove-only-after-off-and-verification":"先关闭并核对原生配置，再停止 Host/Agent 后卸载。","own-profile-preferences-will-be-cleared":"关闭会清除派生行覆盖（含偏好），避免卸载后残留缺失行。","remove-external-overlay":"外部覆盖仍引用本插件。请自行移除该覆盖；此开关不会清除它。"}}}}
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
