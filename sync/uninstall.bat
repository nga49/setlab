@echo off
rem Removes the SETLAB sync schedule and, if you confirm, its local files.
setlocal
chcp 65001 >nul
set "APPDIR=%APPDATA%\setlab-sync"
if exist "%APPDIR%\venv\Scripts\python.exe" "%APPDIR%\venv\Scripts\python.exe" "%APPDIR%\setlab_sync.py" --remove-schedule
schtasks /Delete /F /TN "SETLAB sync (every 2 hours)" >nul 2>nul
schtasks /Delete /F /TN "SETLAB sync (23:00)" >nul 2>nul
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\SETLAB sync.lnk" >nul 2>nul
set /p ANSWER=Also delete the token and local files in %APPDIR%? (y/n) 
if /I "%ANSWER%"=="y" rmdir /S /Q "%APPDIR%"
echo Done. Your library on GitHub is untouched.
pause
