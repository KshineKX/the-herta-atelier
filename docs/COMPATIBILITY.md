# 兼容范围

- 目标：Windows，Node.js 22.19+（22.x）或 24+，DSH desktop profile。
- 已用于开发与源代码核对的宿主：DSH 0.2.1-rc.2，内置 schemastery 3.18.5。
- 主要阅读布局使用 data-conversation-scroll / data-chat-flow-key 等语义标记。
- 原生标题区、旧侧栏过渡仍有少量版本相关内部选择器；升级 DSH 后需重新检查边界、折叠和取色。
- 未宣称已覆盖 macOS、Linux、全部历史 DSH 版本或所有显示缩放比例。
- 缺少主题立绘时使用中性背景；不通过 404 或损坏图阻止进入。
- 4× 立绘为 AI 超分；无损 WebP 仅减少文件体积，不增加原始画面细节。
- 共享包不包含账号、provider 配置、图库照片、官方视频、依赖运行时二进制或宿主源码。
