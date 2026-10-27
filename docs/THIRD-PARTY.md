# 上游代码、角色素材与独立插件

本项目为《崩坏：星穹铁道》角色“大黑塔”的非官方同人桌面主题，与米哈游及HoYoverse无隶属或官方合作关系。© 米哈游版权所有。角色及所涉原作素材的权利由米哈游及相应权利人保留；其他内容的相关权利、利益分别由各自权利人享有。本项目仅就维护者有权授权的贡献提供许可，AI辅助生成、免费分发和本项目的许可证均不表示取得官方授权。

发布参考：[《崩坏：星穹铁道》同人衍生作品创作指引V3.0（2025-07-15）](https://www.bilibili.com/opus/1089707102255972370)。核对日期：2026-10-27。应按实际用途、地区和最新适用文本理解，不将实体周边问答直接扩大为所有免费数字主题的结论；商业用途或分发范围改变前须重新核对。

| 范围 | 原始来源与身份 | 许可与本项目处理 |
| --- | --- | --- |
| 可选开屏 | [lxj5820/dsh-boot-animation](https://github.com/lxj5820/dsh-boot-animation)，本包为Herta派生版本 | 保留 [MIT原文](../packages/boot/LICENSE)及原版权行；修改涵盖开屏交互、宿主接入、离线SDK与媒体检查。未携带上游开屏视频。原始上游提交未记录，不伪填当前HEAD；采用文件的确切内容身份由本版release-manifest.json的SHA-256记录 |
| 离线SDK | schemastery 3.18.5、cosmokit 1.8.6、standard-schema/spec 1.1.0 | 各自MIT原文保存在vendor包中，固定npm来源和SHA-512见[依赖台账](../packages/boot/vendor/DEPENDENCIES.json)；不改为作者非商业许可 |
| 字体和字标 | Cinzel Decorative、Noto Serif SC及标题子集 | 各自OFL原文、实际版权行和来源保留在[licenses目录](../packages/skin/licenses)与[素材归属](ASSET-ATTRIBUTION.md)；转路径字标不宣称官方标识 |
| 背景和动作视频 | 既有维护记录中的AI辅助画像及13段无声视频 | 制作来源不等于角色授权；见[素材台账](ASSET-RIGHTS.md)。本版不新增或替换媒体，不随包携带官方PV、私人图库、配音和用户素材 |
| DeepSeek余额小鲸鱼 | [MeteorNOX/DeepSeek-Balance-Whale-Widget](https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget) | 独立安装的兼容插件，不内置其代码或素材。代码[MIT](https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget/blob/main/LICENSE)须保留原版权及全文；图标、图片、动图、音效不在代码MIT覆盖范围，遵从[素材声明](https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget/blob/main/PROVENANCE.md)，不能直接提取再分发 |

维护者新增且有权授权的代码沿用PolyForm Noncommercial 1.0.0，独立框饰沿用所附CC BY-NC-SA 4.0；这些条款均不重新许可米哈游角色、上游MIT代码或字体。不存在全包统一改为Kshine独占版权的声明。

本表按本包实际采用的内容分类，不表示取得权利方单独授权。媒体清单和许可文件的构建检查证明文件身份与声明存在，不构成完整法律审计或跨地区用途保证。
