# 测试说明

## 已验证范围

- DSH 0.2.1-rc.2：隔离环境验证安装、启用、重启、设置、升级和正常卸载，以及中英文界面和键盘操作；Node 22.23.4。
- DSH 0.2.1-rc.1、rc.2、rc.3：发行包安装、启用、重启、关闭和卸载检查；Node 26.12.1。
- 测试使用模拟模型服务，不包含真实模型提供商验证。

基础 CI 检查构建一致性、包导出和发布配置，不代替实际宿主测试。其他平台、任意自定义预设、全部插件组合和完整类型检查尚未覆盖。

## 本地检查

```sh
npm ci --ignore-scripts --legacy-peer-deps
node scripts/verify-build.mjs
node scripts/check-release.mjs
node --test tests/release-contract.test.mjs tests/release-exports.test.mjs tests/user-docs.test.mjs
```

其他集成测试需要匹配的 DSH SDK、官方源码或专用宿主夹具，具体以对应测试文件的环境变量要求为准。请在隔离 Profile 中运行，不使用真实用户配置或付费模型。
