# 0.2.0 改动说明

## 功能版本

相对 RC11，0.2.0 清理浏览器的 11 条死文案，中文阻断提示改为“重新核对”，为操作名添加不拆字样式；Host 源码、非浏览器 JS 和默认安装 patch 保持基线字节不变。对应[浏览器模板](https://github.com/Sieuno/dsh-native-collab/blob/v0.2.0/packages/agent-team/client.js)、[中文](locale/zh.json)、[英文](locale/en.json)与[生成产物](dist/client.js)。

## 本轮发布整理

重写使用者说明，补安装/排错、开发说明、公开外测摘要、Issue 模板与有界 CI 配置示例。保留原交付核验记录，当前核验清单另记最终发布产物。Host、浏览器代码、语言资源、图标和默认 patch 不变；只更新文档、包元数据、兼容范围及其对应声明检查。最终 TGZ 有新哈希，不冒用原外测包身份。

源码中的新文档与运行包中的旧文档不同，已在 Release 说明。不是改了包又沿用原包哈希。
