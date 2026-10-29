# DSH Native Collab · 原生协作增强

**Deepseek Harness Agent 协作增强（基于原版插件）**：为 DeepSeek Harness (DSH) 提供子 Agent 沟通增强与 Team 模型选择支持，是派生自 DSH 的**非官方社区插件**（非官方发行版）。

[English](https://github.com/Sieuno/dsh-native-collab/blob/main/README.en.md) · [安装指南](https://github.com/Sieuno/dsh-native-collab/blob/main/docs/INSTALL.md) · [常见问题 (FAQ)](https://github.com/Sieuno/dsh-native-collab/blob/main/docs/FAQ.md) · [反馈](https://github.com/Sieuno/dsh-native-collab/issues)

---

## 支持的 DSH 版本

从 **0.3.1** 起，同一个插件包支持 DSH **0.2.1（自 rc.1 起）和 0.2.2 系列，含预发布版**；0.3.0 及更早版本仅支持 0.2.1 系列。插件要求 Node.js ≥22.19.0；使用 DSH 0.2.2 时还需满足宿主的 Node.js ≥24.9.0 要求。

## 安装与快速上手

在**你当前使用的 Profile** 下安装即可，无需先停止正在运行的实例（安装只向该 Profile 写入依赖）。把 `<profile>` 换成实际使用的 Profile 名（GUI 默认通常是 `web`）：

```sh
dsh plugin --profile <profile> add @sieuno/dsh-native-collab
```

启用/禁用插件后需重启DSH生效。

重启后进入插件管理页面：

- **修改自动保存**：页面中的各项设置修改后会自动保存，无需点击保存按钮；若保存未确认或失败，对应项旁将显示错误提示。
- **生效方式**：模型来源立即生效于后续的模型查询与创建；增强开关及连续自动唤醒轮数上限等启动配置，在按提示正常关闭服务并重启同一 Profile 后应用（单纯刷新网页不算重启）。
- **卸载与清理**：卸载前请先禁用插件，并重启同一 Profile 确认已恢复原生服务；若启动覆盖中仍有引用，直接卸载可能导致 DSH 找不到插件而启动失败。恢复步骤见[常见问题 (FAQ)](https://github.com/Sieuno/dsh-native-collab/blob/main/docs/FAQ.md)。
- **启动失败排查**：卸载或降级后若 DSH 无法启动，先检查 Profile 目录下的 `*.patch.json` 外部启动覆盖文件是否仍引用本插件，再清理 Profile patch 中的残留行；步骤见[常见问题 (FAQ)](https://github.com/Sieuno/dsh-native-collab/blob/main/docs/FAQ.md)。

## 主要功能

| 功能 | 说明 |
|---|---|
| 子 Agent 沟通增强 | 插件配置页提供增强主开关，并支持“工作中接收补充要求”与“允许继续已完成的子对话”；关闭增强后保留原生基础能力与权限规则。 |
| Team 与子 Agent 模型选择 | 统一提供三种模型来源：对话开始时设置的子模型列表、DSH 当前设置的子模型列表、当前 DSH 全部可用模型；后两者在每次查询或创建 Agent 时重新读取，并遵循模型适配器与权限校验。 |
| 连续自动唤醒轮数上限 | 默认 32 轮，由会话所有 Agent 共享，防止多 Agent 协作死循环；只统计无用户输入介入的连续自动唤醒，用户输入或进程重启即清零，子任务完成/停止的自动回报不受此限。 |

本插件提供的工具与原生客户端一致，但重写了工具实现。在不额外增加臃肿的工具注入下，极大提升了使用子会话/Subagent的舒适性。

## 使用建议

本插件适合原型开发、日常项目维护和个人开发等轻量协作场景。选择协作方案时，建议按任务间的依赖和协作复杂度，而非仅按项目规模判断：若需要更复杂的团队组织与工作流，可考虑 [dsh-agent-teams](https://github.com/NanmiCoder/dsh-agent-teams) 等更完整的协作方案。

插件沿用官方协作系统的任务指派与分工方式，增强现有工具，而不额外引入一套庞杂的工具。建议从一个能力较强的 **Lead + 多角色 Subagent** 开始，为各角色选择合适模型，并明确职责、输入、交付物与验收标准；需要长期命名成员、持续协作或共享任务板时，再使用 Team。欢迎在讨论区分享实践心得！

## 运行与适配机制

插件 patch 只插入一个管理入口，由其统一管理三个后台服务。三个原生根服务与管理入口状态互斥：入口启用时运行增强托管服务；关闭入口后重启DSH即可恢复原生服务。

四个协作工具针对四种已知 AgentPreset 在内存中按模块身份与 ID 动态适配，不修改或锁定用户原有预设文件，亦不影响未知自定义 provider。

服务切换通过 DSH 的 Profile patch 机制完成，而非由本插件追加 `--override` 启动参数。管理入口启用时，patch 会禁用对应的三个原生根服务，避免与增强服务重复运行；官方实验包的四个根层工具仍保持禁用。若本机启动器另行生成外部启动覆盖文件，应按 FAQ 检查其中是否有残留引用。

## 开发与许可

[开发说明](https://github.com/Sieuno/dsh-native-collab/blob/main/CONTRIBUTING.md) · [测试说明](https://github.com/Sieuno/dsh-native-collab/blob/main/TESTING.md) · [更新日志](https://github.com/Sieuno/dsh-native-collab/blob/main/CHANGELOG.md)。

本项目源自 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)，遵循 [MIT License](https://github.com/Sieuno/dsh-native-collab/blob/main/LICENSE)，保留版权与 NOTICE 说明；上游来源与第三方声明见 [UPSTREAM.md](https://github.com/Sieuno/dsh-native-collab/blob/main/UPSTREAM.md) 与 [THIRD_PARTY_NOTICES.md](https://github.com/Sieuno/dsh-native-collab/blob/main/THIRD_PARTY_NOTICES.md)。
