@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\bootstrap.ps1" -Action import-video -Apply -InputFile "%~1"
pause
