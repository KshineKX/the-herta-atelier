# 交付状态

<!-- herta-source-version:start -->
源码版本：**0.4.0-beta.13**
<!-- herta-source-version:end -->

2026-10-27：本版为工程整改Beta，默认完整theme保留已确认10张背景和13段视频；显式core仅用于无画像的开发基础版。没有新增付费生成。发布源以本版tag、source-provenance.json及CI记录的提交为准，不从已安装目录反向取源。

| 范围 | 状态与证据口径 |
| --- | --- |
| 正常Windows完整测试 | 发布准备75项通过，0失败、0跳过；包含Git、真实临时junction/恢复子进程与独立Edge |
| 发布链 | 仅接受干净提交；theme和core分别从git archive构建，验证/测试后打包，再严格解压复验；结果由每包verification.json记录 |
| 中断恢复 | 每包记录链接切换与恢复意图，支持操作间隙和恢复再次中断；其他用户配置/链接/媒体改动仍拒绝覆盖 |
| 媒体、字体与生成物 | 215项来源构建清单、30项媒体登记；10背景与13视频对前版原SHA核对；Noto实际版权行及bundle一致性由verify检查。最终包条目数以其清单为准 |
| 开屏 | 入口注入兜底、缺clientReady硬放行、stco/co64与大前置box回归；三套独立检查纳入发布门禁 |
| CI与远端回下载 | 发行验证回执记录实际CI结论、附件ID/大小/摘要及GitHub回下载核对，不用本地检查替代 |
| 原生DSH安装/验收 | 本轮明确暂缓：不安装、不重启、不操作真实profile。现用beta.11与原备份保持不动 |

beta.11已有的rc.3启动/媒体观察不继承为beta.12原生验收。浏览器使用虚构语义DOM，不是原生截图或完整长期性能证明。本版保持预发行，不标Stable。

详见[ACCEPTANCE](ACCEPTANCE.md)、[单一源码入口](SOURCE-OF-TRUTH.md)与[安装/恢复](INSTALL.md)。历史候选日志不作为当前发布状态来源。
