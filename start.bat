@echo off
cd /d "%~dp0"

echo Starting World Cup 2026 Dashboard...
echo Root: %~dp0

if not exist "backend\.env" (
    echo.
    echo ERROR: backend\.env not found!
    echo Copy backend\.env.example to backend\.env and add your API key.
    pause
    exit /b 1
)

echo.
echo Starting Python backend on :8000...
start "WC Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --reload --port 8000"

timeout /t 2 /nobreak >/dev/null

echo Starting Vite frontend on :5173...
start "WC Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 4 /nobreak >/dev/null

echo.
echo Dashboard should be running at: http://localhost:5173
start http://localhost:5173
pause
