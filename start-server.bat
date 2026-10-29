@echo off
title CE Logistic Panel - Production Server (Port 8000)
cd /d "%~dp0"
echo ===================================================
echo   Starting CE Logistic Panel - Production Server
echo   Port: 8000
echo   URL:  http://localhost:8000
echo   XAMPP: http://localhost/CMSys%%20Logistics/
echo ===================================================
set PORT=8000
set NODE_ENV=production
node .next\standalone\server.js
pause
