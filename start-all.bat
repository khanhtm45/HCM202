@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  HCM202 — Khoi dong tat ca module (hub + 6 app)...
echo.
node start-all.mjs %*
if errorlevel 1 pause
