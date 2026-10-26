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
