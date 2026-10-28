# The Herta Atelier · 一条命令安装
# 用法（先完全退出 DSH）：
#   irm https://raw.githubusercontent.com/KshineKX/the-herta-atelier/main/install.ps1 | iex
# 可选：
#   irm ... -OutFile install.ps1; .\install.ps1 -NoInstall     # 只下载解压
#   .\install.ps1 -Core                                       # 只下 0.4MB 核心包
#   $env:HTTPS_PROXY='http://127.0.0.1:7890'; .\install.ps1    # 走代理
param(
  [string]$Tag = 'v0.4.0-beta.14',
  [switch]$Core,
  [switch]$NoInstall
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$repo = 'KshineKX/the-herta-atelier'
$version = $Tag.TrimStart('v')
$kind = if ($Core) { 'core' } else { 'theme' }
$assetName = "The-Herta-Atelier-$version-$kind.zip"
$baseUrl = "https://github.com/$repo/releases/download/$Tag"
$tempRoot = Join-Path $env:TEMP "the-herta-atelier-$version"
$zipPath = Join-Path $tempRoot $assetName
$shaName = "The-Herta-Atelier-$version-$kind.sha256"`n$shaPath = Join-Path $tempRoot $shaName
$extractDir = Join-Path $tempRoot 'extracted'

function Download-File([string]$Url, [string]$OutFile) {
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutFile) | Out-Null
  if (Test-Path $OutFile) { Remove-Item $OutFile -Force }
  $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
  for ($i = 0; $i -lt 3; $i++) {
    try {
      if ($curl) {
        $proxyArgs = @()
        if ($env:HTTPS_PROXY) { $proxyArgs = @('--proxy', $env:HTTPS_PROXY) }
        & curl.exe -L --fail --retry 2 --connect-timeout 20 --max-time 900 @proxyArgs -o $OutFile $Url
        if ($LASTEXITCODE -eq 0 -and (Test-Path $OutFile) -and (Get-Item $OutFile).Length -gt 0) { return }
      } else {
        Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing
        if (Test-Path $OutFile) { return }
      }
    } catch {
      Write-Host "下载失败，第 $($i + 1) 次重试：$Url"
    }
    Start-Sleep -Seconds 2
  }
  throw "下载失败（已重试 3 次）：$Url"
}

Write-Host "The Herta Atelier 安装器"
Write-Host "版本: $Tag ($kind)"
Write-Host "下载: $baseUrl/$assetName"

Download-File "$baseUrl/$assetName" $zipPath
Download-File "$baseUrl/$shaName" $shaPath

# 校验 SHA256（sha 文件第一段是哈希）
$expected = (Get-Content $shaPath -Raw).Trim().Split()[0].ToLowerInvariant()
$actual = (Get-FileHash -Algorithm SHA256 -Path $zipPath).Hash.ToLowerInvariant()
if ($expected -ne $actual) {
  throw "SHA256 校验失败：期望 $expected，实际 $actual。已保留下载文件供核对：$zipPath"
}
Write-Host "SHA256 校验通过：$actual"

if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

$installCmd = Get-ChildItem -Path $extractDir -Recurse -Filter 'Install.cmd' -File -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $installCmd) { throw "解压后找不到 Install.cmd：$extractDir" }

if ($NoInstall) {
  Write-Host ""
  Write-Host "已下载并解压，未安装。"
  Write-Host "安装入口：$($installCmd.FullName)"
  return
}

$dsh = Get-Process | Where-Object { $_.ProcessName -like 'DeepSeek Harness*' }
if ($dsh) {
  throw "检测到 DSH 正在运行。请先保存工作并完全退出 DSH，再重新运行本脚本。安装入口：$($installCmd.FullName)"
}

Write-Host ""
Write-Host "开始安装（会备份配置并校验）..."
Push-Location $installCmd.Directory.FullName
try {
  & cmd.exe /c "`"$($installCmd.FullName)`""
  Write-Host "安装器退出码：$LASTEXITCODE"
} finally {
  Pop-Location
}
Write-Host ""
Write-Host "完成。重新打开 DSH 即可在皮肤设置里看到 The Herta Atelier。"
