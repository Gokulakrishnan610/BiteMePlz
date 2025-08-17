@echo off
echo Starting REC-KIOSK Backend Server with WebSocket Support...
echo.
echo IMPORTANT: This server supports WebSockets for real-time updates
echo DO NOT use 'python manage.py runserver' - it won't work with WebSockets
echo.
echo Starting Daphne ASGI server...
echo.

REM Change to the backend directory first
cd /d "%~dp0"
echo Current directory: %CD%
echo.

REM Check if we're in the right directory
if not exist "rec_kiosk" (
    echo ERROR: rec_kiosk directory not found!
    echo Make sure this script is in the backend folder.
    pause
    exit /b 1
)

echo ✅ Found rec_kiosk directory - starting server...
echo.

daphne -b 127.0.0.1 -p 8000 rec_kiosk.asgi:application

pause
