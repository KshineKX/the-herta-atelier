# beta.14交付状态

<!-- herta-source-version:start -->
源码版本：**0.4.0-beta.14**
<!-- herta-source-version:end -->

本版只修输入区重复花饰/边框和布局覆盖，保留beta.13的其他功能、10张背景和13段无声视频。

| 范围 | 准确口径 |
| --- | --- |
| 业务修改 | host.js、client.js、styles.js中的输入区装饰选择及样式约束；新增嵌套slot浏览器回归 |
| 开发会话实机确认 | 2026-10-27试装beta.14，真实窗口观察输入区叠框消失，用户明确确认没有问题；只覆盖输入区编辑器/按钮及装饰呈现 |
| 发布窗口 | 不操作真实profile、不再次安装/重启DSH。临时隔离profile与语义浏览器测试另记；不扩展原生结论 |
| 最终测试与两种包 | 从最终干净Git提交独立构建theme/core；实际计数、跳过范围与严格解压检查见verification附件，不能沿用beta.13成绩 |
| 源码/CI/远端 | 以本版tag、包内source-provenance、Node22.19/24 CI与GitHub回下载核对为准，发行说明列同一提交 |
| 权利与来源 | [NOTICE](../NOTICE.md)、[上游清单](THIRD-PARTY.md)和各MIT/OFL原文保留；角色权利与自有贡献分开，独立额度挂件不打包 |
| 尚未验证 | 长期性能、全功能原生验收、干净电脑与其他平台；保持Beta，不标Stable |

开屏、历史版本迁移和中断恢复沿用既有实现并参加发布回归。beta.13原标签与附件保留。历史行为证据见[ACCEPTANCE](ACCEPTANCE.md)，不把历史记录充当新版全功能通过。
