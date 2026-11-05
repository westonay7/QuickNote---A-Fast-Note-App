@echo off
REM ============================================================
REM  QuickNote — stop the live preview
REM
REM  Stops the server on port 5173. It will start again the next
REM  time you log in (or if you run scripts\start-live-preview.cmd).
REM ============================================================

setlocal
echo [QuickNote] Stopping live preview on port 5173...

for /f "tokens=5" %%p in ('netstat -ano ^| findstr /c:":5173" ^| findstr /c:"LISTENING"') do (
  echo   stopping pid %%p
  taskkill /PID %%p /F >nul 2>&1
)

echo [QuickNote] Done.
endlocal
