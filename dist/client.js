window.__ModuleLoader__.load({
  id: '@sieuno/dsh-native-collab',
  factory(require) {
    const React = require('react')
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives')
    const { Button, Modal } = primitives
    const ReactDOM = require('react-dom')
    const h = React.createElement
    const PACKAGE = '@sieuno/dsh-native-collab'
    const LOCALE = 'collabUi'
    // Replaced from the packaged dictionaries by emit-dist; no network locale lookup.
    const UI_LOCALES = {"en":{"exchange.title":"Team / Subagent identity exchange","exchange.scope":"Only direct local continuable children of the same Lead can change identity. Session ID, history, model, and working directory stay intact. Running targets or owners of unfinished tasks are rejected.","exchange.protocol":"Changes are stored in the canonical Team journal. Do not assume older Collab or native Team readers understand converted sessions; do not downgrade or disable and keep operating them.","exchange.error":"Unable to confirm the exchange. Retry the same operation; an error does not prove a persisted identity was rolled back.","exchange.empty":"No direct local child sessions are currently eligible.","exchange.name":"Team member name:","exchange.join":"Join Team","exchange.leave":"Convert to independent Subagent","exchange.refresh":"Refresh eligible sessions","exchange.retry":"Retry pending identity recovery","exchange.role.teammate":"Team member","exchange.role.subagent":"Independent Subagent","exchange.result.converted":"Identity converted.","exchange.result.unchanged":"This operation already completed; no duplicate change.","exchange.result.rejected":"Conversion rejected.","exchange.result.recovery-required":"Persistence needs verification. Do not send messages yet; retry this operation or recover the session first.","exchange.notificationFailed":"Identity persisted, but not all notifications were delivered. Check the parent and Lead.","exchange.reason.busy":"The session has active work or pending input. Retry when idle.","exchange.reason.transition-in-progress":"This session is converting. Retry after it completes.","exchange.reason.unfinished-tasks":"The member owns unfinished tasks. Release, hand off, or complete them first.","exchange.reason.invalid-request":"Invalid request. Check the member name and refresh.","exchange.reason.unavailable":"The collaboration runtime or session is currently unavailable.","exchange.reason.not-found":"Target is outside the eligible scope. Refresh the list.","exchange.reason.inconsistent-state":"The session state or journal needs recovery; conversion is unsafe.","exchange.reason.rejected":"The current identity or parent relationship does not allow this exchange.","title":"Collaboration component diagnostics","summary":"Child-agent communication, Team model selection, and consecutive automatic wake-up limit.","loading":"Loading current status…","profile":"Profile","hmr":"Development reload","on":"On","off":"Off","component":"Component","currentState":"Current state","sourceLayer":"Source layer","runtimePhase":"Runtime phase","derivedKind":"Plugin component","statusPlaceholder":"This component does not run standalone; tools are loaded on demand with conversations.","statusRootScope":"This read-only table shows root components, not feature toggles. Control, list, spawn, and fork tools load with AgentPresets; off at root is normal. Do not enable them just to make every row green.","statusReadOnly":"Diagnostics do not change settings or prove tool availability in every chat.","current":"Current","desired":"Desired","pendingRestart":"Pending restart","operationError":"Write status","source":"Source layer","note":"Runtime note","unchanged":"No change requested","transactionUnavailable":"Settings cannot be saved safely right now. Refresh settings and retry.","unknown-pending":"Unknown — not written","enabled":"Enabled","disabled":"Disabled","unknown":"Unknown","sourceUnknown":"This root inventory cannot identify the entry source.","unknownNotice":"Some current settings could not be determined.","unknownStructure":"The component inventory is incomplete or its source is unrecognized. Current state is unconfirmed.","statusError":"Unable to confirm component status. Please refresh. If this persists, keep the error code and diagnostics for troubleshooting.","capabilityImpact":"Enable child-agent and Team enhancements separately in plugin settings. Turning enhancements off does not remove permissions or conversations.","lifecycleTitle":"Uninstall and recovery","lifecycleBadge":"Uninstall notes","lifecycleInstall":"After installation the management entry loads background services automatically, and enhancement settings save as you change them. Changes that need a restart apply after you restart the same working profile normally.","lifecycleCore.subagent":"This service starts with the management entry; it is not a feature toggle. Change enhancements in plugin settings and restart after saving.","lifecycleCore.control":"This is an AgentPreset tool, not a root background service. Verify it in an actual chat.","lifecycleCore.listAgents":"This is an AgentPreset tool, not a root background service. Verify it in an actual chat.","lifecycleCore.agentTeam":"This service starts with the management entry; it is not a feature toggle. Change enhancements in plugin settings and restart after saving.","lifecycleCore.teamTools":"This service starts with the management entry; it is not a feature toggle. Change enhancements in plugin settings and restart after saving.","lifecycleRemove":"Wait for running tasks to finish, then disable or uninstall the plugin and restart the current working profile. If it no longer starts after uninstalling or after a failed uninstall, follow the project FAQ and the plugin notes to recover manually: inspect the external startup override files in the Profile directory, then remove or correct them as described and start again.","lifecycleSidecar":"Uninstalling keeps conversations and logs. The consecutive automatic wake-up counter lives only in process memory and resets on restart.","readOnlyBadge":"Status only","row.dsh-native-collab-subagent":"Child Agent runtime","row.dsh-native-collab-tool-subagent-control":"Child Agent messaging","row.dsh-native-collab-tool-subagent-list-agents":"Child Agent listing","row.dsh-native-collab-agent-team":"Team runtime","row.dsh-native-collab-tool-agent-team":"Team tools","row.dsh-native-collab-tool-subagent":"Start an independent child Agent","row.dsh-native-collab-tool-subagent-fork":"Start a child Agent with conversation context","phase.active":"Running","phase.failed":"Failed","phase.pending":"Pending","phase.loading":"Loading","phase.unloading":"Unloading","settingsSummary":"Child-agent communication, Team enhancements, and the consecutive automatic wake-up limit","settingsScope":"All settings save automatically, with errors displayed beside the affected item. Model source changes apply immediately to subsequent queries and agent creation; restart-required settings take effect after restarting the Profile without interrupting active chats.","savedState":"Saved","observedState":"Startup snapshot","pendingState":"Compared with startup","restartRequired":"Settings saved. Options requiring a restart take effect after restarting the Profile, without interrupting ongoing chats.","modelEnhancement":"Enable Team enhancements","communicationEnhancement":"Enable child-agent communication enhancements","nativeModelSelectionCompatibility":"Model list source","modelSource":"Model list source","modelSourceConversation":"Child-model list captured when the conversation started (native setting)","modelSourceSettings":"Child-model list in current DSH settings","modelSourceAll":"All models currently available in DSH","autoSaveDescription":"Changes save automatically; errors appear beside the setting. The model source applies to subsequent queries and creation. Settings that require a restart take effect after a normal restart without interrupting the current chat.","autoSaving":"Saving…","autoSaved":"Saved automatically","autoSaveFailed":"Automatic save failed","nativeCompatNote":"This changes how candidate models are listed, not model permissions. It also affects ordinary child Agents.","communicationOffNote":"Turning enhancements off does not disable native messaging or stop running tasks.","quotaRemains":"Default limit is 32 consecutive automatic wake rounds, shared by all Agents associated with the session. Only uninterrupted automatic cross-session wake-ups and messages without user input are counted. Any human input in a related session resets the count. Completion and stop reports to the direct parent or Lead are exempt. The counter is in memory and resets on process restart.","saveModel":"Save Team settings","saveCommunication":"Save communication settings","modalCancel":"Cancel","write.saved-pending-restart":"This setting was saved. Changes requiring a restart apply after a normal Profile restart without interrupting the current chat.","write.settings-missing":"The settings target could not be verified; no save was sent. Keep your draft and reload settings. If it persists, provide versions and the safe error code.","write.settings-unverified":"The settings target could not be verified; no save was sent. Keep your draft and reload settings. If it persists, provide versions and the safe error code.","write.namespace-unverified":"The settings target could not be verified; no save was sent. Keep your draft and reload settings. If it persists, provide versions and the safe error code.","write.revision-missing":"The settings target could not be verified; no save was sent. Keep your draft and reload settings. If it persists, provide versions and the safe error code.","write.not-writable":"Settings are read-only or write access is unverified. No save was sent. Check the selected Profile and its edit permissions.","write.settings-unavailable":"Settings have not finished verification and cannot be saved yet. Reload settings if this persists.","write.rejected":"The save result is unconfirmed; changes may or may not have been written. Keep your draft and reload settings to check saved values before proceeding.","write.write-unconfirmed":"The save was sent, but the read-back value differs from this change. Success is unconfirmed. Keep the change and reload settings to check.","write.conflict":"Settings were updated elsewhere; this save was not accepted. Keep your draft, reload the latest settings, and review before saving again.","write.empty":"No changes to save in this group.","write.field-rejected":"Invalid input; no save was sent. Toggles must be on or off, and the consecutive automatic wake-up limit must be a valid positive integer.","settingsTitle":"Collaboration enhancements","runningChildGuidance":"Accept additional instructions while a child Agent works","completedChildContinuation":"Allow continuing completed child conversations","teamRequestLimit":"Consecutive automatic wake-up limit","quotaUsageUnknown":"There is no live counter on this page. The in-memory count is shared by all Agents associated with the session and resets on human input in any related session or when the process restarts.","progressTitle":"Progress and results","progressScope":"No switch is needed for progress and results. Open the relevant chat or Team panel; this page has no live task view.","progressEntry":"How to view progress and results","progressTeam":"Team tasks: return to the originating conversation and open Team at the top. Inspect members, messages, and shared tasks; select a member to open its conversation.","progressChild":"Independent child Agents: open the child-agent task card in the originating conversation to inspect its status and returned result.","progressAction":"Add instructions in the originating conversation. To stop work, use that conversation's Stop action. Changing these settings does not stop or restart tasks.","saveQuota":"Save wake-up limit","unset":"Not set","pendingRestartYes":"Some settings are waiting for a restart.","same":"Matches startup snapshot","modalPresetUnknown":"Verify preset tools in an actual chat. This table does not verify external overlays or all presets.","communicationTitle":"Child-agent communication","teamTitle":"Team enhancements","teamDescription":"More flexible model selection for Team members. The same selection setting also affects ordinary child Agents. It does not grant access to additional models.","selectionLive":"Use currently available models","selectionSnapshot":"Use the model list from the conversation start","quotaTitle":"Consecutive automatic wake-up limit","quotaValidation":"Enter a positive safe integer. Zero, negatives, decimals, and out-of-range numbers are not supported.","settingsDiagnostics":"Advanced diagnostics: saved and current settings","technicalDetails":"Technical details","refreshSettings":"Refresh settings","write.refreshed":"Settings reloaded. Unsaved drafts remain on this page.","settingsLoading":"Loading settings. Editing will be available after verification.","defaultValue":"Default: {value}","settingsUnavailable":"Settings cannot be read or edited yet. See the specific reason.","write.refresh-failed":"Settings could not be reloaded and verified. Drafts remain on this page and saving is locked. Keep a copy of your draft; reloading the entire page may discard unsaved edits.","write.status-refresh-failed":"Settings reloaded and drafts were kept, but runtime status is unconfirmed; this does not prove a service failure. You can edit settings and refresh runtime status later.","runtime":{"title":"Current runtime","native":"Native services selected","managed":"Enhanced background services ready","legacy-mixed":"Conflicting configuration; review required","unknown":"Runtime status unconfirmed","failed":"Enhanced startup or cleanup failed","loading":"Starting enhanced background services","details":"Internal service status","nativeNote":"Enhanced background services are not attached. Check that the management entry is enabled, save the desired enhancements, and restart this Profile; do not enable internal components individually.","phase":{"active":"Running","failed":"Startup or cleanup error","pending":"Pending","loading":"Loading","unloading":"Unloading","not-requested":"Not requested (not a failure)","ready":"Ready","disposing":"Stopping","disposed":"Stopped"},"role":{"subagent":"Child Agent service","subagent-control":"AgentPreset: child Agent control","subagent-list":"AgentPreset: child Agent list","agent-team":"Team service","team-tools":"Team tools"},"mixed":"Conflicting configuration; review required","readyNote":"This confirms background services only, not tool availability in all AgentPresets. Verify tools in an actual chat.","failure":{"ownership-unverified":"Runtime assembly conflicts with another component or its inventory is unavailable. Enhanced services were not started. Keep the safe code and review overrides; see the project FAQ for legacy manual configuration rather than toggling internal components.","plugin-start-failed":"An enhanced service could not start. Keep the version, affected role, and safe error code. If disabling the plugin, finish tasks first and restart this Profile afterwards.","plugin-cleanup-failed":"Service cleanup is unconfirmed. Do not switch or uninstall yet. Verify that this Profile’s host processes have fully stopped and retain redacted diagnostics.","unknown":"This service state is unconfirmed. Keep its role and safe error code for diagnosis; do not assume it stopped safely."}},"phase":{"not-requested":"Not started","ready":"Ready","disposing":"Stopping","disposed":"Stopped"},"refreshRuntime":"Refresh runtime status","write":{"saved-pending-restart":"Setting saved. Options requiring a restart will take effect after restarting the Profile, without interrupting ongoing chats.","settings-missing":"The settings target could not be verified; no save was sent. Keep your draft and reload settings.","settings-unverified":"The settings target could not be verified; no save was sent. Keep your draft and reload settings.","namespace-unverified":"The settings namespace could not be verified; no save was sent. Keep your draft and reload settings.","revision-missing":"The revision could not be verified; no save was sent. Keep your draft and reload settings.","not-writable":"Settings are read-only or permission is denied. Check the selected Profile and edit permissions.","settings-unavailable":"Settings are not ready yet. Please refresh and retry.","rejected":"Save result could not be confirmed. Please keep your draft, refresh settings, and review before retrying.","write-unconfirmed":"Save was sent, but verification value differs. Please refresh settings to check.","conflict":"Settings were updated elsewhere; this save was not accepted. Please refresh to load latest settings before saving.","empty":"No changes to save in this group.","field-rejected":"Invalid input; no save was sent. Toggles must be on/off, and wake-up limit must be a positive integer.","refreshed":"Settings refreshed; unsaved drafts remain on this page.","refresh-failed":"Failed to refresh settings; drafts are kept. Please back up drafts before retrying.","status-refresh-failed":"Settings refreshed and drafts kept; runtime status is unconfirmed but does not indicate failure. You can continue editing."},"diagnosis.remote-unavailable":"The plugin page cannot reach the collaboration service right now. Restart the app and reopen this page; if it still fails, follow the plugin notes and the project FAQ to recover.","diagnosis.unknown":"The action did not complete. Expand the technical details for the diagnostic code, then follow the plugin notes and try again."},"zh":{"exchange.title":"Team / Subagent 身份转换","exchange.scope":"仅转换同一 Lead 的直接本地可继续会话；保留会话 ID、历史、模型和工作目录。运行中或仍持有未完成任务时拒绝转换。","exchange.protocol":"身份变更写入正式 Team 日志。转换后的会话不可假定能由旧版 Collab 或原生 Team 正确读取；请勿直接降级或停用后继续操作。","exchange.error":"无法确认转换状态。请重试同一操作；请勿以失败提示推断已写入的身份被回滚。","exchange.empty":"当前没有可转换的直接本地子会话。","exchange.name":"Team 成员名：","exchange.join":"加入 Team","exchange.leave":"转为独立 Subagent","exchange.refresh":"刷新可转换会话","exchange.retry":"重试待恢复的身份转换","exchange.role.teammate":"Team 成员","exchange.role.subagent":"独立 Subagent","exchange.result.converted":"身份已转换。","exchange.result.unchanged":"此操作已完成，无重复变更。","exchange.result.rejected":"转换被拒绝。","exchange.result.recovery-required":"持久化结果尚待核实；请勿继续发送消息，先重试同一操作或恢复会话。","exchange.notificationFailed":"身份已写入，但通知未全部送达；请核查父代理和 Lead。","exchange.reason.busy":"会话有活动工作或待处理输入，请空闲后重试。","exchange.reason.transition-in-progress":"该会话正在转换，请完成后重试。","exchange.reason.unfinished-tasks":"该成员仍持有未完成任务，请先释放、移交或完成。","exchange.reason.invalid-request":"请求无效，请检查成员名并刷新。","exchange.reason.unavailable":"协作运行时或会话当前不可用。","exchange.reason.not-found":"目标会话不在可转换范围内，请刷新。","exchange.reason.inconsistent-state":"会话状态或日志需要恢复；不能安全转换。","exchange.reason.rejected":"当前身份或所属关系不允许此转换。","title":"协作组件状态诊断","summary":"子 Agent 沟通、Team 模型选择及连续自动唤醒轮数上限。","loading":"正在读取当前状态…","profile":"工作配置","hmr":"开发时自动重载","on":"开启","off":"关闭","component":"组件","currentState":"当前启用状态","sourceLayer":"来源层","runtimePhase":"运行阶段","derivedKind":"插件组件","statusPlaceholder":"该组件不单独运行，实际工具将在对话建立时按需加载。","statusRootScope":"此表只读显示根级组件，不是功能开关。控制、列表、启动和继承会话四项工具随会话预设加载，在根级关闭属于正常现象，无需为追求全绿而开启它们。","statusReadOnly":"诊断不会修改设置，也不能证明所有会话工具可用。","unknown-pending":"未知 — 尚未写入","current":"当前状态","desired":"目标状态","pendingRestart":"待重启状态","operationError":"写入状态","source":"来源层","note":"运行备注","unchanged":"未请求更改","transactionUnavailable":"暂时无法安全保存，请刷新设置后重试。","enabled":"已启用","disabled":"已禁用","unknown":"未知","sourceUnknown":"根级清单无法确认此项来源。","unknownNotice":"部分当前配置无法确定。","unknownStructure":"组件清单不完整或来源无法识别，当前状态未确认。","statusError":"暂无法获取组件状态，请刷新重试。若持续失败，请查看错误码与诊断详情。","capabilityImpact":"子 Agent 和 Team 的增强功能可在设置中独立开启。关闭增强不会取消原有权限限制，也不会删除会话记录。","lifecycleTitle":"卸载与恢复说明","lifecycleBadge":"卸载须知","lifecycleInstall":"安装后由管理入口自动加载后台服务，增强设置修改后自动保存；需要重启的更改在正常重启同一工作配置后生效。","lifecycleCore.subagent":"此后台随管理入口启动，不是独立功能开关。启停增强请使用插件设置，并在保存后正常重启。","lifecycleCore.control":"此项属于会话预设工具，不是根级后台服务。请在实际对话中核对。","lifecycleCore.listAgents":"此项属于会话预设工具，不是根级后台服务。请在实际对话中核对。","lifecycleCore.agentTeam":"此后台随管理入口启动，不是独立功能开关。启停增强请使用插件设置，并在保存后正常重启。","lifecycleCore.teamTools":"此后台随管理入口启动，不是独立功能开关。启停增强请使用插件设置，并在保存后正常重启。","lifecycleRemove":"先等待运行中的任务结束，再停用或卸载插件并重启当前工作配置。若卸载或错误卸载后无法启动，请按项目 FAQ 与插件说明手工恢复：检查 Profile 目录中的外部启动覆盖文件，按说明移除或修正后重新启动。","lifecycleSidecar":"卸载不会删除对话或日志。连续自动唤醒计数仅存储在进程内存中，重启后自动清零。","readOnlyBadge":"仅状态","row.dsh-native-collab-subagent":"子 Agent 运行服务","row.dsh-native-collab-tool-subagent-control":"子 Agent 消息控制","row.dsh-native-collab-tool-subagent-list-agents":"子 Agent 列表工具","row.dsh-native-collab-agent-team":"Team 运行服务","row.dsh-native-collab-tool-agent-team":"Team 协作工具","row.dsh-native-collab-tool-subagent":"启动独立子 Agent","row.dsh-native-collab-tool-subagent-fork":"继承会话启动子 Agent","phase.active":"运行中","phase.failed":"失败","phase.pending":"待处理","phase.loading":"加载中","phase.unloading":"卸载中","settingsSummary":"子 Agent 沟通、Team 增强与连续自动唤醒轮数上限","settingsScope":"所有设置项修改后均会自动保存，若保存失败会在该项旁提示原因。模型来源立即生效于后续查询与创建；需重启生效的设置将在重启当前工作配置后应用，不会中断已有对话。","savedState":"已保存","observedState":"本次启动时采用","pendingState":"与启动值比较","restartRequired":"设置已保存。需要重启的选项将在当前任务结束后重启同一工作配置时生效，不会中断已有对话。","modelEnhancement":"启用 Team 增强","communicationEnhancement":"启用子 Agent 沟通增强功能","nativeModelSelectionCompatibility":"可选模型来源","modelSource":"可选模型来源","modelSourceConversation":"对话开始时设置的子模型可用列表（原生设置）","modelSourceSettings":"DSH当前设置的子模型可用列表","modelSourceAll":"当前DSH所有可用模型","autoSaveDescription":"修改后自动保存，失败原因会显示在对应设置旁。模型来源用于之后的查询与创建；需重启的功能设置在正常重启后生效，不会因此中断当前对话。","autoSaving":"正在保存…","autoSaved":"已自动保存","autoSaveFailed":"自动保存失败","nativeCompatNote":"仅改变候选模型列表的读取方式，不增加模型访问权限；此策略也影响普通子 Agent。","communicationOffNote":"关闭增强不影响原生消息传递，也不会中断运行中的任务。","quotaRemains":"默认上限为 32 轮连续自动唤醒，由会话所有 Agent 共享。仅对无人工干预的连续跨会话自动唤醒与消息计数；任一关联会话收到用户输入即自动清零。向直属父级或 Team Lead 汇报任务完成或停止结果不计入。计数存储于内存中，进程重启后自动清零。","saveModel":"保存 Team 设置","saveCommunication":"保存沟通设置","modalCancel":"取消","write.saved-pending-restart":"此项设置已保存。需重启的更改会在正常重启同一工作配置后应用，当前对话不会因此中断。","write.settings-missing":"无法核实设置保存目标，本次未发起保存。请保留草稿并重新读取设置；若持续失败，请提供版本与安全错误码。","write.settings-unverified":"无法核实设置保存目标，本次未发起保存。请保留草稿并重新读取设置；若持续失败，请提供版本与安全错误码。","write.namespace-unverified":"无法核实设置保存目标，本次未发起保存。请保留草稿并重新读取设置；若持续失败，请提供版本与安全错误码。","write.revision-missing":"无法核实设置保存目标，本次未发起保存。请保留草稿并重新读取设置；若持续失败，请提供版本与安全错误码。","write.not-writable":"当前设置只读或尚未确认可写，本次未发起保存。请核对所选工作配置和编辑权限。","write.settings-unavailable":"设置尚未完成核验，暂不能保存。若持续未就绪，请重新读取设置。","write.rejected":"保存结果未能确认，不能确定是否已写入。请先保留草稿并重新读取设置，核对已保存值后再操作。","write.write-unconfirmed":"保存已发出，但重新读取的值与此项修改不一致，暂不能确认保存成功。请保留修改并重新读取设置后核对。","write.conflict":"设置已被其他操作更新，本次未保存。请先保留草稿，再重新读取最新设置并核对后保存。","write.empty":"本组没有待保存的修改。","write.field-rejected":"输入值无效，本次未发起保存。开关须为开启或关闭，连续自动唤醒轮数上限须为有效正整数。","settingsTitle":"协作增强","runningChildGuidance":"子 Agent 工作中可接收补充要求","completedChildContinuation":"允许继续已完成的子对话","teamRequestLimit":"连续自动唤醒轮数上限","quotaUsageUnknown":"本页不显示实时计数。计数存储于进程内存中由会话所有 Agent 共享；任一相关会话收到人类输入或进程重启后即清零。","progressTitle":"进度与结果","progressScope":"进度与结果无需在此开启，请回到对应对话或 Team 面板查看。本页不展示实时任务状态。","progressEntry":"查看进度与结果的方法","progressTeam":"Team 任务：回到发起任务的对话，在对话顶部打开 Team 面板，查看成员状态、消息和共享任务；点击成员可打开对应对话。","progressChild":"独立子 Agent：打开原对话中的子 Agent 任务卡片，查看执行状态和返回结果。","progressAction":"需要补充要求时回到发起任务的对话；如需停止任务，使用对应对话的停止操作。修改此页设置不会停止或重启任务。","saveQuota":"保存唤醒轮数上限","unset":"未设置","pendingRestartYes":"有设置等待重启生效。","same":"与本次启动值一致","modalPresetUnknown":"会话预设工具请在实际对话中核对；本表不验证外部覆盖或全部预设。","communicationTitle":"子 Agent 沟通","teamTitle":"Team 增强","teamDescription":"让 Team 成员更灵活地选择模型；同一模型选择设置也影响普通子 Agent。不会获得额外的模型访问权限。","selectionLive":"使用当前可用模型","selectionSnapshot":"沿用对话开始时的模型列表","quotaTitle":"连续自动唤醒轮数上限","quotaValidation":"请输入大于0且在安全范围内的整数，不支持小数、负数或超大数值。","settingsDiagnostics":"高级诊断：保存状态与当前状态","technicalDetails":"技术详情","refreshSettings":"刷新设置","write.refreshed":"设置已重新读取，未保存的草稿仍保留在当前页面。","settingsLoading":"正在读取设置，完成核验后即可编辑。","defaultValue":"默认：{value}","settingsUnavailable":"暂不能读取或修改设置，请查看具体原因。","write.refresh-failed":"未能重新读取并核验设置，已保留当前页面草稿并暂时锁定保存。请先备份草稿；刷新整个网页可能丢失未保存的修改。","write.status-refresh-failed":"设置已重新读取，草稿仍保留；后台运行状态暂无法确认，不代表服务已发生故障。可继续编辑设置，稍后刷新运行状态。","runtime":{"title":"当前运行状态","native":"当前采用原生服务","managed":"增强后台已就绪","legacy-mixed":"检测到冲突配置，需核对","unknown":"运行状态暂无法确认","failed":"增强后台启动或停止异常","loading":"正在启动增强后台","details":"内部服务状态","nativeNote":"当前增强后台尚未接入。请确认管理入口已开启，保存所需增强后重启同一工作配置；不要逐个开启内部组件。","phase":{"active":"运行中","failed":"启动或停止异常","pending":"待处理","loading":"加载中","unloading":"卸载中","not-requested":"未请求启动（非故障）","ready":"已就绪","disposing":"停止中","disposed":"已停止"},"role":{"subagent":"子 Agent 服务","subagent-control":"会话预设：子 Agent 控制","subagent-list":"会话预设：子 Agent 列表","agent-team":"Team 服务","team-tools":"Team 协作工具"},"mixed":"检测到冲突配置，需核对","readyNote":"这里只确认后台服务，不能证明所有会话预设工具可用；请在实际对话中核对。","failure":{"ownership-unverified":"后台装配存在冲突或组件清单不可用，增强后台未启动。请保留错误码并核对覆盖配置；旧版手工配置的处理见项目 FAQ，不要逐个切换内部组件。","plugin-start-failed":"增强后台未能启动，原因需进一步核对。请保留版本、受影响服务名称和安全错误码；如需停用插件，先结束任务并在停用后重启同一工作配置。","plugin-cleanup-failed":"服务停止结果未确认。请勿继续切换或卸载，先核实同一工作配置的宿主进程已完全停止，并保留脱敏诊断。","unknown":"此服务状态未能确认，请保留服务名称与安全错误码供排查，不要假定已安全停止。"}},"phase":{"not-requested":"未启动","ready":"已就绪","disposing":"停止中","disposed":"已停止"},"refreshRuntime":"刷新运行状态","write":{"saved-pending-restart":"设置已保存。需重启的选项将在重启当前工作配置后生效，不会中断正在进行的对话。","settings-missing":"无法验证设置保存目标，本次未提交。请刷新设置后重试；若持续失败，请查看安全错误码。","settings-unverified":"无法验证设置保存目标，本次未提交。请刷新设置后重试；若持续失败，请查看安全错误码。","namespace-unverified":"无法验证命名空间，本次未提交。请刷新设置后重试；若持续失败，请查看安全错误码。","revision-missing":"版本信息校验未通过，本次未提交。请刷新设置后重试；若持续失败，请查看安全错误码。","not-writable":"当前设置只读或暂无写入权限，本次未保存。请核对工作配置与文件权限。","settings-unavailable":"设置尚未就绪，暂无法保存。请稍后刷新重试。","rejected":"保存结果未确认。请先保留当前草稿并刷新设置，核对已保存内容后再试。","write-unconfirmed":"设置已提交，但读取校验不一致，无法确认是否成功。请刷新设置进行核对。","conflict":"设置已被其他操作修改，本次未保存。请刷新获取最新设置后再行修改。","empty":"当前没有任何更改需要保存。","field-rejected":"输入值无效：开关须为开启或关闭，连续自动唤醒上限须为有效正整数。","refreshed":"设置已重新读取，未保存的草稿仍保留在当前页面。","refresh-failed":"未能重新读取设置，已保留当前草稿并锁定保存。请先备份草稿后重试。","status-refresh-failed":"设置已重新读取并保留草稿；运行状态暂无法确认，可继续编辑设置并稍后刷新运行状态。"},"diagnosis.remote-unavailable":"插件界面暂时无法连接协作服务。请重启应用后重新打开本页；若仍失败，请参考插件说明与项目 FAQ 中的恢复步骤。","diagnosis.unknown":"操作未能完成。请展开技术详情查看诊断码，并按插件说明处理后重试。"}}
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
    const ASSEMBLY_LAYOUT = [{"role":"subagent","legacyId":"dsh-native-collab-subagent","moduleName":"@sieuno/dsh-native-collab/subagent","nativeId":"subagent","nativeModuleName":"@deepseek-ai/dsh-subagent","placement":"runtime"},{"role":"subagent-control","legacyId":"dsh-native-collab-tool-subagent-control","moduleName":"@sieuno/dsh-native-collab/tool-subagent-control","nativeId":"tool-subagent-control","nativeModuleName":"@deepseek-ai/dsh-tool-subagent-control","placement":"preset"},{"role":"subagent-list","legacyId":"dsh-native-collab-tool-subagent-list-agents","moduleName":"@sieuno/dsh-native-collab/tool-subagent-control/list-agents","nativeId":"tool-subagent-list-agents","nativeModuleName":"@deepseek-ai/dsh-tool-subagent-control/list-agents","placement":"preset"},{"role":"agent-team","legacyId":"dsh-native-collab-agent-team","moduleName":"@sieuno/dsh-native-collab/agent-team","nativeId":"agent-team","nativeModuleName":"@deepseek-ai/dsh-experimental-agent-team","placement":"runtime"},{"role":"team-tools","legacyId":"dsh-native-collab-tool-agent-team","moduleName":"@sieuno/dsh-native-collab/tool-agent-team","nativeId":"tool-agent-team","nativeModuleName":"@deepseek-ai/dsh-experimental-tool-agent-team","placement":"runtime"},{"role":"spawn","legacyId":"dsh-native-collab-tool-subagent","moduleName":"@sieuno/dsh-native-collab/tool-subagent","nativeId":"tool-subagent","nativeModuleName":"@deepseek-ai/dsh-tool-subagent","placement":"preset"},{"role":"fork","legacyId":"dsh-native-collab-tool-subagent-fork","moduleName":"@sieuno/dsh-native-collab/tool-subagent/fork","nativeId":"tool-subagent-fork","nativeModuleName":"@deepseek-ai/dsh-tool-subagent","placement":"preset"}]
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
    const EXCHANGE_REASONS = ['busy', 'transition-in-progress', 'unfinished-tasks', 'invalid-request', 'unavailable', 'not-found', 'inconsistent-state', 'rejected']
    function membershipObject(value, required, optional = []) {
      if (!isPlainObject(value)) strictFailure('membership value must be an object')
      exactKeys(value, required, optional)
      return value
    }
    function membershipString(value, limit = 128) {
      if (typeof value !== 'string' || value.length < 1 || value.length > limit || value.trim() !== value) strictFailure('invalid membership identity')
      return value
    }
    function membershipReason(value) {
      if (value !== null && !EXCHANGE_REASONS.includes(value)) strictFailure('invalid membership reason')
      return value
    }
    function parseExchangeRequest(value) {
      membershipObject(value, ['rootId', 'targetId', 'operationId', 'to'], ['name', 'description'])
      for (const key of ['rootId', 'targetId', 'operationId']) membershipString(value[key])
      if (!['teammate', 'subagent'].includes(value.to)) strictFailure('invalid membership direction')
      for (const [key, limit] of [['name', 128], ['description', 1024]]) {
        if (Object.hasOwn(value, key) && (typeof value[key] !== 'string' || value[key].length > limit)) strictFailure('invalid membership text')
      }
      return { ...value }
    }
    function parseExchangeCandidates(value) {
      if (!Array.isArray(value)) strictFailure('membership candidates must be an array')
      return value.map(row => {
        membershipObject(row, ['rootId', 'targetId', 'role', 'name', 'label', 'status', 'reason', 'recovery'])
        membershipString(row.rootId); membershipString(row.targetId)
        if (!['teammate', 'subagent'].includes(row.role) || !['running', 'inactive', 'unknown'].includes(row.status)) strictFailure('invalid membership candidate state')
        if (typeof row.name !== 'string' || typeof row.label !== 'string') strictFailure('invalid membership label')
        membershipReason(row.reason)
        if (row.recovery !== null) {
          parseExchangeRequest(row.recovery)
          if (row.recovery.rootId !== row.rootId || row.recovery.targetId !== row.targetId) strictFailure('recovery target mismatch')
        }
        return { ...row }
      })
    }
    function parseExchangeResult(value) {
      membershipObject(value, ['rootId', 'targetId', 'operationId', 'to', 'status', 'reason', 'notification'])
      parseExchangeRequest({ rootId: value.rootId, targetId: value.targetId, operationId: value.operationId, to: value.to })
      if (!['converted', 'unchanged', 'rejected', 'recovery-required'].includes(value.status)) strictFailure('invalid membership result state')
      if (!['delivered', 'failed', 'unchanged'].includes(value.notification)) strictFailure('invalid membership notification state')
      membershipReason(value.reason)
      return { ...value }
    }
    const membershipSchema = parse => () => ({ parse })
    const REMOTE = {
      package: PACKAGE,
      services: [{ namespace: 'collabUi' }],
      descriptors: [
        {
          id: `${PACKAGE}#collabUi/status`, service: 'collabUi', namespace: 'collabUi', method: 'status',
          invocation: { kind: 'direct' }, parameters: [], result: strictCodec(STATUS_TYPE, statusSchema),
        },
        {
          id: PACKAGE + '#collabUi/membershipCandidates', service: 'collabUi', namespace: 'collabUi', method: 'membershipCandidates',
          invocation: { kind: 'direct' }, parameters: [], result: strictCodec(PACKAGE + '/membership-ui#MembershipExchangeCandidate[]', membershipSchema(parseExchangeCandidates)),
        },
        {
          id: PACKAGE + '#collabUi/exchangeMembership', service: 'collabUi', namespace: 'collabUi', method: 'exchangeMembership',
          invocation: { kind: 'direct' }, parameters: [{ name: 'request', wire: 'request', source: 'json', codec: strictCodec(PACKAGE + '/membership-ui#MembershipExchangeRequest', membershipSchema(parseExchangeRequest)) }],
          result: strictCodec(PACKAGE + '/membership-ui#MembershipExchangeResult', membershipSchema(parseExchangeResult)),
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
    function EnhancementPage({ t, view, form, readStatus, settings, subject }) {
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
    function useMembershipConversion(api) {
      const [state, setState] = React.useState({ pending: false, result: null, error: false, retry: null })
      const busy = React.useRef(false), alive = React.useRef(true)
      React.useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
      const convert = async (row, name, retryRequest = null) => {
        if (busy.current || row.status !== 'inactive' || (row.reason !== null && row.recovery === null)) return null
        const request = retryRequest ?? row.recovery ?? {
          rootId: row.rootId, targetId: row.targetId, to: row.role === 'teammate' ? 'subagent' : 'teammate',
          operationId: 'membership-' + (globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)),
          ...(row.role === 'subagent' ? { name: name.trim() } : {}),
        }
        busy.current = true
        setState(previous => ({ ...previous, pending: true, result: null, error: false }))
        try {
          const result = await api.convert(request)
          if (alive.current) setState({ pending: false, result, error: false, retry: result.status === 'recovery-required' ? request : null })
          return result
        } catch {
          if (alive.current) setState({ pending: false, result: null, error: true, retry: request })
          return null
        } finally { busy.current = false }
      }
      return { state, busy, convert }
    }
    function membershipFeedback(t, state) {
      if (state.error) return t('exchange.error')
      if (!state.result) return ''
      return t('exchange.result.' + state.result.status)
        + (state.result.reason ? ' ' + t('exchange.reason.' + state.result.reason) : '')
        + (state.result.notification === 'failed' ? ' ' + t('exchange.notificationFailed') : '')
    }
    function MembershipJoinDialog({ row, api, t, onClose }) {
      const [name, setName] = React.useState(row.recovery?.name ?? row.name)
      const { state, busy, convert } = useMembershipConversion(api)
      const close = () => { if (!busy.current) onClose() }
      const submit = async event => {
        event?.preventDefault()
        if (!name.trim()) return
        const result = await convert(row, name, state.retry)
        if ((result?.status === 'converted' || result?.status === 'unchanged') && result.notification !== 'failed') onClose()
      }
      const feedback = membershipFeedback(t, state)
      return h(Modal, { open: true, title: t('exchange.join'), closeLabel: t('modalCancel'), onClose: close,
        footer: [h(Button, { key: 'cancel', disabled: state.pending, onClick: close }, t('modalCancel')),
          h(Button, { key: 'confirm', disabled: state.pending || !name.trim(), onClick: () => { void submit() } },
            t(state.retry || row.recovery ? 'exchange.retry' : 'exchange.join'))] },
        h('form', { onSubmit: submit, 'data-testid': 'membership-join-form' }, [
          h('label', { key: 'name', style: { display: 'flex', flexDirection: 'column', gap: 8 } }, [t('exchange.name'),
            h('input', { value: name, maxLength: 128, 'data-modal-autofocus': true, disabled: state.pending || state.retry !== null || row.recovery !== null,
              onChange: event => setName(event.target.value) })]),
          feedback ? h('p', { key: 'feedback', role: state.error || state.result?.status === 'rejected' ? 'alert' : 'status' }, feedback) : null,
        ]))
    }
    function MembershipRowAction({ t, api, rootId, targetId, expectedRole }) {
      const [candidate, setCandidate] = React.useState({ loading: true, row: null, error: false })
      const { state, busy, convert } = useMembershipConversion(api)
      React.useEffect(() => {
        let cancelled = false, timer
        const refresh = async () => {
          if (!busy.current) try {
            const rows = await api.candidates()
            const row = rows.find(item => item.rootId === rootId && item.targetId === targetId && item.role === expectedRole) ?? null
            if (!cancelled) setCandidate({ loading: false, row, error: false })
          } catch { if (!cancelled) setCandidate(previous => ({ ...previous, loading: false, error: true })) }
          if (!cancelled) timer = setTimeout(refresh, 3000)
        }
        void refresh()
        return () => { cancelled = true; clearTimeout(timer) }
      }, [api, rootId, targetId, expectedRole])
      const row = candidate.row
      if (!candidate.loading && !candidate.error && !row && !state.retry) return null
      const feedback = membershipFeedback(t, state)
      const reason = candidate.error ? t('exchange.reason.unavailable') : row?.reason ? t('exchange.reason.' + row.reason) : ''
      const retry = state.retry ?? row?.recovery
      return h('div', { 'data-testid': 'membership-row-action', 'aria-busy': state.pending,
        onClick: event => event.stopPropagation(), onKeyDown: event => event.stopPropagation() }, [
        h(Button, { key: 'convert', title: feedback || reason || undefined,
          disabled: candidate.loading || candidate.error || state.pending || !row || row.status !== 'inactive' || (row.reason !== null && row.recovery === null),
          onClick: () => {
            if (!row) return
            if (row.role === 'subagent') api.openJoin(row)
            else void convert(row, row.name, retry)
          } }, t(retry ? 'exchange.retry' : expectedRole === 'teammate' ? 'exchange.leave' : 'exchange.join')),
        feedback && (state.error || state.result?.status === 'rejected' || state.result?.status === 'recovery-required' || state.result?.notification === 'failed')
          ? h('span', { key: 'feedback', role: 'alert' }, feedback) : null,
      ])
    }
    // Build-time private copies extend the exact native header entries, not the DOM.
    const CONVERSATION_PANELS = ({ ...(() => { const NS = "agent-team"; const css = {"root":"dsh-collab-TeamAction-root","trigger":"dsh-collab-TeamAction-trigger","triggerLabel":"dsh-collab-TeamAction-triggerLabel","count":"dsh-collab-TeamAction-count","panel":"dsh-collab-TeamAction-panel","panelCompact":"dsh-collab-TeamAction-panelCompact","roster":"dsh-collab-TeamAction-roster","body":"dsh-collab-TeamAction-body","taskTitle":"dsh-collab-TeamAction-taskTitle","member":"dsh-collab-TeamAction-member","memberCurrent":"dsh-collab-TeamAction-memberCurrent","memberDot":"dsh-collab-TeamAction-memberDot","inactiveIcon":"dsh-collab-TeamAction-inactiveIcon","memberText":"dsh-collab-TeamAction-memberText","memberName":"dsh-collab-TeamAction-memberName","memberNameText":"dsh-collab-TeamAction-memberNameText","memberModel":"dsh-collab-TeamAction-memberModel","currentTag":"dsh-collab-TeamAction-currentTag","meta":"dsh-collab-TeamAction-meta","diagnostic":"dsh-collab-TeamAction-diagnostic","error":"dsh-collab-TeamAction-error","warning":"dsh-collab-TeamAction-warning","tasks":"dsh-collab-TeamAction-tasks","emptyNotice":"dsh-collab-TeamAction-emptyNotice","task":"dsh-collab-TeamAction-task","taskState":"dsh-collab-TeamAction-taskState","clampedDescription":"dsh-collab-TeamAction-clampedDescription","expandToggle":"dsh-collab-TeamAction-expandToggle","expandToggleOpen":"dsh-collab-TeamAction-expandToggleOpen","notice":"dsh-collab-TeamAction-notice","memberLine":"dsh-collab-TeamAction-memberLine"};
const { useEffect, useLayoutEffect, useRef, useState } = React;
const { createPortal } = ReactDOM;
const { IconChevronDownOutlineRegular, IconUserOutlineRegular, IconUsersOutlineRegular, StateDot, Tag, Tooltip, useAnchoredPosition, useDismissOnOutsidePointer } = primitives;
function statusKey(status) {
    switch (status) {
        case 'pending': return 'status.pending';
        case 'in_progress': return 'status.in_progress';
        case 'completed': return 'status.completed';
        /* v8 ignore next -- Team views omit deleted task tombstones. */
        case 'deleted': return 'status.completed';
    }
}
function memberStatusKey(status) {
    switch (status) {
        case 'running': return 'memberStatus.running';
        case 'inactive': return 'memberStatus.inactive';
        case 'provisioning': return 'memberStatus.provisioning';
        case 'failed': return 'memberStatus.failed';
    }
}
function memberDotState(status) {
    switch (status) {
        case 'running':
        case 'provisioning': return 'ongoing';
        case 'failed': return 'error';
    }
}
function taskDotState(task) {
    switch (task.status) {
        case 'pending': return task.ready ? 'idle' : 'warning';
        case 'in_progress': return 'ongoing';
        case 'completed': return 'done';
        /* v8 ignore next -- Team views omit deleted task tombstones. */
        case 'deleted': return 'idle';
    }
}
function TeamMemberRow({ member, memberCount, rootSessionId, sessionId, useSessions, useSessionStatus, openTeammate, membership, membershipT, onError, t, }) {
    const model = useSessions(state => state.projectionsBySession[member.id]?.values.modelSelection?.next?.model);
    const running = useSessionStatus(state => state.get(member.id)?.running);
    const summaryRunning = useSessions(state => state.byId[member.id]?.running);
    const status = member.phase === 'active'
        ? (running ?? summaryRunning) === true ? 'running' : 'inactive'
        : member.phase;
    const isCurrent = member.id === sessionId;
    const highlightCurrent = isCurrent && memberCount > 1;
    const inert = isCurrent || status === 'failed' || status === 'provisioning';
    return (React.createElement("div", { className: css.memberLine },
        React.createElement(Tooltip, { label: t('open'), side: "bottom", gap: 4, disabled: inert },
            React.createElement("button", { type: "button", className: highlightCurrent ? `${css.member} ${css.memberCurrent}` : css.member, disabled: inert, onClick: () => {
                    try {
                        openTeammate(sessionId, member.id);
                    }
                    catch (reason) {
                        onError(String(reason));
                    }
                } },
                React.createElement("span", { className: css.memberDot }, status === 'inactive'
                    ? React.createElement(IconUserOutlineRegular, { size: 14, className: css.inactiveIcon })
                    : React.createElement(StateDot, { state: memberDotState(status) })),
                React.createElement("span", { className: css.memberText },
                    React.createElement("span", { className: css.memberName },
                        React.createElement("span", { className: css.memberNameText }, member.name),
                        isCurrent && React.createElement(Tag, { tone: "info", className: css.currentTag }, t('current'))),
                    React.createElement("small", null,
                        t(memberStatusKey(status)),
                        model !== undefined && (React.createElement("span", { className: css.memberModel }, ` · ${t('model')}: ${model}`))),
                    member.error !== undefined && React.createElement("small", { className: css.diagnostic }, member.error)))),
        member.id !== rootSessionId && (React.createElement(MembershipRowAction, { rootId: rootSessionId, targetId: member.id, expectedRole: "teammate", api: membership, t: membershipT }))));
}
/** Task card with a two-line description clamp expanded from a toggle in the meta row. */
function TaskCard({ task, t }) {
    const [expanded, setExpanded] = useState(false);
    const [clamped, setClamped] = useState(false);
    const textRef = useRef(null);
    useLayoutEffect(() => {
        if (expanded)
            return;
        const paragraph = textRef.current;
        /* v8 ignore next -- the paragraph mounts in the same commit as the effect. */
        if (paragraph === null)
            return;
        const measure = () => { setClamped(paragraph.scrollHeight > paragraph.clientHeight + 1); };
        measure();
        if (typeof ResizeObserver === 'undefined')
            return;
        const observer = new ResizeObserver(measure);
        observer.observe(paragraph);
        return () => { observer.disconnect(); };
    }, [task.description, expanded]);
    return (React.createElement("article", { className: css.task },
        React.createElement("div", { className: css.taskTitle },
            React.createElement("strong", null, task.subject),
            React.createElement("span", { className: css.taskState },
                React.createElement(StateDot, { state: taskDotState(task) }),
                React.createElement("span", null, t(statusKey(task.status))))),
        React.createElement("p", { ref: textRef, className: expanded ? undefined : css.clampedDescription }, task.description),
        React.createElement("div", { className: css.meta },
            (clamped || expanded) && (React.createElement("button", { type: "button", className: css.expandToggle, "aria-expanded": expanded, onClick: () => { setExpanded(current => !current); } },
                t(expanded ? 'task.collapse' : 'task.expand'),
                React.createElement(IconChevronDownOutlineRegular, { size: 12, className: expanded ? css.expandToggleOpen : undefined }))),
            React.createElement("span", null, task.id),
            React.createElement("span", null,
                t('owner'),
                ": ",
                task.ownerName ?? t('unowned')),
            task.status === 'pending' && React.createElement("span", null, task.ready ? t('ready') : t('blocked')),
            task.blockedBy.length > 0 && React.createElement("span", null,
                t('blockedBy'),
                ": ",
                task.blockedBy.join(', ')),
            task.writeScopes.length > 0 && React.createElement("span", null,
                t('writeScopes'),
                ": ",
                task.writeScopes.join(', ')),
            task.writeScopeWarnings.map(warning => React.createElement("span", { key: warning, className: css.warning }, warning)))));
}
/** Render the Team roster and read-only task board. */
function TeamAction({ sessionId, useSession, useSessions, useSessionStatus, openTeammate, membership, membershipT, t, }) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState(null);
    const rootRef = useRef(null);
    const triggerRef = useRef(null);
    const triggerLabelRef = useRef(null);
    const panelRef = useRef(null);
    const position = useAnchoredPosition({
        open, anchorRef: triggerRef, panelRef, gap: 5, margin: 16,
    });
    const positioned = position !== null;
    const leadSessionId = useSession(snapshot => snapshot.subagent?.address.parentSessionId) ?? sessionId;
    const team = useSessions(state => state.projectionsBySession[leadSessionId]?.values.agentTeam);
    const opening = useSession(snapshot => snapshot.openState === 'loading');
    const listing = useSessions(state => state.phase === 'pending');
    const hoverTimer = useRef(undefined);
    const pinnedRef = useRef(false);
    const cancelHoverChange = () => {
        clearTimeout(hoverTimer.current);
        hoverTimer.current = undefined;
    };
    useEffect(() => {
        cancelHoverChange();
        pinnedRef.current = false;
        setOpen(false);
        setError(null);
    }, [sessionId]);
    useEffect(() => cancelHoverChange, []);
    useLayoutEffect(() => {
        if (open && positioned && pinnedRef.current)
            panelRef.current?.focus();
    }, [open, positioned]);
    const changeOpen = (next) => {
        cancelHoverChange();
        if (!next)
            pinnedRef.current = false;
        setOpen(next);
    };
    const scheduleHoverOpen = () => {
        cancelHoverChange();
        if (open)
            return;
        const label = triggerLabelRef.current;
        /* v8 ignore next -- the label mounts with the trigger that received the hover. */
        if (label === null)
            return;
        // Icon-only trigger (label collapsed by the header container query):
        // hover-open would surprise on such a small target, so only click opens.
        if (getComputedStyle(label).display === 'none')
            return;
        hoverTimer.current = setTimeout(() => {
            hoverTimer.current = undefined;
            changeOpen(true);
        }, 150);
    };
    const scheduleHoverClose = () => {
        cancelHoverChange();
        if (pinnedRef.current)
            return;
        hoverTimer.current = setTimeout(() => {
            hoverTimer.current = undefined;
            changeOpen(false);
        }, 120);
    };
    useDismissOnOutsidePointer(rootRef, open, changeOpen, panelRef);
    useEffect(() => {
        if (!open)
            return;
        const dismiss = (event) => {
            if (event.key !== 'Escape')
                return;
            event.preventDefault();
            cancelHoverChange();
            pinnedRef.current = false;
            setOpen(false);
            if (panelRef.current?.contains(document.activeElement))
                triggerRef.current?.focus();
        };
        document.addEventListener('keydown', dismiss);
        return () => { document.removeEventListener('keydown', dismiss); };
    }, [open]);
    const compact = team !== undefined && team.members.length === 1 && team.tasks.length === 0;
    return (React.createElement("div", { ref: rootRef, className: css.root, "data-team-action": true, onMouseLeave: scheduleHoverClose },
        React.createElement("button", { type: "button", ref: triggerRef, onMouseEnter: scheduleHoverOpen, className: css.trigger, "aria-label": t('trigger'), "aria-haspopup": "dialog", "aria-expanded": open, onClick: () => {
                cancelHoverChange();
                pinnedRef.current = true;
                if (!open)
                    changeOpen(true);
                else
                    panelRef.current?.focus();
            } },
            React.createElement(IconUsersOutlineRegular, { size: 14 }),
            React.createElement("span", { ref: triggerLabelRef, className: css.triggerLabel }, t('trigger'))),
        open && createPortal(React.createElement("div", { ref: panelRef, className: compact ? `${css.panel} ${css.panelCompact}` : css.panel, style: position ?? { visibility: 'hidden', left: 0, top: 0 }, role: "dialog", tabIndex: -1, "aria-label": t('trigger'), "data-team-panel": true, onMouseEnter: cancelHoverChange, onMouseLeave: scheduleHoverClose },
            React.createElement("div", { className: css.body },
                error !== null && (React.createElement("div", { className: css.error, role: "alert" },
                    React.createElement(StateDot, { state: "error" }),
                    error)),
                team === undefined && (React.createElement("div", { className: css.notice, role: "status" },
                    React.createElement(StateDot, { state: opening || listing ? 'ongoing' : 'warning' }),
                    t(opening || listing ? 'loading' : 'unavailable'))),
                team !== undefined && (React.createElement(React.Fragment, null,
                    team.failure !== undefined && (React.createElement("div", { className: css.error, role: "alert" },
                        React.createElement(StateDot, { state: "error" }),
                        t('failure', { message: team.failure }))),
                    React.createElement("section", null,
                        React.createElement("h3", null,
                            t('roster'),
                            team.members.length > 1 && React.createElement("span", { className: css.count }, team.members.length)),
                        React.createElement("div", { className: css.roster }, team.members.map(member => (React.createElement(TeamMemberRow, { key: member.id, member: member, memberCount: team.members.length, sessionId: sessionId, rootSessionId: leadSessionId, useSessions: useSessions, useSessionStatus: useSessionStatus, openTeammate: openTeammate, membership: membership, membershipT: membershipT, onError: setError, t: t }))))),
                    React.createElement("section", null, team.tasks.length === 0
                        ? React.createElement("p", { className: css.emptyNotice }, t('empty'))
                        : (React.createElement(React.Fragment, null,
                            React.createElement("h3", null,
                                t('tasks'),
                                React.createElement("span", { className: css.count }, team.tasks.length)),
                            React.createElement("div", { className: css.tasks }, team.tasks.map(task => React.createElement(TaskCard, { key: task.id, task: task, t: t })))))))))), document.body)));
}

return { TeamAction }; })(),
...(() => { const NS = "subagent"; const css = {"root":"dsh-collab-SubagentHeaderLineage-root","switcherRoot":"dsh-collab-SubagentHeaderLineage-switcherRoot","trigger":"dsh-collab-SubagentHeaderLineage-trigger","switcherTrigger":"dsh-collab-SubagentHeaderLineage-switcherTrigger","ancestorSwitcherTrigger":"dsh-collab-SubagentHeaderLineage-ancestorSwitcherTrigger","switcherTitle":"dsh-collab-SubagentHeaderLineage-switcherTitle","activitySlot":"dsh-collab-SubagentHeaderLineage-activitySlot","triggerOpen":"dsh-collab-SubagentHeaderLineage-triggerOpen","menu":"dsh-collab-SubagentHeaderLineage-menu","menuBody":"dsh-collab-SubagentHeaderLineage-menuBody","node":"dsh-collab-SubagentHeaderLineage-node","rowLine":"dsh-collab-SubagentHeaderLineage-rowLine","row":"dsh-collab-SubagentHeaderLineage-row","membershipAction":"dsh-collab-SubagentHeaderLineage-membershipAction","clickarea":"dsh-collab-SubagentHeaderLineage-clickarea","rowActivitySlot":"dsh-collab-SubagentHeaderLineage-rowActivitySlot","disclosure":"dsh-collab-SubagentHeaderLineage-disclosure","disclosureSpace":"dsh-collab-SubagentHeaderLineage-disclosureSpace","disclosureOpen":"dsh-collab-SubagentHeaderLineage-disclosureOpen","content":"dsh-collab-SubagentHeaderLineage-content","label":"dsh-collab-SubagentHeaderLineage-label","summary":"dsh-collab-SubagentHeaderLineage-summary","currentLabel":"dsh-collab-SubagentHeaderLineage-currentLabel","metrics":"dsh-collab-SubagentHeaderLineage-metrics","metricToken":"dsh-collab-SubagentHeaderLineage-metricToken","metricDuration":"dsh-collab-SubagentHeaderLineage-metricDuration","sidebarButton":"dsh-collab-SubagentHeaderLineage-sidebarButton","sidebarSpace":"dsh-collab-SubagentHeaderLineage-sidebarSpace","children":"dsh-collab-SubagentHeaderLineage-children","notice":"dsh-collab-SubagentHeaderLineage-notice","error":"dsh-collab-SubagentHeaderLineage-error","refresh":"dsh-collab-SubagentHeaderLineage-refresh"};
const { useMemo, useEffect, useRef, useState } = React;
const { createPortal } = ReactDOM;
const { IconChevronDownOutlineRegular, IconChevronRightOutlineRegular, IconRefreshOutlineRegular, StateDot, Tooltip } = primitives;
function treeItems(root) {
    return root === null
        ? []
        : Array.from(root.querySelectorAll('[role="treeitem"]:not([aria-disabled="true"])'));
}
/** Compact token count shared in shape with the conversation stats strip. */
function formatTokens(value, t) {
    const scaled = (next) => next >= 100
        ? String(Math.round(next))
        : String(Math.round(next * 10) / 10);
    if (value < 1_000)
        return String(value);
    if (value < 1_000_000)
        return t('tokens.thousand', { value: scaled(value / 1_000) });
    return t('tokens.million', { value: scaled(value / 1_000_000) });
}
/** Sum the four disjoint durable provider-usage buckets. */
function tokenTotal(usage) {
    return usage === undefined
        ? undefined
        : usage.uncachedInputTokens + usage.outputTokens
            + usage.cacheReadTokens + usage.cacheWriteTokens;
}
/** Exact whole-second active-turn duration for one catalog row. */
function activityDuration(summary, activity, now) {
    if (summary === undefined)
        return undefined;
    const timing = summary.projectionValues?.subagentTiming;
    if (timing === undefined)
        return undefined;
    if (timing.active === undefined)
        return timing.settledMs;
    const end = activity === 'running'
        ? now
        : timing.active.through;
    return timing.settledMs + Math.max(0, end - timing.active.since);
}
function splitDuration(ms) {
    const totalSeconds = Math.floor(Math.max(0, ms) / 1_000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    return {
        seconds: totalSeconds % 60,
        minutes: totalMinutes % 60,
        hours: totalHours % 24,
        days: Math.floor(totalHours / 24),
        totalMinutes,
        totalHours,
    };
}
/** Format a duration with decreasing visual precision at larger scales. */
function formatDuration(ms, t) {
    const { seconds, minutes, hours, days, totalMinutes, totalHours } = splitDuration(ms);
    if (days >= 365) {
        const years = Math.floor(days / 365);
        const months = Math.floor((days % 365) / 30);
        return months === 0
            ? t('duration.years', { years })
            : t('duration.yearsMonths', { years, months });
    }
    if (days >= 30) {
        const months = Math.floor(days / 30);
        const remainingDays = days % 30;
        return remainingDays === 0
            ? t('duration.months', { months })
            : t('duration.monthsDays', { months, days: remainingDays });
    }
    if (days > 0) {
        return hours === 0
            ? t('duration.days', { days })
            : t('duration.daysHours', { days, hours });
    }
    if (totalHours > 0) {
        return t('duration.hours', {
            hours: totalHours,
            minutes: String(minutes).padStart(2, '0'),
            seconds: String(seconds).padStart(2, '0'),
        });
    }
    if (totalMinutes > 0) {
        return t('duration.minutes', {
            minutes: totalMinutes,
            seconds: String(seconds).padStart(2, '0'),
        });
    }
    return t('duration.seconds', { seconds });
}
/** Preserve exact whole seconds for hover and accessible naming. */
function formatExactDuration(ms, t) {
    const { seconds, minutes, hours, days } = splitDuration(ms);
    return days === 0
        ? formatDuration(ms, t)
        : t('duration.exactDays', {
            days,
            hours: String(hours).padStart(2, '0'),
            minutes: String(minutes).padStart(2, '0'),
            seconds: String(seconds).padStart(2, '0'),
        });
}
function SubagentSwitcherIcon() {
    return (React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 20 20", fill: "none", "aria-hidden": "true" },
        React.createElement("path", { d: "M5.99951 12.7L8.95546 14.9478C9.40011 15.2859 9.62244 15.455 9.87526 15.488C9.95774 15.4988 10.0413 15.4988 10.1238 15.488C10.3766 15.455 10.5989 15.2859 11.0436 14.9478L13.9995 12.7", stroke: "currentColor", strokeWidth: "1.5" }),
        React.createElement("path", { d: "M13.9995 7.7417L11.0436 5.49387C10.5989 5.15574 10.3766 4.98668 10.1238 4.95362C10.0413 4.94283 9.95775 4.94283 9.87527 4.95362C9.62245 4.98668 9.40012 5.15574 8.95547 5.49387L5.99952 7.7417", stroke: "currentColor", strokeWidth: "1.5" })));
}
/** Render catalog loading without inventing child membership. */
function CatalogLoadingRows({ t }) {
    return React.createElement("div", { className: css.notice }, t('loading.label'));
}
/** A child becomes a known leaf only after its own authoritative catalog loads empty. */
function isKnownLeaf(catalog) {
    return catalog?.state === 'ready' && catalog.entries.length === 0;
}
/** Render one catalog level and recurse only through explicitly expanded rows. */
function CatalogRows({ parentSessionId, currentSessionId, catalog, catalogs, summaries, expanded, level, openChild, openChildAside, refreshProjection, toggleBranch, closeCatalog, membership, membershipT, t, }) {
    const [now, setNow] = useState(() => Date.now());
    const running = catalog.entries.some(entry => entry.activity === 'running');
    useEffect(() => {
        if (!running)
            return;
        const timer = setInterval(() => { setNow(Date.now()); }, 1_000);
        return () => { clearInterval(timer); };
    }, [running]);
    const emptyLoading = catalog.state === 'loading' && catalog.entries.length === 0;
    const reserveDisclosure = catalog.entries.some(entry => entry.mode !== 'external' && !isKnownLeaf(catalogs[entry.id])
        && summaries[entry.id]?.formatStatus !== 'migration-required'
        && catalogs[entry.id]?.state !== 'migration-required');
    return (React.createElement(React.Fragment, null,
        emptyLoading && (React.createElement(CatalogLoadingRows, { t: t })),
        catalog.state === 'error' && (React.createElement("div", { className: css.error },
            React.createElement("span", null, catalog.error?.message ?? t('load.error')),
            React.createElement("button", { type: "button", className: css.refresh, onClick: () => { refreshProjection(parentSessionId); } },
                React.createElement(IconRefreshOutlineRegular, { size: 14 }),
                t('retry')))),
        catalog.entries.map((entry) => {
            const external = entry.mode === 'external';
            const childCatalog = catalogs[entry.id];
            const isCurrent = entry.id === currentSessionId;
            const knownLeaf = external || isKnownLeaf(childCatalog);
            const requiresOpening = summaries[entry.id]?.formatStatus === 'migration-required'
                || childCatalog?.state === 'migration-required';
            const canExpand = !knownLeaf && !requiresOpening;
            const isExpanded = canExpand && expanded.has(entry.id);
            const childLoading = childCatalog === undefined
                || (childCatalog.state === 'loading' && childCatalog.entries.length === 0);
            const summary = summaries[entry.id];
            const label = entry.label ?? entry.id;
            const mode = external ? t('mode.external') : entry.mode === 'unknown' ? t('mode.unknown')
                : entry.mode === 'one-shot' ? t('mode.oneShot') : t('mode.continuable');
            const completed = !external && entry.activity === 'inactive'
                && summary?.projectionValues?.subagentTiming?.lastTurnCompleted === true;
            const activity = external ? undefined : entry.activity === 'running'
                ? t('activity.running')
                : completed
                    ? t('activity.completed')
                    : t('activity.inactive');
            const secondary = [summary?.title, requiresOpening ? t('catalog.migrationRequired') : mode, activity]
                .filter(value => value !== undefined)
                .join(' · ');
            const totalTokens = tokenTotal(summary?.projectionValues?.tokenUsage);
            const durationMs = activityDuration(summary, entry.activity, now);
            const tokenMetric = totalTokens === undefined
                ? undefined
                : t('tokens.total', { value: formatTokens(totalTokens, t) });
            const durationMetric = durationMs === undefined
                ? undefined
                : {
                    compact: formatDuration(durationMs, t),
                    exact: formatExactDuration(durationMs, t),
                };
            const metrics = [tokenMetric, durationMetric?.exact]
                .filter(value => value !== undefined)
                .join(' · ');
            const open = () => {
                if (external)
                    return;
                openChild({
                    parentSessionId,
                    childSessionId: entry.id,
                    mode: entry.mode,
                });
                closeCatalog();
            };
            const handleKey = (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    open();
                }
                else if ((event.key === 'ArrowRight' && canExpand && !isExpanded)
                    || (event.key === 'ArrowLeft' && isExpanded)) {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleBranch(entry.id);
                }
            };
            const toggle = (event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleBranch(entry.id);
            };
            return (React.createElement("div", { key: entry.id, className: css.node },
                React.createElement("div", { className: css.rowLine },
                    React.createElement("div", { role: "treeitem", tabIndex: external ? -1 : 0, "aria-disabled": external || undefined, "aria-level": level, "aria-current": isCurrent || undefined, "aria-label": [label, secondary, metrics].filter(value => value !== '').join(' '), ...canExpand ? { 'aria-expanded': isExpanded } : {}, className: css.row, onClick: open, onKeyDown: handleKey },
                        !canExpand
                            ? reserveDisclosure && React.createElement("span", { className: css.disclosureSpace })
                            : (React.createElement("button", { type: "button", tabIndex: -1, className: `${css.disclosure} ${isExpanded ? css.disclosureOpen : ''}`, "aria-label": t(isExpanded ? 'branch.collapse' : 'branch.expand', { label }), onClick: toggle },
                                React.createElement(IconChevronRightOutlineRegular, null))),
                        React.createElement("div", { className: css.clickarea },
                            React.createElement("span", { className: css.rowActivitySlot },
                                React.createElement(StateDot, { state: entry.activity === 'running' ? 'ongoing' : completed ? 'done' : 'idle' })),
                            React.createElement("span", { className: css.content },
                                React.createElement("span", { className: `${css.label} ${isCurrent ? css.currentLabel : ''}` }, label),
                                React.createElement("span", { className: css.summary }, secondary)),
                            metrics !== '' && (React.createElement("span", { className: css.metrics },
                                tokenMetric !== undefined && React.createElement("span", { className: css.metricToken }, tokenMetric),
                                durationMetric !== undefined && (React.createElement("span", { className: css.metricDuration, title: t('duration.exactTitle', { duration: durationMetric.exact }) }, durationMetric.compact)))),
                            isCurrent || external
                                ? React.createElement("span", { className: css.sidebarSpace })
                                : (React.createElement(Tooltip, { label: t('open.sidebar'), side: "bottom", align: "end" },
                                    React.createElement("button", { type: "button", className: css.sidebarButton, "aria-label": t('open.sidebar.aria', { label }), onClick: (event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            openChildAside({ parentSessionId, childSessionId: entry.id, mode: entry.mode });
                                            closeCatalog();
                                        }, onKeyDown: (event) => { event.stopPropagation(); } },
                                        React.createElement(IconChevronRightOutlineRegular, null)))))),
                    entry.mode === 'continuable' && !requiresOpening && (React.createElement("div", { className: css.membershipAction },
                        React.createElement(MembershipRowAction, { rootId: parentSessionId, targetId: entry.id, expectedRole: "subagent", api: membership, t: membershipT })))),
                isExpanded && (React.createElement("div", { role: "group", className: css.children, "aria-busy": childLoading || undefined }, childCatalog === undefined
                    ? React.createElement(CatalogLoadingRows, { t: t })
                    : (React.createElement(CatalogRows, { parentSessionId: entry.id, currentSessionId: currentSessionId, catalog: childCatalog, catalogs: catalogs, summaries: summaries, expanded: expanded, level: level + 1, openChild: openChild, openChildAside: openChildAside, refreshProjection: refreshProjection, toggleBranch: toggleBranch, closeCatalog: closeCatalog, membership: membership, membershipT: membershipT, t: t }))))));
        })));
}
const MENU_VIEWPORT_MARGIN = 16;
/** Place a portaled catalog below its trigger without crossing the viewport edge. */
function catalogMenuPosition(trigger) {
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(336, window.innerWidth - MENU_VIEWPORT_MARGIN * 2);
    return {
        top: rect.bottom + 5,
        left: Math.min(Math.max(MENU_VIEWPORT_MARGIN, rect.left), window.innerWidth - width - MENU_VIEWPORT_MARGIN),
    };
}
/** One trigger-plus-tree dropdown over the catalog rooted at `rootSessionId`. */
function CatalogDropdown({ rootSessionId, currentSessionId, displayTitle, openTitle, variant, useSessions, useSessionStatus, openChild, openChildAside, refreshProjection, membership, membershipT, t, }) {
    const ancestorSwitcher = variant === 'switcher' && openTitle !== undefined;
    const projections = useSessions(state => state.projectionsBySession);
    const summaries = useSessions(state => state.byId);
    const statuses = useSessionStatus(value => value);
    const catalogs = useMemo(() => {
        return Object.fromEntries(Object.entries(projections).map(([id, snapshot]) => {
            const projected = snapshot.values.subagentCatalog;
            const state = snapshot.state === 'idle'
                ? projected === undefined ? 'loading' : 'ready'
                : snapshot.state === 'migration-required' && projected !== undefined ? 'ready' : snapshot.state;
            return [id, {
                    state,
                    error: snapshot.error,
                    entries: (projected ?? []).map(entry => ({
                        ...entry,
                        activity: (statuses.get(entry.id)?.running ?? summaries[entry.id]?.running) === true
                            ? 'running' : 'inactive',
                    })),
                }];
        }));
    }, [projections, summaries, statuses]);
    const catalog = catalogs[rootSessionId];
    const [open, setOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState();
    const [expanded, setExpanded] = useState(() => new Set());
    const rootRef = useRef(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const hoverOpenTimer = useRef(undefined);
    const hoverCloseTimer = useRef(undefined);
    // A click-opened (pinned) menu ignores hover-out; only explicit dismissal closes it.
    const pinnedRef = useRef(false);
    const currentEntry = currentSessionId === undefined
        ? undefined
        : projections[rootSessionId]?.values.subagentCatalog?.find(entry => entry.id === currentSessionId);
    const switcherDisplayTitle = currentEntry !== undefined
        ? currentEntry.label ?? currentEntry.id
        : displayTitle;
    const directChildren = catalog?.entries ?? [];
    const directCount = directChildren.length;
    const runningCount = directChildren.filter(entry => entry.activity === 'running').length;
    const totalCountKey = directCount === 1 ? 'count.total.one' : 'count.total.other';
    const runningCountKey = runningCount === 1 ? 'count.running.one' : 'count.running.other';
    const presentedCatalog = catalog ?? (variant === 'switcher'
        ? { entries: [], state: 'loading', error: null }
        : undefined);
    const cancelHoverClose = () => {
        if (hoverCloseTimer.current === undefined)
            return;
        clearTimeout(hoverCloseTimer.current);
        hoverCloseTimer.current = undefined;
    };
    const cancelHoverOpen = () => {
        if (hoverOpenTimer.current === undefined)
            return;
        clearTimeout(hoverOpenTimer.current);
        hoverOpenTimer.current = undefined;
    };
    const changeOpen = (next, restoreFocus = false) => {
        cancelHoverOpen();
        cancelHoverClose();
        if (next) {
            const trigger = triggerRef.current;
            /* v8 ignore next -- a queued callback can outlive the trigger */
            if (trigger === null)
                return;
            setOpen(true);
            setMenuPosition(catalogMenuPosition(trigger));
        }
        else {
            pinnedRef.current = false;
            setOpen(false);
            setMenuPosition(undefined);
            setExpanded(new Set());
        }
        if (restoreFocus)
            queueMicrotask(() => { triggerRef.current?.focus(); });
    };
    const scheduleHoverOpen = () => {
        cancelHoverOpen();
        cancelHoverClose();
        if (open)
            return;
        hoverOpenTimer.current = setTimeout(() => {
            hoverOpenTimer.current = undefined;
            changeOpen(true);
        }, 150);
    };
    const scheduleHoverClose = () => {
        cancelHoverOpen();
        cancelHoverClose();
        if (pinnedRef.current)
            return;
        hoverCloseTimer.current = setTimeout(() => {
            hoverCloseTimer.current = undefined;
            changeOpen(false);
        }, 120);
    };
    const closeBranch = (root) => {
        const closing = new Set();
        const visit = (parentSessionId) => {
            if (closing.has(parentSessionId) || !expanded.has(parentSessionId))
                return;
            closing.add(parentSessionId);
            const branch = catalogs[parentSessionId];
            for (const entry of branch?.entries ?? []) {
                visit(entry.id);
            }
        };
        visit(root);
        setExpanded(current => new Set([...current].filter(id => !closing.has(id))));
    };
    const toggleBranch = (childSessionId) => {
        if (expanded.has(childSessionId)) {
            closeBranch(childSessionId);
            return;
        }
        setExpanded(current => new Set(current).add(childSessionId));
        refreshProjection(childSessionId);
    };
    useEffect(() => {
        if (!open)
            return;
        const closeOutside = (event) => {
            if (event.target instanceof Node
                && !rootRef.current?.contains(event.target)
                && !menuRef.current?.contains(event.target)) {
                changeOpen(false);
            }
        };
        document.addEventListener('pointerdown', closeOutside);
        return () => { document.removeEventListener('pointerdown', closeOutside); };
    }, [open]);
    useEffect(() => {
        if (!open)
            return;
        const placeMenu = () => {
            const trigger = triggerRef.current;
            /* v8 ignore next -- native resize or scroll can outlive the trigger */
            if (trigger === null)
                return;
            setMenuPosition(catalogMenuPosition(trigger));
        };
        window.addEventListener('resize', placeMenu);
        document.addEventListener('scroll', placeMenu, true);
        return () => {
            window.removeEventListener('resize', placeMenu);
            document.removeEventListener('scroll', placeMenu, true);
        };
    }, [open]);
    useEffect(() => () => {
        cancelHoverOpen();
        cancelHoverClose();
    }, []);
    // Visibility needs catalog evidence of children or a failed load worth retrying.
    // An empty loading catalog is not evidence of children.
    const visible = presentedCatalog !== undefined
        && (variant === 'switcher'
            || presentedCatalog.state === 'error'
            || presentedCatalog.entries.length > 0);
    useEffect(() => {
        if (visible)
            return;
        cancelHoverOpen();
        cancelHoverClose();
        if (!open)
            return;
        pinnedRef.current = false;
        setOpen(false);
        setExpanded(new Set());
    }, [visible, open]);
    if (!visible)
        return null;
    const focusAt = (index) => {
        const items = treeItems(menuRef.current);
        if (items.length === 0)
            return;
        items[(index + items.length) % items.length]?.focus();
    };
    const navigate = (event) => {
        const items = treeItems(menuRef.current);
        const index = items.indexOf(document.activeElement);
        if (event.key === 'Escape') {
            event.preventDefault();
            changeOpen(false, true);
        }
        else if (event.key === 'Home') {
            event.preventDefault();
            focusAt(0);
        }
        else if (event.key === 'End') {
            event.preventDefault();
            focusAt(items.length - 1);
        }
        else if (event.key === 'ArrowDown') {
            event.preventDefault();
            focusAt(index + 1);
        }
        else if (event.key === 'ArrowUp') {
            event.preventDefault();
            focusAt(index < 0 ? items.length - 1 : index - 1);
        }
    };
    return (React.createElement("div", { className: `${css.root} ${variant === 'switcher' ? css.switcherRoot : ''}`, ref: rootRef, onKeyDown: navigate, onPointerLeave: scheduleHoverClose },
        React.createElement("button", { ref: triggerRef, onPointerEnter: (event) => {
                if (event.pointerType !== 'touch')
                    scheduleHoverOpen();
            }, type: "button", className: variant === 'switcher'
                ? `${css.switcherTrigger} ${ancestorSwitcher ? css.ancestorSwitcherTrigger : ''}`
                : css.trigger, "aria-haspopup": "tree", "aria-expanded": open, "aria-label": variant === 'switcher'
                ? t('switcher.aria', { title: switcherDisplayTitle })
                : t(runningCount > 0 ? runningCountKey : totalCountKey, { count: runningCount > 0 ? runningCount : directCount }), onClick: openTitle === undefined
                ? () => {
                    cancelHoverOpen();
                    cancelHoverClose();
                    pinnedRef.current = true;
                    if (!open)
                        changeOpen(true);
                }
                : () => {
                    cancelHoverOpen();
                    if (open)
                        changeOpen(false);
                    openTitle();
                }, onKeyDown: (event) => {
                if (event.key !== 'ArrowDown')
                    return;
                event.preventDefault();
                if (!open)
                    changeOpen(true);
                queueMicrotask(() => { focusAt(0); });
            } },
            variant === 'switcher'
                ? React.createElement("span", { className: css.switcherTitle }, switcherDisplayTitle)
                : (React.createElement(React.Fragment, null,
                    runningCount > 0 && (React.createElement("span", { className: css.activitySlot },
                        React.createElement(StateDot, { state: "ongoing" }))),
                    React.createElement("span", { className: css.count }, t(totalCountKey, { count: directCount })))),
            variant === 'switcher'
                ? React.createElement(SubagentSwitcherIcon, null)
                : React.createElement(IconChevronDownOutlineRegular, { className: open ? css.triggerOpen : undefined })),
        open && createPortal((React.createElement("div", { ref: menuRef, className: css.menu, style: menuPosition, onPointerEnter: (event) => {
                if (event.pointerType !== 'touch')
                    cancelHoverClose();
            }, onPointerLeave: scheduleHoverClose },
            React.createElement("div", { className: css.menuBody, role: "tree", "aria-label": t('tree.aria') },
                React.createElement(CatalogRows, { parentSessionId: rootSessionId, currentSessionId: currentSessionId, catalog: presentedCatalog, catalogs: catalogs, summaries: summaries, expanded: expanded, level: 1, openChild: openChild, openChildAside: openChildAside, refreshProjection: refreshProjection, toggleBranch: toggleBranch, closeCatalog: () => { changeOpen(false); }, membership: membership, membershipT: membershipT, t: t })))), document.body)));
}
/**
 * Session-header catalog action for root sessions: the descendant count and
 * its dropdown after the preset label in the header actions band. Child sessions render nothing
 * here — their breadcrumb switcher in the lineage slot owns the same
 * navigation.
 * @param props - Session standard props plus the catalog actions and translator.
 * @returns The count dropdown, or null on a child session.
 */
function SubagentCatalogAction({ sessionId, useSessions, useSessionStatus, openChild, openChildAside, refreshProjection, membership, membershipT, t, }) {
    const isChild = useSessions(state => state.byId[sessionId]?.origin === 'subagent');
    if (isChild)
        return null;
    return (React.createElement(CatalogDropdown, { key: sessionId, rootSessionId: sessionId, variant: "count", useSessions: useSessions, useSessionStatus: useSessionStatus, openChild: openChild, openChildAside: openChildAside, refreshProjection: refreshProjection, membership: membership, membershipT: membershipT, t: t }));
}
/**
 * Render one breadcrumb title together with its subagent navigation.
 * @param props - Breadcrumb title, session standard props, and catalog actions.
 * @returns A title-and-chevron sibling switcher, or nothing on a root session.
 */
function SubagentHeaderLineage({ lineageSessionId, displayTitle, openTitle, useSessions, useSession, useSessionStatus, openChild, openChildAside, refreshProjection, membership, membershipT, t, }) {
    const address = useSession(session => session.subagent?.address);
    const parentId = useSessions((state) => {
        if (address?.childSessionId === lineageSessionId)
            return address.parentSessionId;
        for (const [parentId, snapshot] of Object.entries(state.projectionsBySession)) {
            if (snapshot.values.subagentCatalog?.some(entry => entry.id === lineageSessionId))
                return parentId;
        }
        const summary = state.byId[lineageSessionId];
        return summary?.origin === 'subagent' ? summary.parentId : undefined;
    });
    const shared = { useSessions, useSessionStatus, openChild, openChildAside, refreshProjection, membership, membershipT, t };
    // Root sessions carry no breadcrumb; their descendant count lives in the
    // header actions band (SubagentCatalogAction).
    if (parentId === undefined)
        return null;
    return (React.createElement(React.Fragment, null,
        React.createElement(CatalogDropdown, { key: `switcher:${lineageSessionId}`, rootSessionId: parentId, currentSessionId: lineageSessionId, variant: "switcher", displayTitle: displayTitle, ...openTitle === undefined ? {} : { openTitle }, ...shared }),
        openTitle === undefined && (React.createElement(CatalogDropdown, { key: `children:${lineageSessionId}`, rootSessionId: lineageSessionId, variant: "count", ...shared }))));
}

return { SubagentCatalogAction }; })() })
    const CONVERSATION_CSS = ".dsh-collab-TeamAction-root {\n  position: relative;\n}\n\n.dsh-collab-TeamAction-trigger {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  min-height: 28px;\n  padding: 3px 7px;\n  border: 0;\n  border-radius: 6px;\n  background: transparent;\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 12px;\n  cursor: pointer;\n}\n\n.dsh-collab-TeamAction-trigger:focus-visible {\n  color: var(--dsw-alias-label-primary);\n}\n\n@media (hover: hover) {\n  .dsh-collab-TeamAction-trigger:hover {\n    color: var(--dsw-alias-label-primary);\n  }\n}\n\n/* Second sacrifice after the preset label: past this title-row width the\n   trigger keeps only its icon. TeamAction reads the collapsed state off this\n   rule to switch from hover-open to click-only. */\n@container (max-width: 480px) {\n  .dsh-collab-TeamAction-triggerLabel {\n    display: none;\n  }\n}\n\n.dsh-collab-TeamAction-count {\n  color: var(--dsw-alias-label-caption);\n  font-size: 12px;\n  font-weight: 400;\n  font-variant-numeric: tabular-nums;\n  line-height: 16px;\n}\n\n.dsh-collab-TeamAction-panel {\n  --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2);\n  --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2);\n\n  display: flex;\n  flex-direction: column;\n  position: fixed;\n  z-index: 100;\n  box-sizing: border-box;\n  width: min(500px, 100vw - 32px);\n  max-height: min(680px, calc(100vh - 32px));\n  /* Horizontal insets live on the toolbar and scroll body, not the panel, so\n     member-card hover shadows stay inside the body's clip box; the thumb hugs\n     the panel edge (2px) while the body's stable gutter and trailing padding\n     rebuild the 16px content inset. */\n  padding: 8px 2px 0;\n  overflow: hidden;\n  border: 0;\n  border-radius: 12px;\n  --dsw-elevation-stroke-color: var(--dsw-alias-border-l1);\n  box-shadow: var(--dsw-elevation-prominent);\n}\n\n/* The menu skin lives on a pseudo-element: backdrop-filter on the panel\n   itself would turn it into the containing block for fixed descendants, so\n   the member Tooltip bubbles would be re-anchored into the panel and clipped\n   by its hidden overflow. */\n.dsh-collab-TeamAction-panel::before {\n  content: '';\n  position: absolute;\n  z-index: -1;\n  inset: 0;\n  border-radius: 12px;\n  background: var(--dsw-specific-menu);\n  backdrop-filter: var(--dsw-menu-backdrop-filter);\n}\n\n/* A lone member with no shared tasks fits one card; the full panel width\n   would sit mostly empty, so the roster drops to one column. */\n.dsh-collab-TeamAction-panelCompact {\n  width: min(320px, 100vw - 32px);\n}\n\n.dsh-collab-TeamAction-panelCompact .dsh-collab-TeamAction-roster {\n  grid-template-columns: minmax(0, 1fr);\n}\n\n.dsh-collab-TeamAction-body {\n  --dsh-scrollbar-track-margin: 8px;\n\n  flex: 1 1 auto;\n  min-height: 0;\n  padding: 0 9px 16px 14px;\n  overflow-y: auto;\n  scrollbar-gutter: stable;\n}\n\n.dsh-collab-TeamAction-taskTitle {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.dsh-collab-TeamAction-taskTitle strong {\n  font-size: 13px;\n  font-weight: 500;\n}\n\n.dsh-collab-TeamAction-panel h3 {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin: 16px 0 8px 4px;\n  color: var(--dsw-alias-label-primary);\n  font-size: 13px;\n  font-weight: 500;\n}\n\n/* Without a toolbar the first heading sits 16px under the panel edge: 8px\n   panel padding plus this trimmed margin. */\n.dsh-collab-TeamAction-body section:first-of-type h3 {\n  margin-top: 8px;\n}\n\n.dsh-collab-TeamAction-roster {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 8px;\n}\n\n.dsh-collab-TeamAction-member {\n  display: flex;\n  align-items: flex-start;\n  gap: 8px;\n  min-width: 0;\n  padding: 10px 12px;\n  border: 0;\n  --dsw-elevation-stroke-color: var(--dsw-alias-border-l2);\n  box-shadow: var(--dsw-elevation-stroke);\n  border-radius: 8px;\n  background: var(--dsw-alias-bg-layer-2);\n  color: var(--dsw-alias-label-primary);\n  text-align: left;\n  cursor: pointer;\n}\n\n.dsh-collab-TeamAction-member:disabled {\n  cursor: default;\n}\n\n/* The Current tag and card share a tint; the inset ring adds emphasis\n   without changing the card's dimensions. */\n.dsh-collab-TeamAction-memberCurrent {\n  --dsw-elevation-stroke-color: color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, transparent);\n  box-shadow: var(--dsw-elevation-stroke), inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, transparent);\n}\n\n.dsh-collab-TeamAction-member:not(:disabled):focus-visible {\n  --dsw-elevation-stroke-color: var(--dsw-alias-border-l3);\n  box-shadow: var(--dsw-elevation-panel);\n}\n\n@media (hover: hover) {\n  .dsh-collab-TeamAction-member:not(:disabled):hover {\n    --dsw-elevation-stroke-color: var(--dsw-alias-border-l3);\n    box-shadow: var(--dsw-elevation-panel);\n  }\n}\n\n/* Seat height 1lh tracks the member name's first text line, so any dot\n   diameter centers on that line instead of the row's top edge. */\n.dsh-collab-TeamAction-memberDot {\n  display: inline-flex;\n  align-items: center;\n  flex: none;\n  height: 1lh;\n}\n\n.dsh-collab-TeamAction-inactiveIcon {\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.dsh-collab-TeamAction-memberText {\n  display: flex;\n  flex-direction: column;\n  min-width: 0;\n}\n\n.dsh-collab-TeamAction-memberName {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  min-width: 0;\n}\n\n.dsh-collab-TeamAction-memberNameText,\n.dsh-collab-TeamAction-memberText small {\n  overflow: hidden;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n}\n\n/* Hover-capable cards reveal model details on hover or focus; touch cards\n   keep the details visible beside the name and activity. */\n.dsh-collab-TeamAction-memberModel {\n  display: none;\n}\n\n.dsh-collab-TeamAction-member:focus-visible .dsh-collab-TeamAction-memberModel {\n  display: inline;\n}\n\n@media (hover: hover) {\n  .dsh-collab-TeamAction-member:hover .dsh-collab-TeamAction-memberModel {\n    display: inline;\n  }\n}\n\n/* The member card is denser than the surfaces the standard capsule ships for,\n   so the current-conversation tag drops one step in size. The 999 shrink\n   factor collapses the tag (block display re-enables text-overflow) before\n   the member name gives up any width. */\n.dsh-collab-TeamAction-currentTag {\n  display: inline-block;\n  flex: 0 999 auto;\n  min-width: 0;\n  padding: 0 4px;\n  overflow: hidden;\n  font-size: 10px;\n  line-height: 15px;\n  text-overflow: ellipsis;\n}\n\n.dsh-collab-TeamAction-memberText small,\n.dsh-collab-TeamAction-meta {\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 11px;\n}\n\n.dsh-collab-TeamAction-diagnostic,\n.dsh-collab-TeamAction-error,\n.dsh-collab-TeamAction-warning {\n  color: var(--dsw-alias-state-error-primary);\n}\n\n.dsh-collab-TeamAction-tasks {\n  display: flex;\n  flex-direction: column;\n  gap: 7px;\n}\n\n/* Empty task board: a plain description in place of the section heading,\n   flush with the body's bottom padding. */\n.dsh-collab-TeamAction-emptyNotice {\n  margin: 16px 0 0 4px;\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 12px;\n}\n\n.dsh-collab-TeamAction-task {\n  padding: 11px 13px;\n  border: 0.5px solid var(--dsw-alias-border-l2);\n  border-radius: 9px;\n  background: var(--dsw-alias-bg-layer-2);\n}\n\n.dsh-collab-TeamAction-taskState {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  margin-left: auto;\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 11px;\n}\n\n.dsh-collab-TeamAction-task p {\n  margin: 5px 0;\n  color: var(--dsw-alias-label-secondary);\n  font-size: 12px;\n  line-height: 18px;\n  white-space: pre-wrap;\n}\n\n.dsh-collab-TeamAction-clampedDescription {\n  display: -webkit-box;\n  overflow: hidden;\n  -webkit-box-orient: vertical;\n  -webkit-line-clamp: 2;\n}\n\n.dsh-collab-TeamAction-expandToggle {\n  display: inline-flex;\n  align-items: center;\n  gap: 2px;\n  /* Floated ahead of the meta spans: it keeps the first line's top-right\n     corner, so wrapped meta lines continue below it instead of pushing the\n     toggle under content it expands. */\n  float: right;\n  margin-left: 10px;\n  padding: 0;\n  border: 0;\n  background: transparent;\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 11px;\n  line-height: 20px;\n  cursor: pointer;\n}\n\n.dsh-collab-TeamAction-expandToggle:focus-visible {\n  color: var(--dsw-alias-label-primary);\n}\n\n@media (hover: hover) {\n  .dsh-collab-TeamAction-expandToggle:hover {\n    color: var(--dsw-alias-label-primary);\n  }\n}\n\n.dsh-collab-TeamAction-expandToggle svg {\n  transition: transform 120ms ease;\n}\n\n.dsh-collab-TeamAction-expandToggleOpen {\n  transform: rotate(180deg);\n}\n\n.dsh-collab-TeamAction-meta {\n  line-height: 20px;\n}\n\n.dsh-collab-TeamAction-meta > span {\n  margin-right: 10px;\n}\n\n.dsh-collab-TeamAction-notice,\n.dsh-collab-TeamAction-error {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  padding: 9px;\n  font-size: 12px;\n}\n\n@media (hover: none) {\n  .dsh-collab-TeamAction-memberModel {\n    display: inline;\n  }\n}\n\n/* Keep the membership action beside, never inside, the roster navigation button. */\n.dsh-collab-TeamAction-memberLine {\n  display: flex;\n  align-items: center;\n  gap: 5px;\n  min-width: 0;\n}\n\n.dsh-collab-TeamAction-memberLine > :first-child {\n  flex: 1 1 auto;\n  min-width: 0;\n}\n\n.dsh-collab-TeamAction-memberLine .dsh-collab-TeamAction-member {\n  width: 100%;\n  min-width: 0;\n}\n\n/* A full-width roster card leaves room for a separate, keyboard-focusable action. */\n.dsh-collab-TeamAction-roster {\n  grid-template-columns: minmax(0, 1fr);\n}\n\n[data-testid=\"membership-row-action\"] {\n  flex: 0 0 auto;\n  max-width: 100%;\n  font-size: 11px;\n  line-height: 16px;\n}\n\n[data-testid=\"membership-row-action\"] button {\n  white-space: nowrap;\n  font-size: 11px;\n}\n\n[data-testid=\"membership-row-action\"] [role=\"alert\"] {\n  display: block;\n  max-width: 180px;\n  white-space: normal;\n}\n\n.dsh-collab-SubagentHeaderLineage-root {\n  position: relative;\n  display: inline-flex;\n  align-items: center;\n  gap: 10px;\n  min-width: 0;\n}\n\n.dsh-collab-SubagentHeaderLineage-switcherRoot {\n  min-width: 0;\n  margin-left: 6px;\n}\n\n.dsh-collab-SubagentHeaderLineage-trigger,\n.dsh-collab-SubagentHeaderLineage-switcherTrigger {\n  display: inline-flex;\n  align-items: center;\n  min-height: 28px;\n  padding: 3px 2px;\n  border: 0;\n  border-radius: var(--dsw-radius-sm);\n  background: transparent;\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 12px;\n  line-height: 18px;\n  cursor: pointer;\n}\n\n.dsh-collab-SubagentHeaderLineage-trigger {\n  gap: 4px;\n}\n\n.dsh-collab-SubagentHeaderLineage-switcherTrigger {\n  gap: 4px;\n  min-width: 0;\n  max-width: 244px;\n  color: var(--dsw-alias-label-primary);\n  font-weight: 500;\n}\n\n.dsh-collab-SubagentHeaderLineage-ancestorSwitcherTrigger {\n  color: var(--dsw-alias-label-tertiary);\n  font-weight: 400;\n}\n\n.dsh-collab-SubagentHeaderLineage-switcherTitle {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.dsh-collab-SubagentHeaderLineage-switcherTrigger svg {\n  flex: none;\n}\n\n.dsh-collab-SubagentHeaderLineage-activitySlot {\n  display: inline-flex;\n  flex: none;\n  align-items: center;\n  justify-content: center;\n  width: 14px;\n  height: 14px;\n}\n\n.dsh-collab-SubagentHeaderLineage-trigger:focus-visible {\n  color: var(--dsw-alias-label-primary);\n}\n\n@media (hover: hover) {\n  .dsh-collab-SubagentHeaderLineage-trigger:hover {\n    color: var(--dsw-alias-label-primary);\n  }\n}\n\n.dsh-collab-SubagentHeaderLineage-switcherTrigger:focus-visible {\n  color: var(--dsw-alias-label-primary);\n}\n\n@media (hover: hover) {\n  .dsh-collab-SubagentHeaderLineage-switcherTrigger:hover {\n    color: var(--dsw-alias-label-primary);\n  }\n}\n\n.dsh-collab-SubagentHeaderLineage-ancestorSwitcherTrigger:focus-visible {\n  color: var(--dsw-alias-label-tertiary);\n}\n\n@media (hover: hover) {\n  .dsh-collab-SubagentHeaderLineage-ancestorSwitcherTrigger:hover {\n    color: var(--dsw-alias-label-tertiary);\n  }\n}\n\n.dsh-collab-SubagentHeaderLineage-trigger svg,\n.dsh-collab-SubagentHeaderLineage-switcherTrigger svg {\n  transition: transform 120ms ease;\n}\n\n.dsh-collab-SubagentHeaderLineage-triggerOpen {\n  transform: rotate(180deg);\n}\n\n.dsh-collab-SubagentHeaderLineage-menu {\n  position: fixed;\n  z-index: 100;\n  box-sizing: border-box;\n  display: flex;\n  flex-direction: column;\n  width: 336px;\n  max-width: min(400px, calc(100vw - 32px));\n  max-height: min(560px, calc(100vh - 140px));\n  padding: 4px;\n  overflow: hidden;\n  border-radius: var(--dsw-radius-lg);\n  --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2);\n  --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2);\n  --dsw-elevation-stroke-color: var(--dsw-alias-border-l1);\n  box-shadow: var(--dsw-elevation-prominent);\n}\n\n/* The menu skin lives on a pseudo-element: backdrop-filter on the menu itself\n   would turn it into the containing block for fixed descendants, so the\n   sidebar-button Tooltip bubbles would be re-anchored into the menu and\n   clipped by its hidden overflow. */\n.dsh-collab-SubagentHeaderLineage-menu::before {\n  content: '';\n  position: absolute;\n  z-index: -1;\n  inset: 0;\n  border-radius: inherit;\n  background: var(--dsw-specific-menu);\n  backdrop-filter: var(--dsw-menu-backdrop-filter);\n}\n\n.dsh-collab-SubagentHeaderLineage-menuBody {\n  display: flex;\n  flex-direction: column;\n  flex: 1 1 auto;\n  min-height: 0;\n  overflow: auto;\n}\n\n.dsh-collab-SubagentHeaderLineage-node {\n  position: relative;\n  min-width: 0;\n}\n.dsh-collab-SubagentHeaderLineage-menuBody > .dsh-collab-SubagentHeaderLineage-node {\n  margin-left: -2px;\n}\n\n.dsh-collab-SubagentHeaderLineage-rowLine {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n  min-width: 0;\n}\n\n.dsh-collab-SubagentHeaderLineage-rowLine > .dsh-collab-SubagentHeaderLineage-row {\n  flex: 1 1 auto;\n  width: auto;\n  min-width: 0;\n}\n\n.dsh-collab-SubagentHeaderLineage-rowLine > .dsh-collab-SubagentHeaderLineage-membershipAction {\n  flex: 0 0 auto;\n  min-width: 0;\n}\n\n.dsh-collab-SubagentHeaderLineage-row {\n  position: relative;\n  display: flex;\n  align-items: flex-start;\n  gap: 6px;\n  box-sizing: border-box;\n  width: 100%;\n  min-height: 44px;\n  padding: 6px 7px 6px 9px;\n  border: 0;\n  border-radius: var(--dsw-radius-md);\n  background: transparent;\n  color: var(--dsw-alias-label-primary);\n  font-size: 12px;\n  line-height: 17px;\n  text-align: left;\n  cursor: pointer;\n  outline: none;\n}\n\n.dsh-collab-SubagentHeaderLineage-row:focus-visible > .dsh-collab-SubagentHeaderLineage-clickarea {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n@media (hover: hover) {\n  .dsh-collab-SubagentHeaderLineage-row:hover > .dsh-collab-SubagentHeaderLineage-clickarea {\n    background: var(--dsw-alias-interactive-bg-hover);\n  }\n}\n\n.dsh-collab-SubagentHeaderLineage-clickarea {\n  box-sizing: border-box;\n  display: flex;\n  flex: 1;\n  align-self: stretch;\n  align-items: flex-start;\n  gap: 6px;\n  min-width: 0;\n  margin: -6px -7px -6px;\n  padding: 6px 7px;\n  border-radius: var(--dsw-radius-md);\n}\n\n.dsh-collab-SubagentHeaderLineage-rowActivitySlot {\n  display: inline-flex;\n  flex: none;\n  align-items: center;\n  justify-content: center;\n  width: 14px;\n  height: 17px;\n}\n\n.dsh-collab-SubagentHeaderLineage-disclosure,\n.dsh-collab-SubagentHeaderLineage-disclosureSpace {\n  flex: none;\n  width: 14px;\n  height: 17px;\n}\n\n.dsh-collab-SubagentHeaderLineage-disclosure {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0;\n  border: 0;\n  background: transparent;\n  color: var(--dsw-alias-label-tertiary);\n  cursor: pointer;\n  transition: transform 120ms ease;\n}\n\n.dsh-collab-SubagentHeaderLineage-disclosure svg {\n  width: 12px;\n  height: 12px;\n}\n\n@media (hover: hover) {\n  .dsh-collab-SubagentHeaderLineage-disclosure:hover {\n    color: var(--dsw-alias-label-primary);\n  }\n}\n\n.dsh-collab-SubagentHeaderLineage-disclosureOpen {\n  transform: rotate(90deg);\n}\n\n.dsh-collab-SubagentHeaderLineage-content {\n  display: flex;\n  flex: 1;\n  flex-direction: column;\n  min-width: 0;\n}\n\n.dsh-collab-SubagentHeaderLineage-label,\n.dsh-collab-SubagentHeaderLineage-summary {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.dsh-collab-SubagentHeaderLineage-label {\n  color: inherit;\n  font-weight: 400;\n}\n\n.dsh-collab-SubagentHeaderLineage-currentLabel {\n  font-weight: 600;\n}\n\n.dsh-collab-SubagentHeaderLineage-summary,\n.dsh-collab-SubagentHeaderLineage-metrics {\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 10px;\n  line-height: 15px;\n}\n\n.dsh-collab-SubagentHeaderLineage-metrics {\n  display: grid;\n  grid-template-rows: 17px 15px;\n  flex: none;\n  font-variant-numeric: tabular-nums;\n  text-align: right;\n  white-space: nowrap;\n}\n\n.dsh-collab-SubagentHeaderLineage-metricToken {\n  grid-row: 1;\n  line-height: 17px;\n}\n\n.dsh-collab-SubagentHeaderLineage-metricDuration {\n  grid-row: 2;\n}\n\n.dsh-collab-SubagentHeaderLineage-sidebarButton,\n.dsh-collab-SubagentHeaderLineage-sidebarSpace {\n  box-sizing: border-box;\n  flex: none;\n  width: 28px;\n  height: 28px;\n  margin: 4px 0;\n}\n\n.dsh-collab-SubagentHeaderLineage-sidebarButton {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 6px;\n  border: 0;\n  border-radius: var(--dsw-radius-sm);\n  background: transparent;\n  color: var(--dsw-alias-label-tertiary);\n  cursor: pointer;\n}\n\n.dsh-collab-SubagentHeaderLineage-sidebarButton:focus-visible {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-primary);\n}\n\n@media (hover: hover) {\n  .dsh-collab-SubagentHeaderLineage-sidebarButton:hover {\n    background: var(--dsw-alias-interactive-bg-hover);\n    color: var(--dsw-alias-label-primary);\n  }\n}\n\n.dsh-collab-SubagentHeaderLineage-children {\n  position: relative;\n  margin-left: 16px;\n  padding-left: 3px;\n}\n\n.dsh-collab-SubagentHeaderLineage-children::before,\n.dsh-collab-SubagentHeaderLineage-children > .dsh-collab-SubagentHeaderLineage-node::before {\n  content: '';\n  position: absolute;\n  left: 0;\n  border-left: 0.5px solid var(--dsw-alias-border-l2);\n}\n\n.dsh-collab-SubagentHeaderLineage-children::before {\n  top: -23px;\n  height: 23px;\n}\n\n.dsh-collab-SubagentHeaderLineage-children[aria-busy='true']::before {\n  content: none;\n}\n\n.dsh-collab-SubagentHeaderLineage-children > .dsh-collab-SubagentHeaderLineage-node::before {\n  top: 0;\n  bottom: 0;\n  left: -3px;\n}\n\n.dsh-collab-SubagentHeaderLineage-children > .dsh-collab-SubagentHeaderLineage-node:last-child::before {\n  bottom: auto;\n  height: 15px;\n}\n\n.dsh-collab-SubagentHeaderLineage-children > .dsh-collab-SubagentHeaderLineage-node > .dsh-collab-SubagentHeaderLineage-rowLine > .dsh-collab-SubagentHeaderLineage-row::before {\n  content: '';\n  position: absolute;\n  top: 14px;\n  left: -3px;\n  width: 12px;\n  border-top: 0.5px solid var(--dsw-alias-border-l2);\n}\n\n.dsh-collab-SubagentHeaderLineage-notice,\n.dsh-collab-SubagentHeaderLineage-error {\n  padding: 8px 10px;\n  color: var(--dsw-alias-label-tertiary);\n  font-size: 11px;\n  line-height: 16px;\n}\n\n.dsh-collab-SubagentHeaderLineage-error {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  color: var(--dsw-alias-state-error-primary);\n}\n\n.dsh-collab-SubagentHeaderLineage-refresh {\n  display: inline-flex;\n  flex: none;\n  align-items: center;\n  gap: 3px;\n  padding: 3px 5px;\n  border: 0;\n  border-radius: var(--dsw-radius-sm);\n  background: transparent;\n  color: inherit;\n  cursor: pointer;\n}\n\n.dsh-collab-SubagentHeaderLineage-refresh svg {\n  width: 12px;\n  height: 12px;\n}\n\n@media (hover: hover) {\n  .dsh-collab-SubagentHeaderLineage-refresh:hover {\n    background: var(--dsw-alias-interactive-bg-hover);\n  }\n}\n"
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
          const membershipCall = (method, args) => {
            if (mountError) return Promise.reject(mountError)
            try { return unwrap(namespace()[method](...args)) } catch (error) { return Promise.reject(error) }
          }
          let candidatesInFlight = null
          const membership = {
            candidates: () => candidatesInFlight ?? (candidatesInFlight = membershipCall('membershipCandidates', []).finally(() => { candidatesInFlight = null })),
            convert: request => membershipCall('exchangeMembership', [parseExchangeRequest(request)]),
          }
          const callSettings = (method, args) => {
            const resolved = resolveRemote('remote.settings', isSettings)
            if (!resolved.service) return Promise.reject(resolved.error)
            try { return resolved.service[method](...args) } catch (error) { return Promise.reject(error) }
          }
          const settings = { describe: () => callSettings('describe', []), mutate: (...args) => callSettings('mutate', args) }
          const register = (name, spec, Component) => { disposers.push(ctx.slots.inject(name, () => ctx.slots.register({ name, locale: LOCALE, ...spec }, Component))) }
          register('plugins.bundle.config', { key: PACKAGE, inject: () => ({ readStatus: status, settings, remoteMountError: mountError, remoteDiagnosis: diagnosis }) }, BundleConfig)
          register('plugins.detail.badge', { id: 'collab-ui-status', order: 50 }, DetailBadge)
          register('plugins.detail.section', { id: 'collab-ui-status', order: 50 }, DetailSection)
          register('plugins.row.config', { key: CONTROL_SLOT_KEY, inject: () => ({ readStatus: status, settings }) }, EnhancementPage)
          const service = name => {
            const value = ctx.get(name)
            if (!value) throw new Error('Conversation service unavailable: ' + name)
            return value
          }
          const membershipProps = () => ({ membership, membershipT: ctx.locale.bind(LOCALE) })
          const panel = Component => props => {
            const [joining, setJoining] = React.useState(null)
            const rowApi = React.useMemo(() => ({ ...props.membership, openJoin: row => setJoining(row) }), [props.membership])
            React.useEffect(() => { setJoining(null) }, [props.sessionId])
            return h(React.Fragment, null, [
              h('style', { key: 'conversation-css' }, CONVERSATION_CSS), h(Component, { key: 'panel', ...props, membership: rowApi }),
              joining ? h(MembershipJoinDialog, { key: joining.targetId, row: joining, api: rowApi, t: props.membershipT, onClose: () => setJoining(null) }) : null,
            ])
          }
          register('conversation.session.header.actions', {
            id: 'agent-team', priority: -10, order: -20, locale: 'agent-team',
            inject: () => ({ ...membershipProps(), openTeammate(sessionId, childSessionId) {
              const sessions = service('sessions')
              const parentSessionId = sessions.binding(sessionId)?.session.getSnapshot().subagent?.address?.parentSessionId ?? sessionId
              if ((sessions.retainInfo(sessionId).getSnapshot().retainedBy.mainView ?? 0) === 0) return
              service('uiWorkspace').openSession(childSessionId === parentSessionId ? parentSessionId : { parentSessionId, childSessionId, mode: 'continuable' })
            } }),
          }, panel(CONVERSATION_PANELS.TeamAction))
          register('conversation.session.header.actions', {
            id: 'subagent-catalog', priority: -10, order: 10, locale: 'subagent',
            inject: () => ({ ...membershipProps(),
              openChild: address => service('uiWorkspace').openSession(address),
              openChildAside: address => service('sidebarRight').openResource('dsh-resource://subagentchat/session/' + encodeURIComponent(address.childSessionId) + '?' + new URLSearchParams({ parent: address.parentSessionId, mode: address.mode }), { kind: 'subagentchat', preferNewPane: true }),
              refreshProjection: parentSessionId => { void service('sessions').refreshProjections(parentSessionId) },
            }),
          }, panel(CONVERSATION_PANELS.SubagentCatalogAction))
          return release
        } catch (error) {
          await release()
          throw error
        }
      },
    }
  },
})
