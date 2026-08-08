@echo off
setlocal
cd /d "%~dp0"
title U.S.D Development Server

echo [U.S.D] Checking dependencies...
if not exist "node_modules\zustand\package.json" call npm.cmd install
if errorlevel 1 goto error

echo [U.S.D] Starting http://localhost:5173
call npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort --open

echo.
echo [U.S.D] Server stopped.
pause
exit /b 0

:error
echo.
echo [U.S.D] Failed to start. Check Node.js and npm.
pause
exit /b 1
