# 第三方声明

## DeepSeek Harness

此项目包含基于 DeepSeek Harness 的源文件与编译文件。`packages/tool-subagent` 复制并改编了官方 `packages/subagent/tool-subagent` 的工具 DSL、provider lifecycle、preset 校验和 startActivation 转发；选择策略读取点是本项目的差异。这不是官方 tool-subagent 的整包复制，官方树未被修改。文件头保留 MIT 及 `Copyright (c) 2026 DeepSeek`。本派生项目独立发布，不是官方 DSH 发布物；DSH/Cordis runtime 以宿主 peer 依赖声明，并非随包复制核心运行时。

## Zod

运行依赖声明 `zod@4.4.3`。其自身许可证及版权应以安装所得发布包附带的 LICENSE/NOTICE 为准；本项目不声称拥有或重新许可 Zod。

## TypeScript

开发依赖声明 `typescript@5.9.3`，用于 `transpileModule` 构建。TypeScript 不作为 runtime dependency；其许可和版权以相应官方发布包声明为准。

## Cordis 与 DSH 模块

`@deepseek-ai/cordis` 与 `@deepseek-ai/dsh-*` 运行时仅列为 optional peer dependencies，版本限定见 package.json；由宿主 DSH 提供，以维持共享核心的单实例。没有把 materialized host/core 包复制进本发布项目。其各自许可由对应上游包提供；此处不臆造作者或版权主体。
