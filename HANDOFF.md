# 0.2.0 发行记录说明

这是 DSH Native Collab 的 GitHub 社区预发布版，不发布 npm。

兼容声明从 DSH 0.2.1-rc.1 起，不跨到 0.2.2。rc.2 完整外测和 rc.1/rc.3 源码评估分别记录；不能把所有开放版本写成均已实测。

当前核验清单见 [RELEASE-VERIFICATION.json](RELEASE-VERIFICATION.json)。原始交付记录保留在 docs/evidence/，最终发行包更新兼容声明、元数据和文档，运行代码与已测基线一致，但有自己的新哈希。

安装步骤见 [安装说明](docs/INSTALL.md)。总开关关闭固定启用五原生，不恢复历史；卸载前必须先关闭并确认，再停止相关 Host/Agent，之后 Remove 并重启核对。原始外测日志、Profile 和会话不随本项目公开。
