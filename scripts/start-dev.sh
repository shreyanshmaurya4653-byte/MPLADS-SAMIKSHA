#!/usr/bin/env bash
echo "Starting Backend API on port 8000..."
source backend/venv/bin/activate
uvicorn app.main:app --app-dir backend --reload --port 8000 &
BACKEND_PID=$!

echo "Starting Frontend Development Server on port 5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
