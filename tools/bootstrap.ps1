param([ValidateSet('install','uninstall','doctor','gallery','import-video','rollback','recover-beta10','recover-install')][string]$Action='doctor',[switch]$Apply,[switch]$WithBoot,[switch]$Open,[string]$InputFile='',[string]$DshHome='',[string]$Profile='desktop',[string]$Backup='',[string]$DataDir='')
$ErrorActionPreference='Stop'
try {
  $hertaRoot=Split-Path $PSScriptRoot -Parent
  $hertaDshRoot=$DshHome
  if(!$hertaDshRoot){if($env:DSH_HOME){$hertaDshRoot=$env:DSH_HOME}else{$hertaDshRoot=Join-Path $env:USERPROFILE '.dsh'}}
  $hertaCandidate=Join-Path $hertaDshRoot 'dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
  $hertaNode=if(Test-Path -LiteralPath $hertaCandidate){$hertaCandidate}else{''}
  if(!$hertaNode){$hertaCommand=Get-Command node.exe -ErrorAction SilentlyContinue;if($hertaCommand){$hertaNode=$hertaCommand.Source}}
  if(!$hertaNode){throw 'Node.js 22.19+ (22.x) or 24+ was not found. Start DSH once or install a supported Node.js, then retry.'}
  $hertaVersionText=& $hertaNode --version
  $hertaMatch=[regex]::Match($hertaVersionText,'^v(\d+)\.(\d+)')
  if(!$hertaMatch.Success){throw 'Cannot read Node.js version.'}
  $hertaMajor=[int]$hertaMatch.Groups[1].Value
  $hertaMinor=[int]$hertaMatch.Groups[2].Value
  if(!(($hertaMajor -eq 22 -and $hertaMinor -ge 19) -or $hertaMajor -ge 24)){throw 'Node.js 22.19+ (22.x) or 24+ is required.'}
  $hertaArgs=@((Join-Path $hertaRoot 'tools\manage.mjs'),$Action,'--dsh-home',$hertaDshRoot,'--profile',$Profile)
  if($Apply){$hertaArgs+='--apply'}
  if($WithBoot){$hertaArgs+='--with-boot'}
  if($Open){$hertaArgs+='--open'}
  if($InputFile){$hertaArgs+=@('--file',$InputFile)}
  if($Backup){$hertaArgs+=@('--backup',$Backup)}
  if($DataDir){$hertaArgs+=@('--data-dir',$DataDir)}
  & $hertaNode @hertaArgs
  exit $LASTEXITCODE
}catch{Write-Host ('Herta Atelier: '+$_.Exception.Message);exit 2}
