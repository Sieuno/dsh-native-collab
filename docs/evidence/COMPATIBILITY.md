# 0.2.1 兼容性源码核对

首发范围：`>=0.2.1-rc.1 <0.2.2-0`。这是预期兼容范围，不是所有版本均完成实机验收。

- rc.2：具有隔离安装、重启、设置、升级和正常卸载的完整外测证据。
- rc.1：已检查的协作、启动、存储、消息和浏览器合同源码一致；默认组合差异涉及搜索与模型标签，不改本插件受管目标。
- rc.3：核心协作和启动合同一致；插件管理导航、菜单可选属性及 Tooltip 定位有增补，未发现删除本插件所用接口。
- 对 21 份关键包声明扣除同步版本号后，包导出和依赖结构未发现差异。

没有对 rc.1/rc.3 冒称重复完整 Host 外测。未来同系列版本出现不兼容时，将通过新版本收窄或适配；不承诺未来 0.2.2、0.3 或更高系列。

没有从 0.2.0 起开放：已定位到旧 standard preset 中同模块的 Codex/Claude Code 条目会被当前总开关识别为歧义目标；不能只改下限解决。

[官方 rc.1](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.2.1-rc.1) · [rc.2](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.2.1-rc.2) · [rc.3](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.2.1-rc.3)。
