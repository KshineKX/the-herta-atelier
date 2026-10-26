@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\recover-beta10.ps1" -Apply
pause
