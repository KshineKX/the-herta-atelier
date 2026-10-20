param([Parameter(Mandatory=$true)][string]$InputDir,[Parameter(Mandatory=$true)][string]$OutputFile)
$ErrorActionPreference='Stop'
Compress-Archive -LiteralPath $InputDir -DestinationPath $OutputFile -Force
