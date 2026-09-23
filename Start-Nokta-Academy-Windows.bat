@echo off
setlocal
chcp 65001 >nul

set "ROOT=%~dp0"
set "SCRIPT=%ROOT%scripts\Start-Nokta-Academy-Offline.ps1"

if not exist "%SCRIPT%" (
  echo Offline launcher was not found:
  echo %SCRIPT%
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
endlocal
