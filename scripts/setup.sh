#!/usr/bin/env bash
set -e

echo "=========================================="
echo "  Setting up MPLADS AI Monitoring System  "
echo "=========================================="

# Create python virtual environment if not exists
if [ ! -d "backend/venv" ]; then
    echo "Creating Python virtual environment in backend/venv..."
    python3 -m venv backend/venv
fi

echo "Installing backend and AI engine dependencies..."
source backend/venv/bin/activate
pip install -r backend/requirements.txt
pip install -r ai-engine/requirements.txt

echo "Initializing SQLite database with schema and seeds..."
python3 -c "
import sys; sys.path.append('backend')
from app.core.database import init_db
init_db()
print('Database initialized successfully.')
"

# Setup frontend
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo "=========================================="
echo "  Setup Complete! Run scripts/start-dev.sh"
echo "=========================================="
