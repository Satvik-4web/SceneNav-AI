@echo off
title SceneNav AI — Automated Test Suite
echo ===================================================
echo Running SceneNav AI Automated Tests
echo ===================================================
set "PYTHONPATH=%~dp0backend"
echo [1/2] Running Backend Tests (pytest)...
python -m pytest "%~dp0backend\tests" -v
set BACKEND_ERR=%ERRORLEVEL%
if %BACKEND_ERR% neq 0 (
    echo.
    echo [ERROR] Backend tests failed with exit code %BACKEND_ERR%!
    exit /b %BACKEND_ERR%
)

echo.
echo [2/2] Running Frontend Tests (vitest)...
cd /d "%~dp0frontend"
call npm test
set FRONTEND_ERR=%ERRORLEVEL%
if %FRONTEND_ERR% neq 0 (
    echo.
    echo [ERROR] Frontend tests failed with exit code %FRONTEND_ERR%!
    exit /b %FRONTEND_ERR%
)

echo.
echo All automated test suites passed successfully!
