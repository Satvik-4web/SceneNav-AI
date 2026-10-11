@echo off
title SceneNav AI — Backend Server
echo ===================================================
echo Starting SceneNav AI Backend Server (FastAPI)
echo http://127.0.0.1:8000/docs
echo ===================================================
set "PYTHONPATH=%~dp0backend"
cd /d "%~dp0"
python -m uvicorn app.main:app --app-dir "%~dp0backend" --host 127.0.0.1 --port 8000 --reload
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Backend server exited with error code %ERRORLEVEL%.
)
pause
