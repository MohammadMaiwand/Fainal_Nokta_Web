@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

title Nokta Academy - Start Program

if not exist "%~dp0Start_Program.py" (
  echo Start_Program.py was not found next to this BAT file.
  pause
  exit /b 1
)

where py >nul 2>&1
if %ERRORLEVEL%==0 (
  py -3 "%~dp0Start_Program.py"
  set "EXITCODE=%ERRORLEVEL%"
  if not "%EXITCODE%"=="0" (
    echo.
    echo Start_Program exited with code %EXITCODE%.
    echo If tkinter is missing, reinstall Python 3.10+ with Tcl/Tk enabled.
    pause
  )
  exit /b %EXITCODE%
)

where python >nul 2>&1
if %ERRORLEVEL%==0 (
  python "%~dp0Start_Program.py"
  set "EXITCODE=%ERRORLEVEL%"
  if not "%EXITCODE%"=="0" (
    echo.
    echo Start_Program exited with code %EXITCODE%.
    echo If tkinter is missing, reinstall Python 3.10+ with Tcl/Tk enabled.
    pause
  )
  exit /b %EXITCODE%
)

where pythonw >nul 2>&1
if %ERRORLEVEL%==0 (
  start "" pythonw "%~dp0Start_Program.py"
  exit /b 0
)

echo.
echo Python was not found on this computer.
echo Install Python 3.10+ from https://www.python.org/downloads/
echo Make sure "Add python.exe to PATH" and Tcl/Tk are enabled.
echo.
pause
exit /b 1
