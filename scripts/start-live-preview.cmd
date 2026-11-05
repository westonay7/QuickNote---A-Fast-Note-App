@echo off
REM ============================================================
REM  QuickNote — live preview launcher
REM
REM  Serves the app at http://localhost:5173 (Vite dev, hot reload).
REM  Safe to run repeatedly: if the port is already in use the script
REM  exits instead of starting a second copy.
REM
REM  A short startup line is appended to
REM  %LOCALAPPDATA%\quicknote-preview.log so the hidden
REM  autostart at login is diagnosable.
REM
REM  Node resolution order:
REM    1. %LOCALAPPDATA%\Programs\quicknote-node            (stable copy)
REM    2. %LOCALAPPDATA%\Temp\opencode\node-v24.22.0-win-x64 (portable)
REM ============================================================

setlocal
set "PROJECT=%~dp0.."
set "NODE_DIR=%LOCALAPPDATA%\Programs\quicknote-node"
set "LOGFILE=%LOCALAPPDATA%\quicknote-preview.log"

if not exist "%NODE_DIR%\node.exe" set "NODE_DIR=%LOCALAPPDATA%\Temp\opencode\node-v24.22.0-win-x64"

if not exist "%NODE_DIR%\node.exe" (
  echo [QuickNote] Node.js was not found. Looked in:
  echo   %LOCALAPPDATA%\Programs\quicknote-node
  echo   %LOCALAPPDATA%\Temp\opencode\node-v24.22.0-win-x64
  echo Install Node.js 20+ and try again.
  echo %DATE% %TIME% ERROR node not found >> "%LOGFILE%"
  exit /b 1
)

set "PATH=%NODE_DIR%;%PATH%"
cd /d "%PROJECT%"

REM Already listening on 5173? Then do nothing.
netstat -ano | findstr /c:":5173" | findstr /c:"LISTENING" >nul 2>&1
if %errorlevel%==0 (
  echo [QuickNote] Already running at http://localhost:5173
  echo %DATE% %TIME% already running >> "%LOGFILE%"
  exit /b 0
)

echo [QuickNote] Starting live preview on http://localhost:5173
echo [QuickNote] Using Node at %NODE_DIR%
echo %DATE% %TIME% starting (node %NODE_DIR%) >> "%LOGFILE%"
node "node_modules\vite\bin\vite.js" --port 5173 --strictPort

endlocal
