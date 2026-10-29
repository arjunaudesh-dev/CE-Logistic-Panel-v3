@echo off
title Stop CE Logistic Panel Server
echo ===================================================
echo   Stopping CE Logistic Panel on Port 8000
echo ===================================================
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    echo Terminating PID %%a...
    taskkill /F /PID %%a 2>nul
)
echo Server stopped.
timeout /t 2 >nul
