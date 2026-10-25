# Changelog

## 0.2.0 — 社区预发布（2026-10-26）

- 删除剩余 11 条 browser 死文案，中文 live 阻断提示改为重新核对。
- 操作名局部不拆词，保留表格横滚和独立说明；不改后端、启动覆盖或卸载逻辑。
- 初次交付为源码 ZIP；后续已补齐已测运行 TGZ、外测记录和校验和。
- 后续 0.2.0 隔离外测 PASS：安装、主开关、重启、设置、升级与卸载闭环完成；N7 横滚外观限制已接受。详情见 TESTING.md。
- 发布整理补齐安装、排错、开发与外测摘要；保留已测 TGZ 字节，不修改运行代码。下方 RC 各节是历史记录。

以下为历史记录，不代表 0.2.0 当前验收。

## 0.1.0-rc.11 — RC10 PASS 后的 N6/N6b 与 D6 收尾

- 诊断派生身份仅一次，占位说明和同模块说明分开，保留全部状态语义及风险告知。
- 删除旧 browser preview 绑定/codec/inject 与六条未使用文案；Host 只读 preview API 兼容保留，既有安全测试继续覆盖。
- 后端源码、非 browser 产物和安装 patch 保持 RC10 字节不变；补两语言/结构/无 preview 依赖定向回归及离线核验。
- RC10 外测为 PASS、有保留意见；下文关于 RC10 待外测的表述是交付当时历史，本轮不把历史结果冒充 RC11 实测。最终计数和 SHA 见当前核验清单。
- 不安装依赖/当前 DSH、不启动实机、不改核心、不进行付费业务测试。

以下 RC10 及更早章节是历史记录。

## 0.1.0-rc.10 — RC9 外测 D8 与 N1–N5 展示修复

- 补齐 en/zh 五处诊断标签和中文 unknown-pending；新增逐语言自身 key、有限动态家族及公开 LocaleRuntime 回归，避免英文回退掩盖漏译。
- 启用/关闭确认按动作区分，启用不带关闭专用警告；已配置派生不重复启用，同模块 preset 明确标注。
- 七个诊断根行均标派生，两普通工具根占位及 preset 实际来源明确；数值偏好行统一布局。
- 明确完整 preset 副本的保留与上游默认值固定风险；不更改已通过的持久化方案。
- 后端源码、Host 产物和安装 patch 与 RC9 保持字节一致；新 GUI/语言回归与旧安全回归共同执行。最终测试计数和 SHA 见交付核验清单，RC10 真实 GUI 仍待外测。
- 没有安装依赖或当前 DSH、启动实机、改核心或调用付费外部测试服务。

以下 RC9 及更早章节为历史记录，不代表 RC10 新实测。

## 0.1.0-rc.9 — RC8 外测 D1–D7 定向修复

- 使用外测真实 experimental Team 模块与 preset 普通 spawn/fork 身份；minimal 跳过，未知目标阻断，writeSupport 双向检查。
- 扁平 locale 字典及公开 LocaleRuntime 回归；旧嵌套字典测试明确失败，避免假翻译器掩盖错误。
- 确认表换行/滚动、关闭回焦、去除重复预览、诊断折叠、阶段/来源分列和提示布局调整。
- 非法 boot 输入公开 RemoteError；保留指纹、单次 token、HMR、外部覆盖、原子写和预算保护。
- 关闭按人类决定固定启用五个原生目标，包括 bundle 原本禁用的 control/list；不是历史或 bundle 默认状态恢复。
- 106/106 有界离线测试、64 JS 语法检查；真实 GUI/Host/重启/卸载及重启后设置区隐藏仍待外测。不安装当前 DSH、不启动实机、不改核心、不调用付费外部服务。

以下 RC8 及更早章节只记录历史，不属于 RC9 新增验证。

## 0.1.0-rc.8 — RC7 外测修复与自有总开关

- 公开 lookup 获取 collabUi Remote namespace，并保留 namespace 方法接收者；新增真实 Cordis/gateway 回归，修复 inject 检查及 rebasing 导致的 GUI 请求故障。
- 独立的启动覆盖管理组件与本插件设置页总开关：安装不自动替换原生，预览具体 scope/id/module/操作，确认一次性 token 后才写下一次启动配置。
- 固定启停：根五派生与五原生互斥，普通创建/分叉工具仅在 preset 替换，两个根占位保持禁用；关闭清受管覆盖及偏好，强制回原生，不恢复安装前状态。明确原先未启用功能也会启用。
- 预览指纹、短期单次 token、公开 appBoot 合成验证、HMR/覆盖/动态/歧义阻断、Profile 文件锁与原子写；成功后要求完整重启并隐藏旧 revision 偏好。
- 官方 Remove 不会自动关闭，组件不终止任务；卸载前先关闭并确认。关闭后移除的合成回归不是实机卸载验收。
- YAML 2.9.1 普通依赖、公开 Host peers；本轮只使用已有依赖，未安装实机/改核心/调用外部付费服务。95/95离线回归、64JS语法检查，完整 GUI/Host/重启/卸载待外测。

以下为历史记录，不是 RC8 本轮新增证据。

## 0.1.0-rc.7 — RC6 外测两项定向修复

- Remote contribution 补 package 标识、preview.action 完整 strict parser 与 status/preview 严格结果 decode；非法 action 不发送，异常返回不当成功。
- mount 失败保留诊断且不 reject apply，locale/五个 slot 仍注册；页面告警可见。slot 注册失败仍清理并抛出，dispose 正常释放。
- 保留原 schema 与旧 null 的启动兼容，新增本插件 anchor Fiber 作用域的公开 internal/config 预写校验，在持久化之前拒绝新的 null 与非法数值；不依赖可空 metadata 阻挡写入。使用同树唯一 Fiber UID 兼容 Cordis 反射代理。
- 旧 RC6 null 在读取时视为未设置，允许宿主 Config.validate 规范化；不迁移文件、不改预算。未设置默认 32，unset 沿合法继承值。保存不热切，重新构造后取新值；已有 epoch 不补满、不调上限。
- 新增真实已安装 gateway 契约测试与固定源码 SettingsForms/ConfigEditor 链回归；检查 fresh revision、拒绝无写、合法值、冲突、unset/继承、旧 null、预算文件不变。适配器与未测项单列。
- RC5/RC6 旧成品保留；未增加安全卸载功能，未改变核心/ASAR。核查期间失败 pnpm 尝试与可能依赖触碰明确披露，不计通过证据。

## 0.1.0-rc.6 — 独立开发候选，未打包／未实机验收

- 主设置页集中模型、消息、普通父子引导与续聊、Team 数值配额；官方 Button/Modal；显式 locale/Remote 注册。
- 六个本插件字段按组校验保存，下次完整组装生效，不改其他行、不热切当前 Agent。
- 新 Team 账本配额可配置，默认32；已有 epoch 保留 limit 和 used。
- Team 唯一 name/id 解析与普通 target 兼容；失败不跨通道回退；运行中／完成后控制拆分，master off 保留原生。
- 离线回归74/74；完整 Host/preset/GUI/持久化待外测。
- 未实现自动或延迟安全卸载：官方 Remove 无 pre-remove/defer hook。警告与 dispose 不计为该功能。

---

## 以下为继承的历史基线，不是 RC6 本轮新增证据

# Changelog

## 0.1.0-rc.5 (development candidate; not packed, installed into a Host, or live-runtime tested)

- Add two independent next-assembly switches and a native-compat sub-item. Enable/restore preview stays read-only. Own settings write only three volatile fields and do not switch the current Agent. The page is not permanently read-only. No multi-row transaction and no auto-uninstall assistant.
- Render zh/en lifecycle warnings on the bundle page and on bundle plus five-core detail subjects. Ordinary tool rows and unrelated subjects are not given that warning. No Remove interception is claimed. Activation Modal is after enable, not a before-veto.
- Host JavaScript was re-emitted: 61 host modules plus `dist/client.js` (62 dist JS). Budget sidecar retention is unchanged.
- Narrow repair: the browser Settings fallback unwraps formal RemoteResult on describe and mutate. A flat DTO is not a save. The row form remains boolean. A conflict is not reported as a successful save, and an error object is not stringified as `[object Object]`.
- Narrow repair: the startup snapshot is owned by this Context's `collabUi` service. Collaboration consumers inject that service. A missing control service waits or fails before construction; it does not silently use another Context or the old row. Unset overlay flags still follow the row. Restart remains the apply path.

## 安全卸载顺序

点官方 Remove 不会自动恢复配置。本页与本包不拦截官方 Remove，也不声称强制确认弹窗已经接管该开关。仅禁用功能行不是卸载：状态 anchor 仍可在。启用/恢复预览仍只读。`ctx.dispose` 不是卸载钩子，不能用来自动写配置。将来若做安全卸载或恢复助手，需要单独方案与授权；当前不能承诺点 Remove 会自动恢复。

1. 先停该 Profile 相关的 Host 与 Agent。
2. 备份当前配置，并对照启用前备份；保留用户后续编辑。不要盲复制整份旧备份盖掉后续修改。
3. 只撤本插件引入的各层启用覆盖，包括启动参数 `--patch`。不要把清空为 `[]`、盲复制整旧备份或 root-restore 当作通用无损恢复。root-restore 可能强制启用原先 disabled 的原生行，不是恢复原状。原生与派生不是同时加载。
4. 核对 effective 配置：原生服务不再被这些覆盖关闭。遗留 `disabled: true` 与已缺失的派生行会冲突。
5. 再执行官方命令 `dsh plugin --profile <p> remove @dsh-native-collab/derived`。
6. 按 Host 要求重启，并核验 S0 安装前会话、S1 插件期会话和新会话。

若已经误卸载，先修遗留启用配置再重启。不需要删除会话，也不需要改 core。会话不可用在这里是配置不可用，不是日志或数据损坏。

预算 sidecar（`native_collab_team_budget`）默认保留。同一 root 重装会沿用已记录的 used。不要通用建议手工删除 sidecar，否则可能丢掉历史或 legacy 拒绝记录。pnpm store、操作日志与会话本身预期保留，不自动 prune，也不自动删除。

## 0.1.0-rc.4 (development candidate; not packed, installed into a Host, or live-runtime tested)

- Add a minimal derived `subagent` / `subagent_fork` tool. The compatibility flag defaults off and is read at plugin apply. Off mode reads the current Host allowlist per call and does not record a policy event. On mode keeps the native Session snapshot, inherit, and restore path. The advertised catalog is not an authorization table. Both rows default disabled. The five-row root enable example is unchanged.
- Team model display uses a host-only own-request projection. The inherited cut is the init argument. Creation options are labeled and used only for a live Agent with no own request. Unknown preview actions are echoed, not treated as enable.
- Host JavaScript count is the number of discovered package sources plus the browser entry. It is no longer a fixed 47.

## 0.1.0-rc.3 (development candidate; not packed, installed, or live-runtime tested)

- Replace the non-replayable bare `team/budget` Session event with a Host `storage-domain` per-record sidecar keyed by root Session ID; persist admission count, immutable limit/epoch, and first denial across normal process restart.
- Require the official Host storage-domain service; missing service, corrupt/missing ledger for existing Team history, legacy Team, and exhaustion fail closed with stable TeamError codes. No implicit reset or migration; RC2 session logs containing the unknown bare `team/budget` event remain unreadable by the current Host and are not repaired here.
- Add an independent-process AgentLoop + MockAdapter A/B restart test with actual JSONL SessionPersistence and Host storage-domain JSON backend, plus missing/corrupt legacy and missing-storage denial checks. Tests are offline and synthetic; no DSH app/UI/model request or package/archive installation.
- Normalize non-Error send_message rejections into a readable coded TeamError while preserving native Error/TeamError codes. This formatter path is tested with controlled injected failures; it does not claim to reproduce every historical runtime error.
- Add one active bare-package root row and a minimal root bootstrap that mounts only the existing read-only CollabUiService; the five collaboration feature rows and generated enable/restore overlays remain unchanged and disabled by default. Host output is 46 JS modules plus the separate browser entry (47 total). The real official `bundleRoster` function is exercised from a review-only source copy after removing only its default `webApp` top-level eager initializer; its function/helpers are byte-identical to the official source. This locates the package discovery/manifest chain, not HTTP loading or browser rendering.
- Task24 creates a package-project staging copy from the frozen RC3 candidate, includes `TESTING.md` and `COVERAGE.md`, and adds an explicit Node-only package validation script. Existing 47 JS outputs are compared byte-for-byte to the candidate; this staging pass does not rebuild, pack, install, or publish a TGZ.

## 0.1.0-rc.2 (development candidate; not installed or runtime-tested)

- Add durable, per-Team logical request-admission quota (default 32), initialized at the first durable collaboration write; no implicit reset.
- Persist every admission reservation through the Team journal and expose typed reserve/getBudget APIs; exhausted/legacy/corrupt/unflushed states fail closed.
- Add a single durable first-denial diagnostic; exhaustion cancels current Team turns but does not claim to replay already-claimed inbox messages.
- Budget-stage RC2 build: 44 host JS modules = new `budget.js` plus changed `index.js`, `projection.js`, `roster.js`, `task-board.js`; 39 are byte-identical to RC1. RC1 `roster.js` SHA-256 is `0e3da40aff157cd23b266d0a9183deeb65cdb53864aeaea1974640faf3117425`; budget RC2 compiled SHA-256 is `cccff987d56488d2a69f6aa1a7ec4e9d0538b619da3c09baa3ad0b017568e4ee`.
- UI-stage RC2 expected output: 45 host JS + 1 separate browser client entry. Relative to RC1, six host files differ (`budget.js`, `index.js`, `projection.js`, `roster.js`, `task-board.js`, `collab-ui.js`) and 39 remain byte-identical; browser client is separate. UI phase 2 adds read-only enable/restore previews and structured rejection; no Profile mutation, snapshot, restore, disk persistence, or GUI runtime acceptance is claimed because a safe official multi-row transaction and next-start-only seam could not be proven. This development copy is not package-built, packed, installed, or tested in a live DSH runtime.

## 0.1.0-rc.1

- 初始 GitHub 发布候选：独立 ESM bundle。源码 ZIP 含四包 TypeScript 源及测试/构建脚本；runtime TGZ 只含 43 个预编译 JS、locale、简易原创 SVG 图标、必要脚本与许可说明。
- 默认声明派生插件为 disabled，不自动接管官方实现；提供人工审阅的根层示例 patch。
- `private: true` 防止误发布 npm。发布/安装及完整恢复流程均待验收。
