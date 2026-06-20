#!/bin/bash
set -e

cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo "[setup] Creating virtual environment..."
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi

PORT=${PORT:-3001}
echo "[start] Killing any process on port $PORT..."
lsof -ti :$PORT | xargs kill -9 2>/dev/null || true

echo "[start] SnapTag Python API on port $PORT"
.venv/bin/python main.py
