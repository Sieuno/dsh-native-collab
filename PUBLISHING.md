# 维护者发行流程

仓库：[Sieuno/dsh-native-collab](https://github.com/Sieuno/dsh-native-collab)。源码、版本标签和 Release 附件分别管理；不要把打包文件当成源码提交。

## 本版

- Tag：v0.2.0；社区预发布。
- 简介：让 DSH 的 Agent Team 更灵活：灵活选择模型，增强父子对话通信。
- DSH 范围：`>=0.2.1-rc.1 <0.2.2-0`。rc.2 完整外测，rc.1/rc.3 源码核对及小规模启停卸载验证，其他同系列版本按预期兼容提供。
- MIT 许可及上游 NOTICE 保留；private=true 防误发 npm，不影响 GitHub 发行。

## 后续发行

1. 更新功能、兼容范围和说明，核对原生接口、预设结构与包导出，不只凭版本号猜兼容。
2. 从干净依赖安装开始运行构建、发布检查和相关测试；行为有变化时补对应隔离验收。
3. 对最终文件生成核验清单和校验和。元数据或文档变化也会改变 TGZ，不冒用旧测试包哈希。
4. 提交源码、打标签，先建 Release 草稿并附 TGZ/源码 ZIP/用户说明/校验和，再公开。
5. 下载公开附件核对哈希，确认 README 安装地址可用。不要覆盖已发行版本的不同字节产物来假装同一构建。

原始 Profile、会话、访问 token、完整外测日志不提交；以脱敏摘要说明测试范围。关闭总开关不恢复历史状态，安装前告知和卸载顺序必须保留。

## 参考

- [官方打包教程](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.2/docs/user/develop/basic/publish.zh.md)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)
- 社区样例：[dsh-billing](https://github.com/Wanbinyu/dsh-billing)、[git-inspect](https://github.com/Wanbinyu/dsh-plugin-git-inspect)。只参考分发形式，不套用它们的兼容承诺。
