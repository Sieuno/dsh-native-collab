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

构建只转译和检查 JS 语法，不做完整类型检查。额外的静态导入检查需要对应版本真实的 Cordis 与 Schemastery 声明（rc2：4.0.5 / 3.18.5；alpha2：4.0.6-alpha.1 / 3.18.6-alpha.1）；仅执行 `npm ci --legacy-peer-deps` 不会安装这些可选 SDK peer，而可选 peer 的显式 `npm install --no-save` 也不会真正安装。基础 CI 用共享 action 的 `npm pack --ignore-scripts` 把这两个已发布包解包到 `node_modules`（不改写 lockfile、不把声明提交进仓库），再以 `DSH_HOST_CONTRACT=require` 运行静态契约检查，声明缺失即失败。SDK 集成 job 另行安装下面的独立锁文件环境，不把仅有声明当成可执行 SDK。本机没有声明时会打印跳过提示并继续；设置 `DSH_HOST_CONTRACT=require` 可要求必须检查。`--check` 使用同一构建流程只读比对所有产物，缺失、内容不同或无源码对应的多余 JS 均失败，不重写文件。

这些命令不会安装 SDK。映射仅在标准解析找不到已有依赖时提供：类型映射是模块名到已有 `.d.ts` 文件路径的 JSON 对象；模块映射是模块名到已有实际 JS 入口路径的 JSON 对象，不能用空对象或伪造导出替代 SDK。类型检查对插件全部 TS 源码开启 `strict`、`noEmit`；`skipLibCheck` 只跳过依赖声明内部检查，不等于验证宿主全部源码。

隔离加载逐个求值发货 JS 和公开 JS 入口，调用真实配置 schema；内存 Cordis Context 检查管理入口的依赖就绪及接管拒绝行为。子进程禁止写文件、限制读取目录、阻止网络和子进程创建，不打开真实 Profile。浏览器入口只检查注册。验收脚本需要支持 `registerHooks` 和权限模型的 Node；不能据此推定声明的全部 Node 范围均已通过。

## 功能测试分层

| 层 | 命令 | 文件数 | 依赖与范围 |
|---|---|---:|---|
| 本地契约 / UI 单元 | `npm test` | 21 | 本地依赖、构建产物和元素/协议夹具，含不需要 SDK 的模型选择策略；不启动真实 Host |
| SDK / 隔离集成 | `npm run test:sdk` | 7 | 匹配的可执行 SDK；不要求官方源码 |
| 官方设置源码契约 | `npm run test:source` | 1 | 匹配 SDK、`DSH_COMPAT_TARGET`、`DSH_SDK_ENVIRONMENT`、`DSH_SOURCE_ROOT`；在临时文件上执行官方设置与配置编辑源码 |
| 官方客户端协议 | `npm run test:client` | 1 | `DSH_OFFICIAL_ASAR`；真实 ClientRemote 的离线连接断言 |
| 官方发现 / roster | `npm run test:discovery` | 1 | 匹配 SDK、`DSH_COMPAT_TARGET`、`DSH_SDK_ENVIRONMENT`、`DSH_OFFICIAL_SOURCE_ROOT`；官方 roster 原文哈希校验 |

共 31 个功能测试文件。文件数以 [scripts/test.mjs](scripts/test.mjs) 的登记表为准；登记表与实际文件不一致时，`scripts/test.mjs` 会先失败。可在一次调用中选择多层，例如 `node scripts/test.mjs unit sdk`；同一文件不会重复执行。

本地层覆盖自动唤醒守卫/路由、模型来源、自动保存、管理生命周期、状态诊断词典和发布契约。旧请求预算、Host 提示豁免和不取消 Agent 的源码断言已归入 [auto-wake-routing.test.mjs](tests/auto-wake-routing.test.mjs)，不再单设伪 Host 层。SDK 层覆盖投影、子对话引导、注册/通信、状态与生命周期；模型选择纯策略已移入本地层，官方设置源码契约独立为 source 层。

## CI 与复现

- [基础检查](.github/workflows/verify.yml) 在分支 push、PR 和手动触发时调用[共享门禁](.github/workflows/checks.yml)。本地层在 Linux / Node 22.19.0、Windows / Node 22.19.0 和 Linux / Node 24 上运行，并检查已提交构建产物、发布契约及 dry-run 打包。构建检查不允许悄悄重写 dist；[.gitattributes](.gitattributes) 固定文本 LF，避免 Windows checkout 的 CRLF 转换造成伪产物差异。
- SDK job 分为 rc2 / Node 22.19.0 与 alpha2 / Node 24.19.0 两条独立 lane，分别使用 [.github/sdk/package-lock.json](.github/sdk/package-lock.json) 与 [.github/sdk/alpha2/package-lock.json](.github/sdk/alpha2/package-lock.json) 固定真实公开运行时及传递依赖；不混装两代声明。安装禁用生命周期脚本，随后执行完整 strict 类型检查、权限隔离加载与相同的 7 个 SDK 测试文件。不要用伪造模块、空声明或跳过测试来修复供应失败。
- [官方源码契约](.github/workflows/source-contracts.yml) 同样属于共享门禁，并可独立手动执行／每周重跑。与 SDK job 一样从[版本清单](scripts/host-compatibility.mjs)生成矩阵，rc2 / alpha2 各自使用对应 Node、锁定 SDK、精确上游提交及 roster SHA256；检出后核对提交，执行前再核对 Git HEAD / 干净工作树、源码与 SDK 版本和 roster 原文；本地复现同样拒绝无 Git 身份的快照或已修改的检出。设置源码与发现机制两个文件在每条 lane 上执行，不安装或构建整个上游工作区。
- 最新 Cordis / Schemastery 声明仅作兼容探测：普通 push / PR 不阻断，定时探测失败会直接使该定时工作流失败。它不替换固定 SDK 门禁。
- [发布工作流](.github/workflows/release.yml) 必须等待同一套共享门禁成功，才会打包、创建 Release；不会用另一套较弱的测试替代发布前验证。

复现固定 SDK 层（先安装根依赖，再安装独立 SDK；不会修改根 lockfile）：

```sh
npm ci --ignore-scripts --legacy-peer-deps
node scripts/ci/prepare-sdk.mjs --target rc2 # alpha2 使用 --target alpha2；每条 lane 从独立、干净目录开始
export DSH_SDK_ENVIRONMENT=sdk-only # PowerShell: $env:DSH_SDK_ENVIRONMENT="sdk-only"
node scripts/emit-dist.mjs --check
npm run check:types
npm run check:load
npm run test:sdk
export DSH_COMPAT_TARGET=rc2 # 必须与已准备的 SDK 相同；alpha2 使用 alpha2
# 设置源码测试另需 DSH_SOURCE_ROOT；发现层另需 DSH_OFFICIAL_SOURCE_ROOT，
# 均指向版本清单中对应 source.ref 的官方源码。
# 可用 DSH_TEST_ARTIFACTS 将发现层临时输出放到仓库外。
node scripts/test.mjs source discovery
```

SDK 准备脚本要求 Cordis、Schemastery、zod 单例，并拒绝暴露 `@deepseek-ai/dsh-settings`、`@deepseek-ai/dsh-config-editor`、`@deepseek-ai/dsh-app-boot`；后者是现有运行时测试的环境负契约，不要把官方工作区 node_modules 全量链接进来。SDK 和类型检查只使用真实已安装包，设置契约额外需要已固定的官方源码和显式安装的 js-yaml。

共 31 个功能文件中，CI 门禁覆盖 30 个；唯一未自动运行的是依赖安装版 ASAR 的客户端协议文件。目前尚无经审计、带固定校验值的独立官方 rc.2 ASAR 下载源，故保留 `DSH_OFFICIAL_ASAR=... npm run test:client` 的本地验收方式，不下载或执行桌面安装器，也不把缺少 ASAR 显示成通过。以上绿灯都不代表真实 Host 或浏览器端到端验收。

### 版本差异的维护边界

[版本策略](scripts/host-compatibility.mjs) 集中定义精确 SDK lane、独立锁文件目录、上游提交、roster SHA256 和宿主声明；[矩阵生成器](scripts/ci/compatibility-targets.mjs) 供 SDK 与源码工作流共用，拒绝移动 ref、重复版本/目录和未实现的执行模式。增加已审查版本时，新增清单项及其独立 SDK manifest/lockfile，审查源码差异后固定 commit/hash；无需再复制 workflow 中的版本列表。声明支持范围仍须单独审查更新，不能因为添加测试 lane 就自动放宽。SDK 的[执行适配器](tests/sdk-execution-fixture.mjs) 按清单的 `single` / `batch` 契约选取执行方式，实际路由断言不分叉；新 API 若不属于已有模式，必须先显式实现边界适配，不依靠捕获异常后猜测旧 API。`DSH_SDK_ENVIRONMENT` 必须显式设置：`sdk-only` 要求三个 Host 包不可解析；已有完整官方 Host 依赖树可选 `host`，此时验证 app-boot 包身份同版，但绝不求值该 Host 模块，不能把这一模式称为真实 Host 启动测试。

[投影兼容层](packages/subagent/src/projection-compat.ts) 处理旧 disposer 与新 handle promise；不得在注册时 await 旧 callable-thenable 而提前释放投影。注册释放与 schema 校验的单元测试只证明该边界，SDK 测试才使用真实投影注册。source / discovery 已覆盖清单中的 rc2 和 alpha2：设置描述断言运行时值、继承层及用户层，发现层断言启用根入口且排除禁用项与子路径。设置夹具的 Profile 合并、协调与锁仍为显式单条目适配；不证明完整 Loader、原子写、RPC 或 Host 生命周期。ASAR 客户端协议夹具仍只针对原 rc2 安装版，不把矩阵绿灯称为 alpha2 客户端协议或真实浏览器验收。

## 外部验收前提

`DSH_SOURCE_ROOT` 指向匹配版本清单精确提交的干净 Git 源码检出（含 Git 元数据，不接受解压快照）；发现层另外直接读取官方 roster 源码，不依赖额外适配器入口。`DSH_OFFICIAL_ASAR` 指向已安装的客户端协议 asar。`DSH_TYPESCRIPT_ENTRY` 可指向已有兼容 TypeScript，测试不会自动安装依赖。所有外部路径均由调用者显式提供，不访问当前真实 Profile。

`npm test` 不是完整集成验收。模块导入、配置解析、源码断言或 SDK 工具注册通过，都不等于真实 Team 创建、任务执行、卸载恢复和浏览器交互已通过。真实 Host 验收应使用临时配置、模拟模型与独立数据目录，不访问真实账号、真实会话或付费模型。CI 的构建和本地层不能替代这些验收。
