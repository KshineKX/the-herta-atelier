# Kshine 的第一个 GitHub 作品

你维护的是 The Herta Atelier。GitHub 仓库存源码和历史，Releases 放给朋友下载的安装包。
朋友只需要下载压缩包，不需要学习 Git。最初也可以直接把完整 ZIP 发给朋友试用，GitHub 发布可以稍后完成。

## 第一次

1. 打开 [GitHub 注册页](https://github.com/signup)，注册自己的账号。用户名可与作品署名不同；密码、验证码、条款确认与授权由你自己完成。
2. 安装 GitHub Desktop 并登录，设置真实希望使用的 Git 作者身份或 GitHub 提供的隐私邮箱。
3. File → Add local repository，选择本项目目录。若未初始化，按提示创建本地仓库。
4. 检查 Changes：应只有源码、文档、原创矢量、字体许可证等。图片母版、视频、图库、运行备份不应出现。
5. 写首次提交，例如 Prepare the Herta Atelier beta，Commit 后点击 Publish repository。
6. 先检查仓库名、公开/私有范围、许可证和截图，再确认发布。不要把显示署名 Kshine 当成已经注册的 GitHub 用户名。

## 给朋友发布一个版本

先通过验收，再创建同版本 tag 和 GitHub Release。标题写版本与主要变化，上传 dist 里的 -theme.zip 与对应 .sha256，说明这是 beta、测试过的 DSH 版本与已知限制。
不用将大图和视频塞进 Git 历史；完整安装包走 Release 附件。源码包含三组主题画像与演示截图，CI 按默认设置构建完整 theme 包；个人图库、影片和运行数据不进仓库。

## 后续维护

改动 → 本地预览/测试 → Commit → 发布新版本。问题记录用 Issues；稳定前先让少量朋友反馈，不急着承诺全版本兼容。
公开发布、仓库权限和许可证变更都应由 Kshine 最后确认。本项目工具不会自动推送或创建公开仓库。

官方参考：
- https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-desktop
- https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases
