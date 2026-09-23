@echo off
title Nokta Academy - Android Emulator
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\android\start-android-emulator.ps1"
if errorlevel 1 pause
