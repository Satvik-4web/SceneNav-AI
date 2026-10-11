@echo off
title SceneNav AI — Frontend Dashboard
echo ===================================================
echo Starting SceneNav AI Frontend Dashboard (Vite)
echo http://localhost:5173
echo ===================================================
cd /d "%~dp0frontend"
call npm run dev
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Frontend dev server exited with error code %ERRORLEVEL%.
)
pause
