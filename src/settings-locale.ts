/** Descriptions consumed by the official schema form; no custom settings UI is mounted. */
export const SETTINGS_LOCALES = {
  en: {
    modelEnhancement: 'Legacy model switch, retained only to interpret saved model preferences. Use modelSource for new selections.',
    communicationEnhancement: 'Retired compatibility field; messaging always follows the official runtime.',
    modelSource: 'Model source for new subagents: conversation (default, uses current session authorization), settings (reads configured child models), or all (allows any registered provider). Validated by official adapters.',
    runningChildGuidance: 'Retired compatibility field; running children use official messaging behavior.',
    completedChildContinuation: 'Retired compatibility field; idle children use official continuation behavior.',
    teamRequestLimit: 'Shared automatic message allowance across the agent tree (default: 32). Resets on user input, refunded on delivery failure, and official completion notices do not count.',
    delegationGuidance: 'Retired compatibility field; practical delegation guidance is always enabled.',
    runtimeMode: 'Legacy configuration kept for migration compatibility. The official runtime always powers collaboration.',
    nativeModelSelectionCompatibility: 'Legacy fallback when modelSource is unset: true uses session authorization; false uses current settings.',
  },
  zh: {
    modelEnhancement: '旧版模型开关，仅用于读取已保存的模型偏好。新选择统一使用 modelSource。',
    communicationEnhancement: '已停用的兼容字段；消息通信始终沿用官方运行时。',
    modelSource: '子 Agent 模型来源：conversation（默认，沿用当前会话授权）、settings（读取设置中的可用子模型列表）、all（允许调用所有已注册提供方的可用模型）。最终可用性均由官方适配器校验。',
    runningChildGuidance: '已停用的兼容字段；运行中子 Agent 的通信沿用官方行为。',
    completedChildContinuation: '已停用的兼容字段；空闲子 Agent 的继续执行沿用官方行为。',
    teamRequestLimit: '协作树内所有 Agent 共享的自动消息次数上限（默认 32 次）。用户发送新消息时自动重置，发送失败退还额度，官方任务完成通知不计入。',
    delegationGuidance: '已停用的兼容字段；实用委派提示词增强始终启用。',
    runtimeMode: '旧版配置项，仅用于平滑迁移。新版协作完全由官方底层运行时接管。',
    nativeModelSelectionCompatibility: '旧版兼容项：未配置 modelSource 时的回退规则（true 沿用会话授权，false 读取当前设置）。',
  },
}
