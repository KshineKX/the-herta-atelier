# 兼容范围

- 目标：Windows，Node.js 22.19+（22.x）或 24+，DSH desktop profile。
- 当前观察基线为 DSH 0.2.1-rc.3，桌面包内 schemastery 3.18.5；rc.2 保留为历史基线。机器可同时留有旧 profile SDK，不能把它当作桌面正在使用的 SDK。
- 机器可读记录在 packages/skin/host-compatibility.json。探测优先读取桌面 app.asar 的实际版本、SDK 和语义锚点，单独报告 profile 的后备解析版本；未知版本或契约不匹配不继承已知兼容状态。
- 阅读与输入适配使用 data-composer-card / data-composer-seat / data-conversation-region / data-chat-flow-key 等语义标记；布局锚点集中于 src/host.js，已移除旧版本哈希类名和全树文案替换。
- ASAR 中出现标记只证明静态契约存在；浏览器夹具也是自建语义 DOM。它们都不能冒充原生 DOM 快照、每页布局或主题服务集成验收。
- beta.11 有 rc.3 的真实启动/媒体观察记录；工程候选需重新做冷启动、侧栏折叠、菜单取色及深浅切换，不能仅凭版本相同就标为已验收。
- 未宣称已覆盖 macOS、Linux、全部历史 DSH 版本或所有显示缩放比例。
- 缺少主题立绘时使用中性背景；不通过 404 或损坏图阻止进入。
- 4× 立绘为 AI 超分；无损 WebP 仅减少文件体积，不增加原始画面细节。
- 保留用户已选择的极清默认与全部媒体；高分辨率图片及视频仍有解码开销。内存与长时间性能尚未建立完整新基线，低配机器可手动选择柔和与静态；不据此悄悄更换完整交付内容。
- 共享包不包含账号、provider 配置、图库照片、官方视频、依赖运行时二进制或宿主源码。
