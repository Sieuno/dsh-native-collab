# 上游来源与许可范围

- 上游：[DeepSeek Harness](<https://github.com/deepseek-ai/deepseek-harness>)。
- 来源标签 `dsh-v0.2.1-rc.2`，commit `687f282e8625c6b8d11ff58211a90524be2e4317`。
- 本项目是非官方社区派生品，不代表官方维护、认可或担保。发布者填写自己的真实仓库，不编造作者、维护者或官方背书。

## 源码范围

包含五个派生模块组 agent-team/subagent/tool-agent-team/tool-subagent/tool-subagent-control 的源码与资源、构建脚本、测试、生成的 63 个 Host JS 和独立 browser entry、介绍/发布指引及许可。浏览器输出为 dist/client.js，不覆盖 Host 模块。GitHub 源码包不是完整 DSH，也不含依赖目录、Profile、会话或凭据。

本版后端相对 RC11 不变；差异及证据见 [改动地图](<CHANGE-MAP.md>) 与核验清单。默认 bundle 只有管理入口启用，7 个功能/占位行禁用。预期兼容 DSH 0.2.1 系列，从 rc.1 起，不跨到 0.2.2；rc.2 完整外测，rc.1/rc.3 源码核对及小规模启停卸载验证，详情见测试说明。

## 许可

保留根目录及包级 MIT/NOTICE、完整上游版权行 `Copyright (c) 2026 DeepSeek`，并保留 [第三方声明](<THIRD_PARTY_NOTICES.md>)。这不表示本派生版本由 DeepSeek 发布。不得用社区派生代码的许可解释为拥有官方商标或署名授权。
