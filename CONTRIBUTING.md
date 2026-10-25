# 开发与反馈

普通使用者不用编译：下载 Release 的 TGZ，按[安装说明](docs/INSTALL.md)操作即可。以下供维护者阅读。

## 最小发布检查

仓库附依赖锁文件。先确认 Node 版本及依赖，明确关闭安装脚本、避免自动安装宿主 peer：

```sh
npm ci --ignore-scripts --legacy-peer-deps
node scripts/verify-build.mjs
node scripts/check-release.mjs
node --test tests/release-contract.test.mjs tests/release-exports.test.mjs
```

verify-build 会记录现有 dist 哈希、调用原构建脚本，再逐文件比较。构建使用 TypeScript 5.9.3，属于转译检查，**不是完整类型检查**。本组合同测试不加载 Host、不调用模型。

提供 [GitHub Actions 配置示例](.github/examples/verify.yml)，使用 Node 22 跑上述有界检查。自动检查工作流位于 .github/workflows/verify.yml，推送和 Pull Request 时运行；远端执行结果以 GitHub Actions 页面为准。即便 CI 通过，也不能写成实机/GUI 已通过。

## 其他测试需要什么

项目中的很多测试是针对真实 DSH SDK 或源合同的。依赖缺失不能靠编造 stub 变成通过。请为测试准备匹配的 DSH `dsh-v0.2.1-rc.2` 官方源码、宿主 SDK 与必要 archive，放在项目外。

- `DSH_SOURCE_ROOT`：部分合同测试使用的匹配官方源码根。
- `DSH_OFFICIAL_ASAR`：部分正式客户端合同使用的匹配宿主 archive。
- `DSH_TYPESCRIPT_ENTRY`：某些夹具允许显式指定已有 TypeScript 入口。
- `DSH_OFFICIAL_SOURCE_ROOT`、`DSH_CLIENT_ROSTER_ADAPTER_ENTRY`：专用装配测试所需，具体以测试夹具为准。

`client-discovery.test.mjs` 与 `native-agentloop-budget.test.mjs` 需要专用装配，不在基础 CI 范围。预算夹具使用的 stripTypeScriptTypes transform 在本地 Node 26 复跑时不可用；不要把“engines 支持运行插件”误读成“所有版本都能跑旧测试工具”。

## 变更后该测什么

- 文档：核对链接、命令、兼容范围、校验清单。
- 浏览器 UI：补对应语言、窄屏/缩放、键盘、确认/取消与真实保存链验证。
- 主开关/配置/预算：补隔离 Profile 安装、启用、完整重启、关闭和卸载，以及旧账本检查。

不要用真实用户 Profile 做测试，也不要把凭据、会话或完整外测日志提交到仓库。新打包产物必须有新哈希；旧产物记录保留为来源，不覆盖冒用。

## 提问和报告问题

使用本仓库 Issues 的模板，说明 DSH、Node、插件版本、操作步骤、实际结果和预期结果。有错误码就附错误码，不必把完整聊天记录贴上来。功能建议也请先说明遇到的具体困难。
