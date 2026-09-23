@echo off
title Nokta - Check Android devices
cd /d "%~dp0..\.."
echo.
echo === Flutter devices ===
flutter devices
echo.
echo === ADB devices (SDK platform-tools) ===
set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
if exist "%ADB%" (
  "%ADB%" devices
) else (
  echo adb not found at %ADB%
  echo Install Android SDK Platform-Tools in Android Studio SDK Manager.
)
echo.
set /p launch=Start emulator Pixel_4a now? [y/N]: 
if /i "%launch%"=="y" (
  flutter emulators --launch Pixel_4a
  echo Waiting 25s for boot...
  timeout /t 25 /nobreak >nul
  flutter devices
)
echo.
pause
