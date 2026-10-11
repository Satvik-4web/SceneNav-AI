@echo off
title SceneNav AI — Full Application Launcher
echo ===================================================
echo Launching SceneNav AI (Backend + Frontend)
echo ===================================================

echo [1/2] Launching Backend on http://127.0.0.1:8000 ...
start "SceneNav AI Backend" cmd /k "set PYTHONPATH=%~dp0backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

echo [2/2] Launching Frontend on http://localhost:5173 ...
start "SceneNav AI Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both servers started in separate windows!
echo Open your browser to: http://localhost:5173
echo.
pause
