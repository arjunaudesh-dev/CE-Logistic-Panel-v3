@echo off
title CE Logistic Panel - Dev Mode (Port 8000)
cd /d "%~dp0"
echo ===================================================
echo   Starting CE Logistic Panel in Development Mode
echo   Port: 8000
echo   URL:  http://localhost:8000
echo ===================================================
npm run dev
pause
