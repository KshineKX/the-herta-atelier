# 安装、升级和回滚

## 双击安装

先完整退出 DSH。解压完整包，运行 Install.cmd，检查输出是否成功，然后重新打开 DSH。不要直接在压缩包内双击脚本。
安装完成后源码目录可以移走：运行文件已复制到用户数据目录的 versions 子目录。
默认数据目录为 DSH_HOME/herta-atelier；未设置 DSH_HOME 时使用用户目录下 .dsh/herta-atelier。
个人图库默认在数据目录的 gallery，个人开屏在 boot-videos。环境变量 HERTA_ATELIER_HOME 可覆盖本主题数据根目录。

## 自定义位置

~~~powershell
node tools/manage.mjs install --dsh-home "你的DSH目录" --profile desktop
node tools/manage.mjs install --dsh-home "你的DSH目录" --profile desktop --apply
node tools/manage.mjs gallery --set "你的图库绝对路径" --apply
~~~

第一条只预览计划；第二条才写入。也可在数据目录 settings.json 设置 galleryDirectory。
安装器不修改模型、API、账号、自动任务或其他 provider 设置。备份包含你原来的 profile 文件，只保留在本机数据目录。

## 发生问题时

1. 保存 Install.cmd / Check.cmd 输出和报错，不要反复强行覆盖。
2. 新版本安装失败会恢复本次开始前的配置与目录链接。
3. 正常卸载用 Uninstall.cmd；它移除本项目管理区段并恢复首次安装前的同名依赖和链接。
4. 手动改动过本项目依赖或管理区段时，工具会停止，避免覆盖你的修改。参考数据目录 backups 中的原文件核对。
5. 用户在安装后添加的其他依赖和无关 YAML 行会保留；图库、视频、旧版本目录也会保留。

不自动重启 DSH，不递归清理用户数据。要清理备份/旧版本，请先确认已经不需要回滚。

## 可选开屏

ImportVideo.cmd 只复制你选择的个人视频，不下载素材、不转码。InstallWithBoot.cmd 检查有无视频，以及随包固定的 MIT schema 依赖是否完整。
通过后，开屏代码与视频目录分离，升级不会覆盖视频。已有可选开屏的受管安装会在普通升级中保留。

## beta.10 完整动态包

Install.cmd 联合安装代码与随包的 13 段视频，不需要开发机或本地预览服务。安装前完全退出 DSH。Rollback.cmd 恢复本次升级前的 profile、链接和视频目录；若升级后用户改动这些受管内容会拒绝覆盖。Uninstall.cmd 恢复首次安装前的配置，保留个人图库、开屏和备份。不要先卸载再执行本次回退。

## beta.11：宿主移除注释后的回退与 beta.10 恢复

DSH 0.2.1-rc.3 真机验收中发现，宿主启动会去掉 `# BEGIN THE-HERTA-ATELIER MANAGED` / `# END THE-HERTA-ATELIER MANAGED` 两行注释。beta.11 仅允许这种精确变化；不忽略其他注释、空白或配置变动。重复安装和升级按已存受管内容识别归属，无关的后续用户配置会原样保留；精确回退遇到任何额外变化仍拒绝覆盖。

如果当前 beta.10 的回退因此被阻断：先完全退出 DSH，保留原 trial-backups，不要先安装 beta.11。下载完整 beta.11 包或同版小型 `beta10-rollback-repair.zip`，核对 SHA-256 后解压，运行 **RecoverBeta10.cmd**。它只使用修复后的工具读取原 beta.10 回执，验证 before 备份和安装后的所有保护信息，并直接恢复该回执记录的升级前状态（如 beta.8）；不会先安装 beta.11，也不把回退目标改成 beta.10。成功后回执 phase 正常标记 rolled-back，原 before 文件保持不变。

默认使用本机 `latest-trial-desktop.json` 指定的 beta.10 备份。指定备份、先只读检查：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\recover-beta10.ps1 -Backup "<原 beta.10 trial 备份目录>"
# 检查通过且 DSH 已退出后，在同一命令末尾追加 -Apply
```

可选参数 `-DshHome`、`-DataDir`、`-Profile` 用于已明确的其他安装位置。入口先核对修复工具哈希；缺文件、工具被改、备份损坏、媒体变化、用户后续修改都会报错并保留当前状态。不要删 receipt 或手改哈希来强行回退。修复工具需要声明的 Node.js 运行时，优先使用 DSH 自带版本。

安装 beta.11 后的 Rollback.cmd 仍只返回该次升级前状态；RecoverBeta10.cmd 专门处理原 beta.10 备份，二者不能混称。

### beta.11 动态互动

展开工具条可切换静态/动态和画像场景；镜子按钮固定保留，点击后才打开图库。设置里不再显示动作状态行或离席等动作按钮。动态模式下，150–240秒长待机后人物偶尔行动；也可在同一块空白背景1.6秒内故意轻触3次，单击/双击、正文、输入、控件和文本选择不会触发，互动冷却45秒。书房离席后20–30秒自动返回并落座。后台、系统减少动画、静态和卸载会取消低频等待，恢复后重新等待。
