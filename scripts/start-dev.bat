@echo off
echo ========================================================
echo   Starting MPLADS AI Monitoring System (Dev Environment)
echo ========================================================

start "MPLADS Backend API" cmd /k "cd backend && python -m uvicorn app.main:app --reload --port 8000"
start "MPLADS Frontend Web" cmd /k "cd frontend && npm run dev"

echo Backend API launching at: http://localhost:8000/docs
echo Frontend Portal launching at: http://localhost:5173
