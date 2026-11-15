# 第三方声明

## DeepSeek Harness、Cordis 与 Schemastery

本项目源自 DeepSeek Harness 的社区派生项目，保留 MIT 许可和既有 DeepSeek 版权。新架构不再发货此前复制改编的协作运行时、工具主体或客户端；它调用宿主提供的官方包，并对已知官方工具的局部上下文进行适配。历史来源与文件头可从 Git 历史查阅。

@deepseek-ai/cordis、@deepseek-ai/schemastery 及所需 @deepseek-ai/dsh-* 包只声明为 optional peer dependencies，版本见 package.json。各包的许可、版权和 NOTICE 由相应官方发布物提供，不在插件中复制宿主依赖。

## 开发依赖

TypeScript 用于构建，yaml 用于开发期读取配置与测试；它们不作为本插件运行依赖发货，其许可和版权以对应安装包为准。
