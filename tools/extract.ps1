param([Parameter(Mandatory=$true)][string]$ZipPath,[Parameter(Mandatory=$true)][string]$Destination)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$hertaTarget=[IO.Path]::GetFullPath($Destination)
if(Test-Path -LiteralPath $hertaTarget){throw 'Extraction target already exists.'}
$hertaArchive=[IO.Compression.ZipFile]::OpenRead([IO.Path]::GetFullPath($ZipPath))
try{
 $hertaSeen=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
 $hertaEntries=@();[long]$hertaExpanded=0
 foreach($hertaEntry in $hertaArchive.Entries){
  $hertaName=$hertaEntry.FullName.Replace('\','/')
  if(!$hertaName){continue}
  if($hertaName.StartsWith('/') -or $hertaName -match '[<>:"|?*\x00-\x1f]' -or ($hertaName.Split('/') -contains '..') -or (($hertaEntry.ExternalAttributes -shr 16) -band 0xF000) -eq 0xA000){throw 'Unsafe ZIP entry.'}
  $hertaFile=[IO.Path]::GetFullPath((Join-Path $hertaTarget $hertaName.Replace('/',[IO.Path]::DirectorySeparatorChar)))
  if(!$hertaFile.StartsWith($hertaTarget+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or !$hertaSeen.Add($hertaFile)){throw 'Escaping or duplicate ZIP path.'}
  $hertaExpanded+=$hertaEntry.Length
  if($hertaExpanded -gt 4GB -or $hertaEntries.Count -gt 50000){throw 'Archive expansion limit.'}
  $hertaEntries+=@{Entry=$hertaEntry;File=$hertaFile;Directory=$hertaName.EndsWith('/')}
 }
 [IO.Directory]::CreateDirectory($hertaTarget)|Out-Null
 foreach($hertaItem in $hertaEntries){if($hertaItem.Directory){[IO.Directory]::CreateDirectory($hertaItem.File)|Out-Null;continue};[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($hertaItem.File))|Out-Null;$hertaInput=$hertaItem.Entry.Open();$hertaOutput=[IO.File]::Open($hertaItem.File,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write);try{$hertaInput.CopyTo($hertaOutput)}finally{$hertaInput.Dispose();$hertaOutput.Dispose()}}
}finally{$hertaArchive.Dispose()}
