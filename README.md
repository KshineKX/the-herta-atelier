# The Herta Atelier · 大黑塔·天才书房

**Kshine 的非官方 DSH 主题作品 · 0.4.0-beta.3 · Windows**

紫黑与晨光双主题，支持个人导入的三场景画像，银纹、紫花、宝石与钥匙的层叠框饰。
正文默认开启阅读保护：有边界的阅读列与稳定衬底，人物与花饰留在外围。
设置面板为靠左展开的毛玻璃，深浅切换使用同一进度；藏镜由用户管理本地图库。

![The Herta Atelier](docs/cover.svg)

## 给第一次使用的朋友

1. 下载审核后的 **-core.zip** 安装包并解压到普通文件夹。正式 Release 尚未发布；当前是待真机验收的 beta。
2. 先运行一次 DSH，完全退出后，双击 **Install.cmd**。
3. 安装器完成预检、校验和备份后，再打开 DSH。
4. 右上四角星打开设置；**OpenGallery.cmd** 打开你自己的图库，增删图片后重开藏镜刷新。

普通使用不需要编辑 JSON/YAML，也不需要安装 npm 依赖。需要 Node.js 22.19+（22.x）或 24+；脚本优先找 DSH 自带运行时。
Code → Download ZIP 是源码，主要给开发者；安装用户使用预先构建的安装包。
公开候选不附待审画像，默认使用原创中性星空背景。个人完整版可使用本机已有的无损 WebP；这不表示已取得人物素材的再分发权。
从源码下载时，先运行 `node tools/build.mjs` 生成本地清单，再运行安装器；第一次体验优先使用已打包的 core 候选。

## 安全安装与移除

- 默认安装到当前用户的 DSH desktop profile，支持自定义 DSH_HOME、profile 和数据目录。
- 原配置、旧链接先备份；只修改本主题的依赖、bundle 与带标记的主题启用区段。
- 重复安装不会重复注入；升级保留首次安装前的恢复基线。
- **Uninstall.cmd** 恢复原有主题配置与链接，保留图库和个人视频。
- **Check.cmd** 只报告状态，不修复、不重启、不修改配置。

维护方式见 [贡献指南](CONTRIBUTING.md)、[支持](SUPPORT.md)、[安全](SECURITY.md)和 [维护流程](docs/MAINTENANCE.md)。

详见 [安装与回滚](docs/INSTALL.md)、[验收记录](docs/ACCEPTANCE.md)、[兼容范围](docs/COMPATIBILITY.md)。

## 可选开屏

分享包不附官方 PV。把你可使用的 MP4/WebM/M4V/MOV 拖到 **ImportVideo.cmd**，再运行 **InstallWithBoot.cmd**。
开屏模块沿用 lxj5820/dsh-boot-animation 的 MIT 代码及其许可证，启用前检查随包依赖与个人视频。
正常提示为 **PRESS ANY KEY TO ENTER**；任意非输入法组合键可进入，声音由单独按钮控制。
推荐 H.264/AAC MP4 并做 faststart。原生视频的清晰度取决于用户导入片源。

## 开发与作品维护

~~~text
node tools/build.mjs
node --test tests/*.test.mjs
node tools/verify.mjs
node tools/preview.mjs
node tools/release.mjs
# 仅本机个人媒体包：node tools/release.mjs --personal
~~~

当前基准宿主为 Windows / DSH 0.2.1-rc.2。安装与模拟验收不等于重启后的实机验收；其他版本请先作为兼容性测试使用。
GitHub 第一次使用见 [Kshine 的发布步骤](docs/GITHUB-FIRST-STEPS.md)。欢迎提交问题时附 DSH 版本、缩放比例与复现步骤。

## 来源与许可

本项目不代表 HoYoverse / miHoYo 或 DeepSeek 官方。作者有权授权的代码采用 **PolyForm Noncommercial 1.0.0**：限许可允许的非商业用途，分发时保留许可与 Kshine 的 Required Notice。独立原创框饰采用 **CC BY-NC-SA 4.0**；字体、可选开屏和角色美术分别见 [NOTICE](NOTICE.md)。

这是**源码可用、非商业许可**的个人作品，不称为标准开源软件。AI 辅助制作、源码与成品的关系见 [源码与 AI 说明](docs/SOURCE-AND-AI.md)。
官方 PV、第三方同人镜图、私人图库、旧聊天截图均不在分享包内。待审画像与含图演示截图也不进入公开候选。角色形象的相关权利不因项目代码许可证而转移。
