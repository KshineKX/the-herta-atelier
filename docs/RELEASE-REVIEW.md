# 正式作品发布前审查

时间：2026-10-20。维护署名：Kshine；项目：The Herta Atelier / 大黑塔·天才书房。

当前结论：可本机试用的 beta；尚不具备对外宣称“稳定正式版、全媒体已清权”的证据。私有仓库不等于版权授权，也不等于稳定验收。

## 已补齐

- 阅读保护、可移植数据目录、安装卸载、升级基线、失败恢复及测试。
- 三场景原图保留；无损压缩逐像素核对。未把超分称作原生高分辨率作画。
- 代码、字体、上游 MIT 开屏与 SDK 各留许可；第三方个人媒体不混入源码。
- 发现并修正源码忽略规则误排离线 SDK 的 dist 目录；补齐开屏 bundle patch，并验证所有导出、打包入口真实存在。
- 补充 CONTRIBUTING、SECURITY、SUPPORT、维护流程、素材台账和问题模板。
- 公共候选 core 不含待审人物画像与含图截图；个人媒体包需要显式 --personal，不默认输出可外传的全图包。
- CI 只读权限，包含构建、回归、入口完整性、三个开屏套件与 core 打包。远端 CI 仍须在推送后观察实际结果。

## 发布门槛

| 项目 | 状态/完成条件 |
|---|---|
| 软件代码许可证 | 已由 Kshine 选择非商业与署名；自有代码落实为 PolyForm Noncommercial 1.0.0 |
| 美术与图片 | 自有原创元素与第三方元素分列；三组人物图、参考与截图的再分发权待核实，不能统称已授权原创 |
| 本机冷启动 | 需要用户方便时完全退出再打开 DSH，检查 reading、深浅、输入框、侧栏和标题栏 |
| 跨机器与 DPI | 至少一次其他 Windows 机器安装/卸载和常见缩放反馈，才提升稳定性声明 |
| GitHub | 先保持私有；提交与实际远端哈希、CI 结果分开核对；公开范围和版本附件另行确认 |

## 已确定的许可方向

- 作者有权授权的代码：PolyForm Noncommercial 1.0.0，限允许的非商业用途，保留许可及 Kshine 的 Required Notice；第三方代码沿用原许可。
- 作者有权授权的独立原创美术：CC BY-NC-SA 4.0；它只覆盖可授权的贡献，不覆盖其他作者或角色 IP 的权利。
- 来源/许可未确定的第三方图：个人媒体，先不纳入公开分发。重新生成、标来源、免费分享均不自动补齐上游许可。

本项目按源码可用的非商业许可发布，不宣称为 OSI 开源项目。正式公开和人物素材包发布仍需另行确认；源码私有上传按此前授权执行。

参考：[GitHub 许可说明](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)、[CC 软件与素材 FAQ](https://creativecommons.org/faq/)、[WIPO 生成式 AI 指引](https://www.wipo.int/edocs/mdocs/mdocs/en/wipo_webinar_ft_24_1/wipo_webinar_ft_24_1_guidelines.pdf)。
