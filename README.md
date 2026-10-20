# The Herta Atelier · 大黑塔·天才书房

**Kshine 的非官方 DSH 主题作品 · 0.4.0-beta.1 · Windows**

紫黑与晨光双主题，三幅 AI 辅助同人画像，银纹、紫花、宝石与钥匙的层叠框饰。
正文默认开启阅读保护：有边界的阅读列与稳定衬底，人物与花饰留在外围。
设置面板为靠左展开的毛玻璃，深浅切换使用同一进度；藏镜由用户管理本地图库。

![阅读保护演示](docs/screenshots/reading-light.jpg)

## 给第一次使用的朋友

1. 从 Releases 下载名称以 **-theme.zip** 结尾的完整安装包，解压到普通文件夹。
2. 先运行一次 DSH，完全退出后，双击 **Install.cmd**。
3. 安装器完成预检、校验和备份后，再打开 DSH。
4. 右上四角星打开设置；**OpenGallery.cmd** 打开你自己的图库，增删图片后重开藏镜刷新。

普通使用不需要编辑 JSON/YAML，也不需要安装 npm 依赖。需要 Node.js 20+；脚本会优先找已有 Node 或 DSH 自带运行时。
Code → Download ZIP 是源码，主要给开发者；安装用户优先下载 Releases 的完整包。
源码未附立绘时仍有中性背景可运行；完整主题包包含经过逐像素校验的无损 WebP。
从源码下载时，先运行 `node tools/build.mjs` 生成本地清单，再运行安装器；第一次体验优先使用已打包的完整主题。

## 安全安装与移除

- 默认安装到当前用户的 DSH desktop profile，支持自定义 DSH_HOME、profile 和数据目录。
- 原配置、旧链接先备份；只修改本主题的依赖、bundle 与带标记的主题启用区段。
- 重复安装不会重复注入；升级保留首次安装前的恢复基线。
- **Uninstall.cmd** 恢复原有主题配置与链接，保留图库和个人视频。
- **Check.cmd** 只报告状态，不修复、不重启、不修改配置。

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
~~~

当前基准宿主为 Windows / DSH 0.2.1-rc.2。安装与模拟验收不等于重启后的实机验收；其他版本请先作为兼容性测试使用。
GitHub 第一次使用见 [Kshine 的发布步骤](docs/GITHUB-FIRST-STEPS.md)。欢迎提交问题时附 DSH 版本、缩放比例与复现步骤。

## 来源与许可

本项目不代表 HoYoverse / miHoYo 或 DeepSeek 官方。项目自身代码和原创框饰沿用 CC BY-NC-SA 4.0；字体、可选开屏代码及角色相关美术分别见 [NOTICE](NOTICE.md)。
官方 PV、第三方同人镜图、私人图库、旧聊天截图均不在分享包内。角色形象的相关权利不因项目代码许可证而转移。
