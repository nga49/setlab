@echo off
rem Turns playlists exported by the phone app (setlab-*.xml in Downloads, or files
rem dropped on this icon) into %USERPROFILE%\Music\setlab\setlab-playlists.xml for rekordbox.
setlocal
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
set "APPDIR=%APPDATA%\setlab-sync"
if not exist "%APPDIR%\venv\Scripts\python.exe" (
  echo Run install.bat first.
  pause
  exit /b 1
)
"%APPDIR%\venv\Scripts\python.exe" "%APPDIR%\setlab_sync.py" --playlists %*
echo.
echo In rekordbox: open the "rekordbox xml" section in the tree (left), find SETLAB, right-click the playlist, Import Playlist.
pause
