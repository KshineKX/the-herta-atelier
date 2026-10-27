param([ValidateSet('doctor','rollback','uninstall','gallery','recover-install')][string]$Action='doctor')
$ErrorActionPreference='Stop'
try{
 $hertaLocation=Get-Content -Raw -Encoding utf8 -LiteralPath (Join-Path (Split-Path $PSScriptRoot -Parent) 'installed-location.json') | ConvertFrom-Json
 $hertaArgs=@{Action=$Action;DshHome=$hertaLocation.dshHome;Profile=$hertaLocation.profile;DataDir=$hertaLocation.dataDir}
 if($Action -in @('rollback','uninstall','recover-install')){$hertaArgs.Apply=$true}
 if($Action -eq 'gallery'){$hertaArgs.Open=$true}
 & (Join-Path $PSScriptRoot 'bootstrap.ps1') @hertaArgs
 exit $LASTEXITCODE
}catch{Write-Host ('Herta installed action: '+$_.Exception.Message);exit 2}
