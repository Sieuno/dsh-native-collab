# 安装、切换和卸载

本插件通过启动配置覆盖，切换部分官方协作组件和 Agent 预设工具，不修改 DSH 官方安装文件。关闭**插件自己的总开关**、确认保存并完整重启，可切回官方原生组件；不是恢复安装前的全部配置。复制的预设与已有 Team 用量记录仍会保留。

本文以已有的 `web` Profile 为例。Profile 可以理解成“一套 DSH 配置”；所有命令中的名字都必须指向你实际使用的同一套配置。下面的命令供你操作，不会自动执行。

## 0. 先确认环境并备份

```sh
dsh --version
node --version
```

- DSH 声明范围为 **0.2.1 系列，从 rc.1 起**（`>=0.2.1-rc.1 <0.2.2-0`）。需要 Node `>=22.19.0`。
- 下文用 `web` 举例，不把 Profile 名称或类型作为版本兼容限制。不要把别的插件的版本范围套过来，也不要用版本豁免强行安装到不匹配的 DSH。
- 等当前任务结束，停止该 Profile 的 DSH 服务。在终端运行的服务通常用 Ctrl+C 停止；由进程管理器启动的，用原管理方式停止。只关浏览器标签不算停止服务。
- 找到当前安装使用的 `DSH_HOME/profiles/web` 目录，复制整个 Profile 目录留作备份，尤其保留 `package.json`、锁文件和 `cordis.patch.yml`。如果配置过 home 级 patch，也单独备份。不要把备份发到公开仓库。
- 本插件关闭时固定启用五个原生组件，不恢复历史启停；完整 preset 副本会保留；旧 Team 用量也会保留。先读 [README 的启动覆盖说明](../README.md#启动覆盖与还原)。

不要对现有 Profile 运行 `--from-default-profile` 来“修复安装”：这个参数会重置该套配置。

## 1. 准备原生 Agent Team 组件

本插件切换的是已存在的原生组件。请确保当前 Profile 已安装与宿主版本匹配的官方实验性 Agent Team Profile。

如果你这套 Profile 还没安装它，先执行：

**下面以宿主 `0.2.1-rc.2` 举例。若 `dsh --version` 显示 rc.1 或 rc.3，请把命令末尾的版本换成同一个版本，不要混装其他宿主版本的官方 Team Profile。**

```sh
dsh plugin --profile web add @deepseek-ai/dsh-experimental-agent-team-profile@0.2.1-rc.2
```

如果已经安装且版本匹配，不必重复添加。它会给这套配置加入官方实验性 Team 组件；如果你不接受这一点，就先不要安装本插件。高度定制的 Profile 可能被总开关拒绝，需要逐项核对，不能保证一键适配。

## 2. 选择安装来源

推荐从 npm 按包名安装，也可在 DSH“添加插件”页输入 `@sieuno/dsh-native-collab`。

如果下载 GitHub Release，选择 `sieuno-dsh-native-collab-0.2.1.tgz` 即可。Windows、macOS、Linux 都使用同一个包，不用手工解压，也不需要额外的安装 ZIP。GitHub 自动生成的 Source code ZIP 是源码，不是安装包。

## 3. 安装到同一套 Profile

```sh
dsh plugin --profile web add @sieuno/dsh-native-collab
```

以上命令同样可用于 Windows PowerShell。已有旧版 0.2.0 安装时，请先按文末升级步骤移除旧包，不能直接叠装。

首次安装只登记这个组合包：管理入口默认开启，七个派生功能/占位行默认关闭，不会立刻替换原生组件。请通过 `dsh plugin` 或 DSH 的插件管理页安装，不要在任意目录执行 `npm install` 代替 Profile 安装。

## 4. 关闭热重载后启动

总开关保存时要求 **HMR（热重载）关闭**。它是 DSH 的运行方式，不是浏览器“刷新”。Web Profile 常默认启用它。

在你方便保留的目录新建 `native-collab-no-hmr.patch.yml`，写入：

```yaml
- id: hmr
  disabled: true
```

这是新增的一份启动覆盖文件，**不是让你覆盖原来的 Profile patch**。仓库里也提供了[同内容的示例](../examples/native-collab-no-hmr.patch.yml)。

在该文件所在目录启动：

```sh
dsh --profile web --patch ./native-collab-no-hmr.patch.yml
```

以后操作此插件总开关时，也要用同样的文件和启动参数。换目录启动时，请改用该文件的实际绝对路径。你原有必要的启动参数仍须保留；不要同时启动第二个同 Profile 服务。

## 5. 用插件自己的总开关切换

1. 打开左侧“插件”，进入“原生协作插件包 / Native Collaboration Bundle”。
2. 选择“启用总开关 · 查看具体变更”。不要逐个开启下方七个组件。
3. 阅读目标清单。确认模块和作用范围符合预期，不要只按行数判断。
4. 确认后应提示保存成功、需要重启。取消不应修改配置。
5. 等任务结束，停止相关 Host/Agent，完整重启该 Profile，仍带上第 4 步的关闭 HMR 参数。

重启后预期：总开关显示已选择派生服务；诊断里五项派生根组件运行，两个普通工具占位关闭。普通创建/分叉工具在 Agent 预设中生效，不靠打开根层占位。

“来源未知”本身不是报错；宿主没有公开该来源信息。保存成功、但偏好表和启动观察值不同，也不等于保存失败，先确认是否真的重启了服务。

## 6. 保存日常偏好

在插件设置里选择模型/通信偏好，分别保存。通信偏好在界面要求时会弹确认框，取消或 Esc 不写入；请求上限填正整数后直接保存，不另弹确认框。保存后仍要完整重启才能核对生效值。

请求上限默认 32，按每个 Team 记录。改成 9 不会把已经运行过的旧 Team 改成 9，也不会补满旧用量；新建的 Team 才使用新上限。

## 7. 暂时停用，或完整卸载

两者都先在插件页点“关闭总开关 · 查看原生配置”，查看具体目标并确认。**固定切回五个原生组件，不恢复安装前状态。**本插件保存的受管偏好会清理，原生 preset 副本和旧账本会保留。

- 只是暂时不用：关闭成功后停止相关 Host/Agent，再完整重启，保留已安装的插件。
- 要卸载：关闭成功后停止相关 Host/Agent，再执行：

```sh
dsh plugin --profile web remove @sieuno/dsh-native-collab
```

然后重启。不要在关闭失败时直接 Remove；不要通过删整份 patch 或删会话/账本解决问题。

最后检查插件已从安装清单移除、会话能正常打开。检查原生五项是否生效，已有 Team 用量记录应保留。原先未启用的 control/list 两项也可能被开启，这是本版已知行为。

关闭 HMR 的小文件只控制热重载，不引用本插件；卸载成功后，如果希望恢复原本的热重载方式，可以在下次启动时不再传这份文件。不要顺手删除其他启动参数或用户 patch。

遇到阻断或误卸载，请看[常见问题](FAQ.md)。

## 从旧版 0.2.0 升级

旧版 GitHub TGZ 的内部包名是 `@dsh-native-collab/derived`；它此前没有在 npm 发布。本次 npm 首发使用 `@sieuno/dsh-native-collab`。包名不同，首次升级请依次操作：

1. 在旧插件中关闭**插件自己的总开关**，确认保存成功。
2. 停止相关 Host 与 Agent，备份当前 Profile 配置。
3. 执行 `dsh plugin --profile web remove @dsh-native-collab/derived`。
4. 执行 `dsh plugin --profile web add @sieuno/dsh-native-collab`。
5. 按本文关闭 HMR 的方式启动，查看新插件总开关的变更并确认，再完整重启。

`web` 换成你使用的 Profile。旧版关闭后保留的预设副本和已有 Team 用量不会因改包名而重置。如果关闭被阻止，先处理冲突，不要强行卸载。迁移一次后，后续同名版本可正常更新。
