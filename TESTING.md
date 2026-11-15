# 测试与证据范围

使用 Node.js ≥24.9.0。根目录开发依赖通过 npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund 安装。SDK 是独立、精确锁定的开发环境，不进入发布包：

```sh
pnpm --dir .github/sdk/native install --frozen-lockfile --ignore-scripts --config.auto-install-peers=true
pnpm --dir .github/sdk/native-rc2 install --frozen-lockfile --ignore-scripts --config.auto-install-peers=true
```

native 对应 rc.3，native-rc2 对应 rc.2。默认使用 native；指定 DSH_NATIVE_SDK=.github/sdk/native-rc2 可切换到 rc.2。在 PowerShell 中使用 $env:DSH_NATIVE_SDK 设置环境变量。

```sh
npm run build
node scripts/native-build.mjs --check
npm run validate:package
npm test
npm run check:types
npm run test:sdk
npm pack --dry-run --ignore-scripts
```

- 构建与 --check：转译、语法检查及提交产物一致性，不证明类型或宿主行为。
- npm test：计数预留、配置与发布边界，不需要宿主 SDK。
- 提交署名检查：`node --test tests/commit-attribution.test.mjs` 验证真实 Git 历史、联合作者、邮箱变体及浅克隆拒绝；`npm run check:authors` 检查当前提交及所有祖先的原始作者、提交者与署名尾注。CI 独立作业使用 `fetch-depth: 0`，失败会阻止检查和后续 Release。该检查识别提交署名，不判断源码是否由 AI 辅助编写，也不禁止正常提及工具。
- check:types：针对所选官方已发布 SDK 声明进行 strict 类型检查，skipLibCheck 不检查依赖内部实现。缺少 SDK 直接失败。
- test:sdk：native-tools 使用真实官方工具、配置 Loader 和执行器，在服务边界替换外部依赖；native-startup 读取实际插件 patch，验证装配、不加载插件补丁时的原生启动及工具重载；native-host 使用真实 AgentLoop、Subagent、预设、Team、JSONL 持久化和查询服务，以及脚本模型和目录协作者，验证自动完成、冷恢复、唤醒额度和任务归属。它不是完整已安装 Profile 的启停、卸载验收。
- settings-client 使用所选官方 SDK 发布的表单模型与 React 控件，验证仅保留两个设置项的双语静态渲染、模型来源与额度控件经原生 Loader 保存并影响后续调用，以及旧模型设置映射、恢复默认、校验、只读和保存失败。槽位与传输由夹具提供，CSS 未在 Node 中渲染；这不等同于真实浏览器或已安装 Profile 的验收。测试所需 React、表单与状态库仅装在两套开发 SDK 中，不随插件发货。

没有真实模型 API、桌面/网页交互、原生配置表单浏览器行为或旧版身份转换会话迁移的完整验收。不得将这些检查合称全量 E2E。CI 在两个支持 SDK 上分别运行，并配置 Linux 和 Windows；本地结果不代表 CI 已经执行。
