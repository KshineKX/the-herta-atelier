param([string]$DshHome='',[string]$Profile='desktop',[string]$Backup='',[string]$DataDir='',[switch]$Apply)
$ErrorActionPreference='Stop'
try {
  $hertaRepairRoot=Split-Path $PSScriptRoot -Parent
  $hertaRepairManifest=Get-Content -LiteralPath (Join-Path $hertaRepairRoot 'recovery-manifest.json') -Raw -Encoding utf8 | ConvertFrom-Json
  if($hertaRepairManifest.schemaVersion -ne 1 -or !$hertaRepairManifest.version -or $hertaRepairManifest.targetReceipt -ne '0.4.0-beta.10'){throw 'Unsupported recovery manifest.'}
  $hertaRepairAllowed=@('tools/copy-tree.mjs','tools/trial.mjs','tools/profile.mjs','tools/host.mjs','tools/host-inspect.mjs','tools/read-asar.mjs','tools/recovery-files.mjs','tools/transaction.mjs','tools/manage.mjs','tools/bootstrap.ps1','tools/installed-action.ps1')
  if((($hertaRepairManifest.files.path | Sort-Object) -join ',') -cne (($hertaRepairAllowed | Sort-Object) -join ',')){throw 'Incomplete recovery manifest.'}
  foreach($hertaRepairEntry in $hertaRepairManifest.files){
    if($hertaRepairEntry.path -notin $hertaRepairAllowed){throw 'Unexpected recovery file.'}
    $hertaRepairFile=Join-Path $hertaRepairRoot $hertaRepairEntry.path
    $hertaRepairStream=[IO.File]::OpenRead($hertaRepairFile)
    $hertaRepairHasher=[Security.Cryptography.SHA256]::Create()
    try{$hertaRepairHash=[BitConverter]::ToString($hertaRepairHasher.ComputeHash($hertaRepairStream)).Replace('-','').ToLowerInvariant()}
    finally{$hertaRepairStream.Dispose();$hertaRepairHasher.Dispose()}
    if($hertaRepairHash -ne $hertaRepairEntry.sha256){throw ('Recovery file integrity mismatch: '+$hertaRepairEntry.path)}
  }
  $hertaRepairArgs=@{Action='recover-beta10';DshHome=$DshHome;Profile=$Profile;Backup=$Backup;DataDir=$DataDir}
  if($Apply){$hertaRepairArgs.Apply=$true}
  & (Join-Path $PSScriptRoot 'bootstrap.ps1') @hertaRepairArgs
  exit $LASTEXITCODE
}catch{Write-Host ('Herta beta.10 recovery: '+$_.Exception.Message);exit 2}
