#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT/apps/web"
API_DIR="$ROOT/apps/api"

if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT/.env"
  set +a
fi

export CRM_DATABASE_PATH="${CRM_DATABASE_PATH:-$ROOT/data/crm.sqlite}"
export API_INTERNAL_URL="${API_INTERNAL_URL:-http://127.0.0.1:8000}"

if [ ! -d "$WEB_DIR/node_modules" ]; then
  (cd "$WEB_DIR" && npm ci)
fi
if [ ! -d "$API_DIR/.venv" ]; then
  uv sync --project "$API_DIR" --python 3.12
fi

uv run --project "$API_DIR" alembic -c "$API_DIR/alembic.ini" upgrade head

exec uv run --project "$API_DIR" python "$ROOT/scripts/dev_runner.py"
