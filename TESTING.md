# 测试与验收

## 组织与边界

- 测试按功能维护，不按插件版本复制；历史由 Git 管理。每个 `tests/*.test.mjs` 文件必须在 [runner](scripts/test.mjs) 中且只登记一次，缺少前提时明确失败，不静默跳过。
- 浏览器工厂加载、构建时数据注入和元素遍历共用 [browser-fixture.mjs](tests/browser-fixture.mjs)；元素渲染与协议夹具不是实际浏览器验收。
- 版本契约只检查合法格式及 manifest/lockfile 一致，不写死试用版本号。临时输出放入忽略目录 `.test-artifacts`，不在仓库保存维护笔记、问题清单或回归报告。各层的证明边界、声明纪律与合并/删除判据见[项目审查要求](https://github.com/Sieuno/dsh-native-collab/blob/main/docs/REVIEW.md)（内部文档，不随 npm 包分发）。

## 构建、类型与隔离加载

```sh
npm run build
node scripts/emit-dist.mjs --check
npm run check:types -- --sdk-types-map <已有SDK声明映射.json> --type-root <已有Node声明目录>
npm run check:load -- --sdk-map <已有SDK模块映射.json> --read-root <允许只读的依赖目录>
npm run validate:package
```

构建只转译和检查 JS 语法，不做完整类型检查。额外的静态导入检查需要真实的 Cordis 4.0.5 与 schemastery 3.18.5 声明；仅执行 `npm ci --legacy-peer-deps` 不会安装这些可选 SDK peer。CI 显式准备这两个构建依赖，不将其打包或改写 lockfile。`--check` 使用同一构建流程只读比对所有产物，缺失、内容不同或无源码对应的多余 JS 均失败，不重写文件。

这些命令不会安装 SDK。映射仅在标准解析找不到已有依赖时提供：类型映射是模块名到已有 `.d.ts` 文件路径的 JSON 对象；模块映射是模块名到已有实际 JS 入口路径的 JSON 对象，不能用空对象或伪造导出替代 SDK。类型检查对插件全部 TS 源码开启 `strict`、`noEmit`；`skipLibCheck` 只跳过依赖声明内部检查，不等于验证宿主全部源码。

隔离加载逐个求值发货 JS 和公开 JS 入口，调用真实配置 schema；内存 Cordis Context 检查管理入口的依赖就绪及接管拒绝行为。子进程禁止写文件、限制读取目录、阻止网络和子进程创建，不打开真实 Profile。浏览器入口只检查注册。验收脚本需要支持 `registerHooks` 和权限模型的 Node；不能据此推定声明的全部 Node 范围均已通过。

## 功能测试分层

| 层 | 命令 | 文件数 | 依赖与范围 |
|---|---|---:|---|
| 本地契约 / UI 单元 | `npm test` | 18 | 本地依赖、构建产物和元素/协议夹具，不启动真实 Host |
| SDK / 隔离集成 | `npm run test:sdk` | 9 | 匹配 SDK、`DSH_SOURCE_ROOT`；独立测试夹具 |
| 官方客户端协议 | `npm run test:client` | 1 | `DSH_OFFICIAL_ASAR`；真实 ClientRemote 的离线连接断言 |
| 官方发现 / roster | `npm run test:discovery` | 1 | `DSH_OFFICIAL_SOURCE_ROOT`；官方 roster 原文哈希校验 |

共 29 个功能测试文件。文件数以 [scripts/test.mjs](scripts/test.mjs) 的登记表为准；登记表与实际文件不一致时，`scripts/test.mjs` 会先失败。可在一次调用中选择多层，例如 `node scripts/test.mjs unit sdk`；同一文件不会重复执行。

本地层覆盖自动唤醒守卫/路由、模型来源、自动保存、管理生命周期、状态诊断词典和发布契约。旧请求预算、Host 提示豁免和不取消 Agent 的源码断言已归入 [auto-wake-routing.test.mjs](tests/auto-wake-routing.test.mjs)，不再单设伪 Host 层。SDK 层覆盖投影、子对话引导、模型选择、注册/通信、设置及生命周期。

## 外部验收前提

`DSH_SOURCE_ROOT` 指向匹配 DSH 源码根目录；发现层另外直接读取官方 roster 源码，不依赖额外适配器入口。`DSH_OFFICIAL_ASAR` 指向已安装的客户端协议 asar。`DSH_TYPESCRIPT_ENTRY` 可指向已有兼容 TypeScript，测试不会自动安装依赖。所有外部路径均由调用者显式提供，不访问当前真实 Profile。

`npm test` 不是完整集成验收。模块导入、配置解析、源码断言或 SDK 工具注册通过，都不等于真实 Team 创建、任务执行、卸载恢复和浏览器交互已通过。真实 Host 验收应使用临时配置、模拟模型与独立数据目录，不访问真实账号、真实会话或付费模型。CI 的构建和本地层不能替代这些验收。
