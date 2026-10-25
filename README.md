# DSH Native Collab · 原生协作增强

让 DSH 的 Agent Team 更灵活：灵活选择模型，增强父子对话通信。

这是基于 DeepSeek Harness 原生协作模块修改的**非官方社区插件**，不是 DeepSeek 官方发行版，也不是另一个聊天客户端。

**当前版本：0.2.0，社区预发布。预期兼容 DSH 0.2.1 系列，从 `0.2.1-rc.1` 起。**

[安装与使用](docs/INSTALL.md) · [常见问题](docs/FAQ.md) · [测试情况](TESTING.md) · [版本说明](RELEASE.md) · [开发说明](CONTRIBUTING.md)

## 它解决什么问题

重点是更灵活的 Team、灵活选择模型，以及增强父子对话通信。设置页和请求配额是配套能力，不是任务调度管理平台。

- **灵活选择模型**：可以保留原生的模型选择快照，也可以按当前宿主允许的模型列表选择。
- **增强父子对话通信**：支持运行中引导、完成后续聊，仍受原有权限和会话规则约束。
- **Team 请求上限**：给每个 Team 限制请求次数，默认 32 次；记录会保留，重启不会把用量清零。
- **切换前看清楚**：先列出哪些组件、哪些 Agent 配置会被替换，确认后才保存；不是装上就接管。

这里的“原生”指代码来自 DSH 原生协作模块，**不表示本插件由官方提供**。请求上限计的是请求次数，不是人民币金额，也不是 token 上限。

## 安装前先知道这三件事

1. **关闭插件，不等于还原安装前的样子。**关闭总开关会固定启用五个原生协作组件，即使它们安装前原本禁用；同时清除本插件受管偏好。
2. **部分配置副本会留下来。**启用时会把相关 Agent 预设（preset）的完整配置复制到当前 Profile。关闭后只换回原生模块，不删除副本；以后升级 DSH，可能需要重新核对这些配置。
3. **卸载前要先关闭插件自己的总开关。**不能直接点 DSH 的 Remove；否则可能留下引用已删除插件的配置，导致会话无法启动。插件不会拦截官方 Remove。

已有会话和 Team 用量记录不会被本插件删除。改变请求上限只影响之后新建的 Team，旧 Team 继续使用原上限与已用次数。

## 怎么安装

先看[完整安装说明](docs/INSTALL.md)：它包含备份、原生 Team 组件准备，以及本插件要求的关闭热重载步骤。

在版本和前提都符合后，从本仓库 **Releases → v0.2.0 → Assets** 下载 `dsh-native-collab-derived-0.2.0.tgz`。不要把 GitHub 自动生成的 Source code ZIP 当成安装包。

可直接从本版 Release 安装（以下示例使用 `web`，名称不是兼容限制）：

```sh
dsh plugin --profile web add https://github.com/Sieuno/dsh-native-collab/releases/download/v0.2.0/dsh-native-collab-derived-0.2.0.tgz
```

也可下载后进入文件所在目录安装：

```sh
dsh plugin --profile web add ./dsh-native-collab-derived-0.2.0.tgz
```

然后按安装说明启动对应 Profile，在左侧“插件”里打开本插件，用**插件自己的总开关**查看变更并确认，再停止相关 Host/Agent、完整重启。

**装上 ≠ 已切换；保存成功 ≠ 当前 Agent 已生效。**不要手工逐个打开那七个派生组件开关；两个普通工具占位行本来就应保持关闭。

## 日常使用

![中文界面：五项派生组件运行，两个工具占位保持关闭](docs/images/components-zh.png)

图为 0.2.0 隔离测试环境；请求上限 9 是测试设置，不是默认值。

在插件设置页分别保存模型、通信和请求上限偏好，然后完整重启该 Profile。界面会分开显示“已保存的偏好”和“启动时观察到的值”，两者不同通常表示还没重启。

“原生模型选择兼容”仅在模型增强开启时生效：开启使用原生快照，关闭使用当前允许列表；未设置时沿用工具行配置。通信增强关闭不代表取消原生消息功能，也不会移除 Team 请求上限。

## 卸载流程

**先关闭总开关 → 确认写入成功 → 停止相关 Host/Agent → 再卸载 → 重启核对。**

这里的关闭是固定切回五个原生组件，**不恢复安装前的启停状态**。插件不清空整份 patch，也不会替你停止任务。

卸载命令（以 `web` 为例）：

```sh
dsh plugin --profile web remove @dsh-native-collab/derived
```

如果关闭被阻止，先看[排错说明](docs/FAQ.md)，不要跳过这一步强行卸载。

## 这版测到什么程度

0.2.0 已在隔离环境完成安装、启用、重启、设置保存、升级和正常卸载；覆盖中英文、窄窗口、200% 缩放与键盘确认/取消。测试使用模拟模型服务，没有真实或付费模型调用。

已知小问题：确认表里的长操作名有时需要横向滚动才能看全，确认/取消按钮仍可用。这是已接受的外观限制，不影响本次预发布。

完整外测版本是 DSH 0.2.1-rc.2；rc.1/rc.3 已核对相关源码，并通过隔离安装、启用/重启和关闭卸载检查。其他同系列版本属于预期兼容，不冒称逐版实测。详细范围见[测试说明](TESTING.md)和[核验清单](RELEASE-VERIFICATION.json)。

## 来源与许可

基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 `dsh-v0.2.1-rc.2` 派生，遵循 [MIT 许可](LICENSE)，保留上游版权和 NOTICE。详见[来源](UPSTREAM.md)与[第三方声明](THIRD_PARTY_NOTICES.md)。

安装文档按[官方打包教程](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.2/docs/user/develop/basic/publish.zh.md)核对，分发形式参考社区插件 [dsh-billing](https://github.com/Wanbinyu/dsh-billing) 和 [git-inspect](https://github.com/Wanbinyu/dsh-plugin-git-inspect)。这些项目不是本插件的背书方。

[下载 v0.2.0](https://github.com/Sieuno/dsh-native-collab/releases/tag/v0.2.0) · [反馈问题](https://github.com/Sieuno/dsh-native-collab/issues)
