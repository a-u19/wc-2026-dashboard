#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Starting World Cup 2026 Dashboard..."

# Check .env exists
if [ ! -f "$ROOT/backend/.env" ]; then
  echo "ERROR: backend/.env not found. Copy backend/.env.example and add your API key."
  exit 1
fi

# Kill any leftover processes on exit
cleanup() {
  echo "Shutting down..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Backend
cd "$ROOT/backend"
if [ ! -d ".venv" ]; then
  echo "Creating Python venv..."
  python3 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
fi
echo "Starting backend on :8000..."
.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Frontend — build for prod on Linux (no interactive terminal for vite dev)
cd "$ROOT/frontend"
if [ ! -d "node_modules" ]; then
  echo "Installing npm deps..."
  npm install --silent
fi

# Serve pre-built dist with a simple static server if npx is available
echo "Building frontend..."
npm run build --silent

echo "Serving frontend on :5173..."
npx --yes serve dist --listen 5173 &
FRONTEND_PID=$!

echo ""
echo "Dashboard running at: http://$(hostname -I | awk '{print $1}'):5173"
echo "Press Ctrl+C to stop."
wait
