window.__ModuleLoader__.load({
  id: '@sieuno/dsh-native-collab',
  factory(require) {
    const React = require('react')
    const { Button, Modal } = require('@deepseek-ai/dsh-client-ui-primitives')
    const h = React.createElement
    const PACKAGE = '@sieuno/dsh-native-collab'
    const LOCALE = 'collabUi'
    // Replaced from the packaged dictionaries by emit-dist; no network locale lookup.
    const UI_LOCALES = {"en":{"title":"Collaboration component diagnostics","summary":"Child-agent communication, Team model selection, and consecutive automatic wake-up limit.","loading":"Loading current status…","profile":"Profile","hmr":"Development reload","on":"On","off":"Off","component":"Component","currentState":"Current state","sourceLayer":"Source layer","runtimePhase":"Runtime phase","derivedKind":"Plugin component","statusPlaceholder":"This component does not run standalone; tools are loaded on demand with conversations.","statusRootScope":"This read-only table shows root components, not feature toggles. Control, list, spawn, and fork tools load with AgentPresets; off at root is normal. Do not enable them just to make every row green.","statusReadOnly":"Diagnostics do not change settings or prove tool availability in every chat.","current":"Current","desired":"Desired","pendingRestart":"Pending restart","operationError":"Write status","source":"Source layer","note":"Runtime note","unchanged":"No change requested","transactionUnavailable":"Settings cannot be saved safely right now. Refresh settings and retry.","unknown-pending":"Unknown — not written","enabled":"Enabled","disabled":"Disabled","unknown":"Unknown","sourceUnknown":"This root inventory cannot identify the entry source.","unknownNotice":"Some current settings could not be determined.","unknownStructure":"The component inventory is incomplete or its source is unrecognized. Current state is unconfirmed.","statusError":"Unable to confirm component status. Please refresh. If this persists, keep the error code and diagnostics for troubleshooting.","capabilityImpact":"Enable child-agent and Team enhancements separately in plugin settings. Turning enhancements off does not remove permissions or conversations.","lifecycleTitle":"Uninstall and recovery","lifecycleBadge":"Uninstall notes","lifecycleInstall":"After installation the management entry loads background services automatically, and enhancement settings save as you change them. Changes that need a restart apply after you restart the same working profile normally.","lifecycleCore.subagent":"This service starts with the management entry; it is not a feature toggle. Change enhancements in plugin settings and restart after saving.","lifecycleCore.control":"This is an AgentPreset tool, not a root background service. Verify it in an actual chat.","lifecycleCore.listAgents":"This is an AgentPreset tool, not a root background service. Verify it in an actual chat.","lifecycleCore.agentTeam":"This service starts with the management entry; it is not a feature toggle. Change enhancements in plugin settings and restart after saving.","lifecycleCore.teamTools":"This service starts with the management entry; it is not a feature toggle. Change enhancements in plugin settings and restart after saving.","lifecycleRemove":"Wait for running tasks to finish, then disable or uninstall the plugin and restart the current working profile. If it no longer starts after uninstalling or after a failed uninstall, follow the project FAQ and the plugin notes to recover manually: inspect the external startup override files in the Profile directory, then remove or correct them as described and start again.","lifecycleSidecar":"Uninstalling keeps conversations and logs. The consecutive automatic wake-up counter lives only in process memory and resets on restart.","readOnlyBadge":"Status only","row.dsh-native-collab-subagent":"Child Agent runtime","row.dsh-native-collab-tool-subagent-control":"Child Agent messaging","row.dsh-native-collab-tool-subagent-list-agents":"Child Agent listing","row.dsh-native-collab-agent-team":"Team runtime","row.dsh-native-collab-tool-agent-team":"Team tools","row.dsh-native-collab-tool-subagent":"Start an independent child Agent","row.dsh-native-collab-tool-subagent-fork":"Start a child Agent with conversation context","phase.active":"Running","phase.failed":"Failed","phase.pending":"Pending","phase.loading":"Loading","phase.unloading":"Unloading","settingsSummary":"Subagent settings, communication, Team enhancements and automatic wake-ups","settingsScope":"Settings load automatically and valid changes save automatically. Subagent settings share the original DSH configuration. Model source applies to subsequent queries and creation; restart-required enhancements apply after restarting this Profile.","savedState":"Saved","observedState":"Startup snapshot","pendingState":"Compared with startup","restartRequired":"Settings saved. Options requiring a restart take effect after restarting the Profile, without interrupting ongoing chats.","modelEnhancement":"Enable Team enhancements","communicationEnhancement":"Enable child-agent communication enhancements","nativeModelSelectionCompatibility":"Model list source","modelSource":"Model list source","modelSourceConversation":"Child-model list captured when the conversation started (native setting)","modelSourceSettings":"Child-model list in current DSH settings","modelSourceAll":"All models currently available in DSH","autoSaveDescription":"Changes save automatically, with status or errors beside the affected section. No manual reload or save button is needed.","autoSaving":"Saving…","autoSaved":"Saved automatically","autoSaveFailed":"Automatic save failed","nativeCompatNote":"This changes how candidate models are listed, not model permissions. It also affects ordinary child Agents.","communicationOffNote":"Turning enhancements off does not disable native messaging or stop running tasks.","quotaRemains":"Default limit is 32 consecutive automatic wake rounds, shared by all Agents associated with the session. Only uninterrupted automatic cross-session wake-ups and messages without user input are counted. Any human input in a related session resets the count. Completion and stop reports to the direct parent or Lead are exempt. The counter is in memory and resets on process restart.","saveModel":"Save Team settings","saveCommunication":"Save communication settings","modalCancel":"Cancel","write.saved-pending-restart":"This setting was saved. Changes requiring a restart apply after a normal Profile restart without interrupting the current chat.","write.settings-missing":"The settings target could not be verified; no save was sent. Keep your draft and reload settings. If it persists, provide versions and the safe error code.","write.settings-unverified":"The settings target could not be verified; no save was sent. Keep your draft and reload settings. If it persists, provide versions and the safe error code.","write.namespace-unverified":"The settings target could not be verified; no save was sent. Keep your draft and reload settings. If it persists, provide versions and the safe error code.","write.revision-missing":"The settings target could not be verified; no save was sent. Keep your draft and reload settings. If it persists, provide versions and the safe error code.","write.not-writable":"Settings are read-only or write access is unverified. No save was sent. Check the selected Profile and its edit permissions.","write.settings-unavailable":"Settings have not finished verification and cannot be saved yet. Reload settings if this persists.","write.rejected":"The save result is unconfirmed; changes may or may not have been written. Keep your draft and reload settings to check saved values before proceeding.","write.write-unconfirmed":"The save was sent, but the read-back value differs from this change. Success is unconfirmed. Keep the change and reload settings to check.","write.conflict":"Settings were updated elsewhere; this save was not accepted. Keep your draft, reload the latest settings, and review before saving again.","write.empty":"No changes to save in this group.","write.field-rejected":"Invalid input; no save was sent. Toggles must be on or off, and the consecutive automatic wake-up limit must be a valid positive integer.","settingsTitle":"Collaboration enhancements","runningChildGuidance":"Accept additional instructions while a child Agent works","completedChildContinuation":"Allow continuing completed child conversations","teamRequestLimit":"Consecutive automatic wake-up limit","quotaUsageUnknown":"There is no live counter on this page. The in-memory count is shared by all Agents associated with the session and resets on human input in any related session or when the process restarts.","progressTitle":"Progress and results","progressScope":"No switch is needed for progress and results. Open the relevant chat or Team panel; this page has no live task view.","progressEntry":"How to view progress and results","progressTeam":"Team tasks: return to the originating conversation and open Team at the top. Inspect members, messages, and shared tasks; select a member to open its conversation.","progressChild":"Independent child Agents: open the child-agent task card in the originating conversation to inspect its status and returned result.","progressAction":"Add instructions in the originating conversation. To stop work, use that conversation's Stop action. Changing these settings does not stop or restart tasks.","saveQuota":"Save wake-up limit","unset":"Not set","pendingRestartYes":"Some settings are waiting for a restart.","same":"Matches startup snapshot","modalPresetUnknown":"Verify preset tools in an actual chat. This table does not verify external overlays or all presets.","communicationTitle":"Child-agent communication","teamTitle":"Team enhancements","teamDescription":"More flexible model selection for Team members. The same selection setting also affects ordinary child Agents. It does not grant access to additional models.","selectionLive":"Use currently available models","selectionSnapshot":"Use the model list from the conversation start","quotaTitle":"Consecutive automatic wake-up limit","quotaValidation":"Enter a positive safe integer. Zero, negatives, decimals, and out-of-range numbers are not supported.","settingsDiagnostics":"Advanced diagnostics: saved and current settings","technicalDetails":"Technical details","refreshSettings":"Refresh settings","write.refreshed":"Settings reloaded. Unsaved drafts remain on this page.","settingsLoading":"Loading settings. Editing will be available after verification.","defaultValue":"Default: {value}","settingsUnavailable":"Settings cannot be read or edited yet. See the specific reason.","write.refresh-failed":"Settings could not be reloaded and verified. Drafts remain on this page and saving is locked. Keep a copy of your draft; reloading the entire page may discard unsaved edits.","write.status-refresh-failed":"Settings reloaded and drafts were kept, but runtime status is unconfirmed; this does not prove a service failure. You can edit settings and refresh runtime status later.","runtime":{"title":"Current runtime","native":"Native services selected","managed":"Enhanced background services ready","legacy-mixed":"Conflicting configuration; review required","unknown":"Runtime status unconfirmed","failed":"Enhanced startup or cleanup failed","loading":"Starting enhanced background services","details":"Internal service status","nativeNote":"Enhanced background services are not attached. Check that the management entry is enabled, save the desired enhancements, and restart this Profile; do not enable internal components individually.","phase":{"active":"Running","failed":"Startup or cleanup error","pending":"Pending","loading":"Loading","unloading":"Unloading","not-requested":"Not requested (not a failure)","ready":"Ready","disposing":"Stopping","disposed":"Stopped"},"role":{"subagent":"Child Agent service","subagent-control":"AgentPreset: child Agent control","subagent-list":"AgentPreset: child Agent list","agent-team":"Team service","team-tools":"Team tools"},"mixed":"Conflicting configuration; review required","readyNote":"This confirms background services only, not tool availability in all AgentPresets. Verify tools in an actual chat.","failure":{"ownership-unverified":"Runtime assembly conflicts with another component or its inventory is unavailable. Enhanced services were not started. Keep the safe code and review overrides; see the project FAQ for legacy manual configuration rather than toggling internal components.","plugin-start-failed":"An enhanced service could not start. Keep the version, affected role, and safe error code. If disabling the plugin, finish tasks first and restart this Profile afterwards.","plugin-cleanup-failed":"Service cleanup is unconfirmed. Do not switch or uninstall yet. Verify that this Profile’s host processes have fully stopped and retain redacted diagnostics.","unknown":"This service state is unconfirmed. Keep its role and safe error code for diagnosis; do not assume it stopped safely."}},"phase":{"not-requested":"Not started","ready":"Ready","disposing":"Stopping","disposed":"Stopped"},"refreshRuntime":"Refresh runtime status","write":{"saved-pending-restart":"Setting saved. Options requiring a restart will take effect after restarting the Profile, without interrupting ongoing chats.","settings-missing":"The settings target could not be verified; no save was sent. Keep your draft and reload settings.","settings-unverified":"The settings target could not be verified; no save was sent. Keep your draft and reload settings.","namespace-unverified":"The settings namespace could not be verified; no save was sent. Keep your draft and reload settings.","revision-missing":"The revision could not be verified; no save was sent. Keep your draft and reload settings.","not-writable":"Settings are read-only or permission is denied. Check the selected Profile and edit permissions.","settings-unavailable":"Settings are not ready yet. Please refresh and retry.","rejected":"Save result could not be confirmed. Please keep your draft, refresh settings, and review before retrying.","write-unconfirmed":"Save was sent, but verification value differs. Please refresh settings to check.","conflict":"Settings were updated elsewhere; this save was not accepted. Please refresh to load latest settings before saving.","empty":"No changes to save in this group.","field-rejected":"Invalid input; no save was sent. Toggles must be on/off, and wake-up limit must be a positive integer.","refreshed":"Settings refreshed; unsaved drafts remain on this page.","refresh-failed":"Failed to refresh settings; drafts are kept. Please back up drafts before retrying.","status-refresh-failed":"Settings refreshed and drafts kept; runtime status is unconfirmed but does not indicate failure. You can continue editing."},"diagnosis.remote-unavailable":"The plugin page cannot reach the collaboration service right now. Restart the app and reopen this page; if it still fails, follow the plugin notes and the project FAQ to recover.","diagnosis.unknown":"The action did not complete. Expand the technical details for the diagnostic code, then follow the plugin notes and try again.","limits":{"title":"Subagent settings","depth":"Maximum recursion depth","capacity":"Subagent parallelism limit","help":"The native Subagent settings page is unavailable while this plugin is enabled, so this section edits those settings on its behalf. Changes are written to the original DSH Subagent configuration; changes made there also affect this plugin. With recursion depth 0, subagents cannot create subagents. Existing multi-level subagents are not stopped.","saved":"Saved automatically and synchronized with the original DSH Subagent settings.","invalid":"Depth must be a whole number of 0 or more; parallelism must be a whole number of 1 or more. Both must be within the safe integer range.","readonly":"The native configuration is overridden or its write target cannot be confirmed. Limits are read-only.","unavailable":"Subagent settings could not be loaded and verified automatically. Editing is locked; reopen the plugin settings page to try again.","conflict":"The configuration changed elsewhere; this change was not saved and your draft is kept. Keep a copy of your draft and reopen the plugin settings page to review the latest values.","saveFailed":"Automatic save could not be confirmed; your draft is kept. Keep a copy of your draft and reopen the plugin settings page to check saved values before retrying."}},"zh":{"title":"协作组件状态诊断","summary":"子 Agent 沟通、Team 模型选择及连续自动唤醒轮数上限。","loading":"正在读取当前状态…","profile":"工作配置","hmr":"开发时自动重载","on":"开启","off":"关闭","component":"组件","currentState":"当前启用状态","sourceLayer":"来源层","runtimePhase":"运行阶段","derivedKind":"插件组件","statusPlaceholder":"该组件不单独运行，实际工具将在对话建立时按需加载。","statusRootScope":"此表只读显示根级组件，不是功能开关。控制、列表、启动和继承会话四项工具随会话预设加载，在根级关闭属于正常现象，无需为追求全绿而开启它们。","statusReadOnly":"诊断不会修改设置，也不能证明所有会话工具可用。","unknown-pending":"未知 — 尚未写入","current":"当前状态","desired":"目标状态","pendingRestart":"待重启状态","operationError":"写入状态","source":"来源层","note":"运行备注","unchanged":"未请求更改","transactionUnavailable":"暂时无法安全保存，请刷新设置后重试。","enabled":"已启用","disabled":"已禁用","unknown":"未知","sourceUnknown":"根级清单无法确认此项来源。","unknownNotice":"部分当前配置无法确定。","unknownStructure":"组件清单不完整或来源无法识别，当前状态未确认。","statusError":"暂无法获取组件状态，请刷新重试。若持续失败，请查看错误码与诊断详情。","capabilityImpact":"子 Agent 和 Team 的增强功能可在设置中独立开启。关闭增强不会取消原有权限限制，也不会删除会话记录。","lifecycleTitle":"卸载与恢复说明","lifecycleBadge":"卸载须知","lifecycleInstall":"安装后由管理入口自动加载后台服务，增强设置修改后自动保存；需要重启的更改在正常重启同一工作配置后生效。","lifecycleCore.subagent":"此后台随管理入口启动，不是独立功能开关。启停增强请使用插件设置，并在保存后正常重启。","lifecycleCore.control":"此项属于会话预设工具，不是根级后台服务。请在实际对话中核对。","lifecycleCore.listAgents":"此项属于会话预设工具，不是根级后台服务。请在实际对话中核对。","lifecycleCore.agentTeam":"此后台随管理入口启动，不是独立功能开关。启停增强请使用插件设置，并在保存后正常重启。","lifecycleCore.teamTools":"此后台随管理入口启动，不是独立功能开关。启停增强请使用插件设置，并在保存后正常重启。","lifecycleRemove":"先等待运行中的任务结束，再停用或卸载插件并重启当前工作配置。若卸载或错误卸载后无法启动，请按项目 FAQ 与插件说明手工恢复：检查 Profile 目录中的外部启动覆盖文件，按说明移除或修正后重新启动。","lifecycleSidecar":"卸载不会删除对话或日志。连续自动唤醒计数仅存储在进程内存中，重启后自动清零。","readOnlyBadge":"仅状态","row.dsh-native-collab-subagent":"子 Agent 运行服务","row.dsh-native-collab-tool-subagent-control":"子 Agent 消息控制","row.dsh-native-collab-tool-subagent-list-agents":"子 Agent 列表工具","row.dsh-native-collab-agent-team":"Team 运行服务","row.dsh-native-collab-tool-agent-team":"Team 协作工具","row.dsh-native-collab-tool-subagent":"启动独立子 Agent","row.dsh-native-collab-tool-subagent-fork":"继承会话启动子 Agent","phase.active":"运行中","phase.failed":"失败","phase.pending":"待处理","phase.loading":"加载中","phase.unloading":"卸载中","settingsSummary":"子智能体设置、沟通、Team 增强与自动唤醒","settingsScope":"本页自动读取设置，合法修改后自动保存。子智能体设置与原 DSH 共用同一份配置；模型来源用于后续查询与创建，需重启的增强选项在重启当前工作配置后应用。","savedState":"已保存","observedState":"本次启动时采用","pendingState":"与启动值比较","restartRequired":"设置已保存。需要重启的选项将在当前任务结束后重启同一工作配置时生效，不会中断已有对话。","modelEnhancement":"启用 Team 增强","communicationEnhancement":"启用子 Agent 沟通增强功能","nativeModelSelectionCompatibility":"可选模型来源","modelSource":"可选模型来源","modelSourceConversation":"对话开始时设置的子模型可用列表（原生设置）","modelSourceSettings":"DSH当前设置的子模型可用列表","modelSourceAll":"当前DSH所有可用模型","autoSaveDescription":"修改后自动保存，保存状态或错误会显示在对应区域。无需手动读取或点击保存按钮。","autoSaving":"正在保存…","autoSaved":"已自动保存","autoSaveFailed":"自动保存失败","nativeCompatNote":"仅改变候选模型列表的读取方式，不增加模型访问权限；此策略也影响普通子 Agent。","communicationOffNote":"关闭增强不影响原生消息传递，也不会中断运行中的任务。","quotaRemains":"默认上限为 32 轮连续自动唤醒，由会话所有 Agent 共享。仅对无人工干预的连续跨会话自动唤醒与消息计数；任一关联会话收到用户输入即自动清零。向直属父级或 Team Lead 汇报任务完成或停止结果不计入。计数存储于内存中，进程重启后自动清零。","saveModel":"保存 Team 设置","saveCommunication":"保存沟通设置","modalCancel":"取消","write.saved-pending-restart":"此项设置已保存。需重启的更改会在正常重启同一工作配置后应用，当前对话不会因此中断。","write.settings-missing":"无法核实设置保存目标，本次未发起保存。请保留草稿并重新读取设置；若持续失败，请提供版本与安全错误码。","write.settings-unverified":"无法核实设置保存目标，本次未发起保存。请保留草稿并重新读取设置；若持续失败，请提供版本与安全错误码。","write.namespace-unverified":"无法核实设置保存目标，本次未发起保存。请保留草稿并重新读取设置；若持续失败，请提供版本与安全错误码。","write.revision-missing":"无法核实设置保存目标，本次未发起保存。请保留草稿并重新读取设置；若持续失败，请提供版本与安全错误码。","write.not-writable":"当前设置只读或尚未确认可写，本次未发起保存。请核对所选工作配置和编辑权限。","write.settings-unavailable":"设置尚未完成核验，暂不能保存。若持续未就绪，请重新读取设置。","write.rejected":"保存结果未能确认，不能确定是否已写入。请先保留草稿并重新读取设置，核对已保存值后再操作。","write.write-unconfirmed":"保存已发出，但重新读取的值与此项修改不一致，暂不能确认保存成功。请保留修改并重新读取设置后核对。","write.conflict":"设置已被其他操作更新，本次未保存。请先保留草稿，再重新读取最新设置并核对后保存。","write.empty":"本组没有待保存的修改。","write.field-rejected":"输入值无效，本次未发起保存。开关须为开启或关闭，连续自动唤醒轮数上限须为有效正整数。","settingsTitle":"协作增强","runningChildGuidance":"子 Agent 工作中可接收补充要求","completedChildContinuation":"允许继续已完成的子对话","teamRequestLimit":"连续自动唤醒轮数上限","quotaUsageUnknown":"本页不显示实时计数。计数存储于进程内存中由会话所有 Agent 共享；任一相关会话收到人类输入或进程重启后即清零。","progressTitle":"进度与结果","progressScope":"进度与结果无需在此开启，请回到对应对话或 Team 面板查看。本页不展示实时任务状态。","progressEntry":"查看进度与结果的方法","progressTeam":"Team 任务：回到发起任务的对话，在对话顶部打开 Team 面板，查看成员状态、消息和共享任务；点击成员可打开对应对话。","progressChild":"独立子 Agent：打开原对话中的子 Agent 任务卡片，查看执行状态和返回结果。","progressAction":"需要补充要求时回到发起任务的对话；如需停止任务，使用对应对话的停止操作。修改此页设置不会停止或重启任务。","saveQuota":"保存唤醒轮数上限","unset":"未设置","pendingRestartYes":"有设置等待重启生效。","same":"与本次启动值一致","modalPresetUnknown":"会话预设工具请在实际对话中核对；本表不验证外部覆盖或全部预设。","communicationTitle":"子 Agent 沟通","teamTitle":"Team 增强","teamDescription":"让 Team 成员更灵活地选择模型；同一模型选择设置也影响普通子 Agent。不会获得额外的模型访问权限。","selectionLive":"使用当前可用模型","selectionSnapshot":"沿用对话开始时的模型列表","quotaTitle":"连续自动唤醒轮数上限","quotaValidation":"请输入大于0且在安全范围内的整数，不支持小数、负数或超大数值。","settingsDiagnostics":"高级诊断：保存状态与当前状态","technicalDetails":"技术详情","refreshSettings":"刷新设置","write.refreshed":"设置已重新读取，未保存的草稿仍保留在当前页面。","settingsLoading":"正在读取设置，完成核验后即可编辑。","defaultValue":"默认：{value}","settingsUnavailable":"暂不能读取或修改设置，请查看具体原因。","write.refresh-failed":"未能重新读取并核验设置，已保留当前页面草稿并暂时锁定保存。请先备份草稿；刷新整个网页可能丢失未保存的修改。","write.status-refresh-failed":"设置已重新读取，草稿仍保留；后台运行状态暂无法确认，不代表服务已发生故障。可继续编辑设置，稍后刷新运行状态。","runtime":{"title":"当前运行状态","native":"当前采用原生服务","managed":"增强后台已就绪","legacy-mixed":"检测到冲突配置，需核对","unknown":"运行状态暂无法确认","failed":"增强后台启动或停止异常","loading":"正在启动增强后台","details":"内部服务状态","nativeNote":"当前增强后台尚未接入。请确认管理入口已开启，保存所需增强后重启同一工作配置；不要逐个开启内部组件。","phase":{"active":"运行中","failed":"启动或停止异常","pending":"待处理","loading":"加载中","unloading":"卸载中","not-requested":"未请求启动（非故障）","ready":"已就绪","disposing":"停止中","disposed":"已停止"},"role":{"subagent":"子 Agent 服务","subagent-control":"会话预设：子 Agent 控制","subagent-list":"会话预设：子 Agent 列表","agent-team":"Team 服务","team-tools":"Team 协作工具"},"mixed":"检测到冲突配置，需核对","readyNote":"这里只确认后台服务，不能证明所有会话预设工具可用；请在实际对话中核对。","failure":{"ownership-unverified":"后台装配存在冲突或组件清单不可用，增强后台未启动。请保留错误码并核对覆盖配置；旧版手工配置的处理见项目 FAQ，不要逐个切换内部组件。","plugin-start-failed":"增强后台未能启动，原因需进一步核对。请保留版本、受影响服务名称和安全错误码；如需停用插件，先结束任务并在停用后重启同一工作配置。","plugin-cleanup-failed":"服务停止结果未确认。请勿继续切换或卸载，先核实同一工作配置的宿主进程已完全停止，并保留脱敏诊断。","unknown":"此服务状态未能确认，请保留服务名称与安全错误码供排查，不要假定已安全停止。"}},"phase":{"not-requested":"未启动","ready":"已就绪","disposing":"停止中","disposed":"已停止"},"refreshRuntime":"刷新运行状态","write":{"saved-pending-restart":"设置已保存。需重启的选项将在重启当前工作配置后生效，不会中断正在进行的对话。","settings-missing":"无法验证设置保存目标，本次未提交。请刷新设置后重试；若持续失败，请查看安全错误码。","settings-unverified":"无法验证设置保存目标，本次未提交。请刷新设置后重试；若持续失败，请查看安全错误码。","namespace-unverified":"无法验证命名空间，本次未提交。请刷新设置后重试；若持续失败，请查看安全错误码。","revision-missing":"版本信息校验未通过，本次未提交。请刷新设置后重试；若持续失败，请查看安全错误码。","not-writable":"当前设置只读或暂无写入权限，本次未保存。请核对工作配置与文件权限。","settings-unavailable":"设置尚未就绪，暂无法保存。请稍后刷新重试。","rejected":"保存结果未确认。请先保留当前草稿并刷新设置，核对已保存内容后再试。","write-unconfirmed":"设置已提交，但读取校验不一致，无法确认是否成功。请刷新设置进行核对。","conflict":"设置已被其他操作修改，本次未保存。请刷新获取最新设置后再行修改。","empty":"当前没有任何更改需要保存。","field-rejected":"输入值无效：开关须为开启或关闭，连续自动唤醒上限须为有效正整数。","refreshed":"设置已重新读取，未保存的草稿仍保留在当前页面。","refresh-failed":"未能重新读取设置，已保留当前草稿并锁定保存。请先备份草稿后重试。","status-refresh-failed":"设置已重新读取并保留草稿；运行状态暂无法确认，可继续编辑设置并稍后刷新运行状态。"},"diagnosis.remote-unavailable":"插件界面暂时无法连接协作服务。请重启应用后重新打开本页；若仍失败，请参考插件说明与项目 FAQ 中的恢复步骤。","diagnosis.unknown":"操作未能完成。请展开技术详情查看诊断码，并按插件说明处理后重试。","limits":{"title":"子智能体设置","depth":"最大递归深度","capacity":"子智能体并行数量上限","help":"因启用本插件时，原生子智能体设置页无法正常使用，此处提供代理设置。修改会同步到原 DSH「子智能体」设置，原区域的设置也会影响本插件。递归深度设为 0 时，子智能体将无法创建子智能体。已有的多级子代理不会因此停止。","saved":"已自动保存，并同步到原 DSH「子智能体」设置。","invalid":"递归深度须为不小于 0 的整数，并行上限须为不小于 1 的整数，均须在安全整数范围内。","readonly":"原生配置受到覆盖，或尚无法确认写入目标，当前运行限制为只读。","unavailable":"未能自动读取并核验子智能体设置，暂时锁定编辑。请重新打开插件设置页后再试。","conflict":"设置已被其他操作修改，本次修改未保存，草稿仍保留。请先保留草稿，重新打开插件设置页核对最新值。","saveFailed":"自动保存结果未确认，草稿仍保留。请先保留草稿，重新打开插件设置页核对已保存值后再试。"}}}
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
      const sequence = React.useRef(0), draft = React.useRef({ depth: '', capacity: '' })
      const fields = { depth: 'maxDepth', capacity: 'maxActiveSubagents' }
      const integer = (text, minimum) => /^(0|[1-9]\d*)$/.test(text) && Number.isSafeInteger(Number(text)) && Number(text) >= minimum
      const validDraft = () => integer(draft.current.depth, 0) && integer(draft.current.capacity, 1)
      const load = async () => {
        if (dirty.current.size || draining.current) return
        setState(old => ({ ...old, loading: true, error: null, saved: false }))
        try {
          const view = limitsViewSchema().parse(await readLimits())
          if (!alive.current) return
          draft.current = { depth: String(view.values.maxDepth), capacity: String(view.values.maxActiveSubagents) }
          setState(old => ({ ...old, ...draft.current, view, loading: false }))
        } catch { if (alive.current) setState(old => ({ ...old, view: null, loading: false, error: 'unavailable' })) }
      }
      React.useEffect(() => {
        alive.current = true
        void load()
        const onFocus = () => { void load() }
        window.addEventListener?.('focus', onFocus)
        return () => { alive.current = false; queue.current = null; window.removeEventListener?.('focus', onFocus) }
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
