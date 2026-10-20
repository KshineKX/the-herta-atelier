# 来源、素材边界与许可

作者署名：Kshine。项目为非官方同人桌面主题，与 miHoYo/HoYoverse、DeepSeek 无隶属关系。
《崩坏：星穹铁道》及相关角色的权利属于相应权利方（© miHoYo）。本项目的署名与许可证不表示获得角色或商标的独占权。

| 范围 | 来源/许可 | 分发处理 |
|---|---|---|
| 皮肤自身代码、原创 SVG 框饰 | 本项目，沿用 CC BY-NC-SA 4.0 | 保留署名、修改说明和许可证 |
| 可选开屏代码 | lxj5820/dsh-boot-animation，MIT | packages/boot/LICENSE 保留上游原文；Herta 改动为 Kshine 定制 |
| Cinzel Decorative / Noto Serif SC 字形与字体子集 | SIL OFL 1.1 | packages/skin/licenses 保存原许可证与字体来源 |
| 三场景画像 | 本项目用 AI 辅助生成、修整和超分的非官方同人图 | 在完整主题包单独标明；角色相关权利仍属于相应权利方，不以代码许可证覆盖所有权利 |
| 官方 PV、私人同人镜图、第三方 Q 版贴纸 | 非本项目原创素材 | 不进入公开包；由使用者自行提供可使用的个人媒体 |
| 用户图库、视频、配置与备份 | 使用者本地数据 | 不提交 Git、不打进 Release、不在卸载时删除 |

LICENSE 的授权范围限于作者有权授权的项目贡献；字体和开屏遵循各自许可证。公开发布前应复核全部美术的来源与允许使用范围，不将非官方同人图称作官方授权素材。
HoYoverse 的[同人内容说明与完整指引入口](https://support.hoyoverse.com/hc/en-us/articles/51005649400729-What-are-the-guidelines-for-creating-and-selling-fan-made-content)供发布前核对；本项目不将其中的规则解释为已经取得单独授权。
字体转路径字标是 OFL 字体近似设计，不是 HoYoverse 官方字标。无损 WebP 已逐像素校验，与本地 PNG 母版一致；AI 超分不是原生高分辨率作画。

可选开屏还随附 MIT 许可的 @deepseek-ai/schemastery 3.18.5、@deepseek-ai/cosmokit 1.8.6、@standard-schema/spec 1.1.0。原许可证保存在各 vendor/packages 子目录，精确版本、来源和 npm SHA-512 完整性记录见 packages/boot/vendor/DEPENDENCIES.json。安装只复制到本插件的局部 node_modules，不修改宿主或用户全局依赖。
