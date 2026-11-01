@echo off
rem SETLAB sync installer. Double-click me. No admin rights needed.
setlocal
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
echo.
echo   SETLAB sync installer
echo   ---------------------
echo.
set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY where python >nul 2>nul && set "PY=python"
if not defined PY goto nopython
%PY% -c "import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)"
if errorlevel 1 goto nopython

set "APPDIR=%APPDATA%\setlab-sync"
if not exist "%APPDIR%" mkdir "%APPDIR%"
rem A watcher from an earlier install keeps the Python files busy: stop it first.
if exist "%APPDIR%\venv\Scripts\python.exe" "%APPDIR%\venv\Scripts\python.exe" "%~dp0setlab_sync.py" --stop-watch >nul 2>nul
echo [1/5] Creating a private Python environment...
%PY% -m venv "%APPDIR%\venv"
if errorlevel 1 goto fail
echo [2/5] Installing pyrekordbox (this can take a minute)...
"%APPDIR%\venv\Scripts\python.exe" -m pip install --quiet --upgrade pip
"%APPDIR%\venv\Scripts\python.exe" -m pip install --quiet -r "%~dp0requirements.txt"
if errorlevel 1 goto fail
copy /Y "%~dp0setlab_sync.py" "%APPDIR%\" >nul
copy /Y "%~dp0camelot.py" "%APPDIR%\" >nul
copy /Y "%~dp0keys.json" "%APPDIR%\" >nul
echo [3/5] Your GitHub token A and data repo:
"%APPDIR%\venv\Scripts\python.exe" "%APPDIR%\setlab_sync.py" --setup
if errorlevel 1 goto fail
echo [4/5] Automatic sync: each time you close rekordbox, and once at logon...
"%APPDIR%\venv\Scripts\python.exe" "%APPDIR%\setlab_sync.py" --install-schedule
if errorlevel 1 goto fail
echo [5/5] First sync now...
"%APPDIR%\venv\Scripts\python.exe" "%APPDIR%\setlab_sync.py"
if errorlevel 1 goto syncfail
echo.
echo   Done. Add and analyze tracks in rekordbox as usual: the app gets them
echo   each time you close rekordbox.
echo.
pause
exit /b 0

:nopython
echo.
echo   Python 3.11 or newer is needed and was not found.
echo   Install it from python.org (tick "Add Python to PATH"), or run:
echo     winget install -e --id Python.Python.3.12
echo   Then double-click install.bat again.
echo.
pause
exit /b 1

:syncfail
echo.
echo   Installed, but the first sync failed. The reason is above and in:
echo     %APPDATA%\setlab-sync\sync.log
echo   Open rekordbox once, close it, then double-click install.bat again.
echo.
pause
exit /b 1

:fail
echo.
echo   Something went wrong (see the message above). Nothing else was changed.
echo.
pause
exit /b 1
