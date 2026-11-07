#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT/apps/web"
API_DIR="$ROOT/apps/api"
LOG_DIR="$ROOT/.dev"

mkdir -p "$LOG_DIR"
if [ ! -d "$WEB_DIR/node_modules" ]; then
  (cd "$WEB_DIR" && npm ci)
fi

export CRM_DATABASE_PATH="${CRM_DATABASE_PATH:-$ROOT/data/crm.sqlite}"
export API_INTERNAL_URL="${API_INTERNAL_URL:-http://127.0.0.1:8000}"

uv run --project "$API_DIR" uvicorn app.main:app --app-dir "$API_DIR" \
  --host 127.0.0.1 --port 8000 >"$LOG_DIR/api.out.log" 2>"$LOG_DIR/api.err.log" &
API_PID=$!

cleanup() {
  kill "$API_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "API: http://127.0.0.1:8000 (logs: $LOG_DIR)"
echo "Web: http://127.0.0.1:3000"
cd "$WEB_DIR"
npm run dev
