@echo off
title SceneNav AI — Backend Server
echo ===================================================
echo Starting SceneNav AI Backend Server (FastAPI)
echo http://127.0.0.1:8000/docs
echo ===================================================
set PYTHONPATH=%~dp0backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
