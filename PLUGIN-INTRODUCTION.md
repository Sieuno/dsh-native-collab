# DSH Native Collab · 原生协作增强

**让 DSH 的 Agent Team 更灵活：灵活选择模型，增强父子对话通信。

Flexible Agent Teams and model selection for DSH, with enhanced communication between parent and child conversations.**

这是基于 DSH 原生协作模块派生的非官方社区插件，不是一个集中管理任务的调度面板。

- 更灵活的 Team 协作与模型选择。
- 增强父子对话通信，支持运行中引导和完成后续聊，仍受原有权限和会话规则约束。
- 插件自己的切换确认入口，以及持久化的 Team 请求次数限制。

版本范围：DSH 0.2.1 系列，从 rc.1 起。rc.2 有完整隔离外测；rc.1/rc.3 做过相关源码核对及隔离启停卸载验证，其他同系列版本按预期兼容提供，不冒称都已实测。

安装不自动接管，保存也不即时改变运行中的 Agent。通过插件自己的总开关确认后，要完整重启。关闭固定启用五项原生，不恢复历史状态；preset 副本留存，旧 Team 用量不补满；卸载前先关闭、确认，再停服务后 Remove。

先看[首页](README.md)，再按[安装说明](docs/INSTALL.md)操作。具体覆盖范围见[测试说明](TESTING.md)。
