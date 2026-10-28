> 许可变更（2026-10-28）：作者有权授权的贡献已改为 **MIT**；本文件以下涉及旧许可证的描述仅适用于历史发行版（beta.14 及以前）。详见 [docs/LICENSE-CHANGE-2026-10-28.md](docs/LICENSE-CHANGE-2026-10-28.md)。

# 参与维护

维护者：Kshine；代码仓库为 KshineKX/the-herta-atelier。先用 Issues 描述问题或提议，较大改动先确认范围；一次提交解决一个明确问题。

## 修改与验证

从仓库检出后运行 `node tools/build.mjs`。源码不附个人画像、图库或视频；缺少画像会使用中性背景。日常修改在 `packages/skin/src` 或 `packages/boot/src`，重新构建对应 `lib`。

提交前运行 `node --test tests/*.test.mjs`、`node tools/verify.mjs`；修改开屏时还要运行 `packages/boot/verify` 下三个验证脚本。使用临时 profile 验证安装器，禁止把个人 DSH profile 当测试夹具。

说明改了什么、为什么改、已验证什么与仍待验证什么。真实 DSH 重启、缩放与性能测试单独记录，不能用编译成功代替。

## 素材与贡献权利

仅提交你有权贡献的内容，并注明来源、许可和修改。第三方作品、AI 素材与字体都需要分别核对；没有版权声明不等于已取得再分发许可。角色与商标权不随代码许可证转移。

贡献适用其所在文件的现有许可：项目自有代码为 PolyForm Noncommercial 1.0.0，独立原创框饰为 CC BY-NC-SA 4.0；第三方目录遵循原许可。提交时说明你有权贡献并愿意按对应许可提供。没有额外 CLA 或版权转让要求。

请围绕具体问题交流，尊重作者与使用者，不发布凭据、私人聊天或未经同意的个人资料。
