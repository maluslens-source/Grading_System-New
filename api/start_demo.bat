@echo off
title Apple Grade Demo API
cd /d "%~dp0\.."
echo.
echo ========================================
echo   Apple Tray Grading — Demo API
echo ========================================
echo.
echo Starting server on http://127.0.0.1:8000
echo.
echo   Test page : http://127.0.0.1:8000/test
echo   API docs  : http://127.0.0.1:8000/docs
echo   Grade API : POST /api/v1/grade
echo.
echo Keep this window OPEN while demo runs.
echo Press Ctrl+C to stop.
echo ========================================
echo.
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
pause
