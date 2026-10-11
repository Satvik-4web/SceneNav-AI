@echo off
title SceneNav AI — Automated Test Suite
echo ===================================================
echo Running SceneNav AI Automated Tests
echo ===================================================
set PYTHONPATH=%~dp0backend
echo [1/2] Running Backend Tests (pytest)...
python -m pytest backend/tests/ -v
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Backend tests failed!
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Running Frontend Tests (vitest)...
cd /d "%~dp0frontend"
npm test
echo.
echo All automated test suites passed successfully!
pause
