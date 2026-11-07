$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$webDir = Join-Path $root "apps/web"
$apiDir = Join-Path $root "apps/api"
$envFile = Join-Path $root ".env"

if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
            $name = $matches[1]
            $value = $matches[2].Trim().Trim('"').Trim("'")
            if (-not (Test-Path "Env:$name")) { Set-Item "Env:$name" $value }
        }
    }
}

if (-not $env:CRM_DATABASE_PATH) {
    $env:CRM_DATABASE_PATH = Join-Path $root "data/crm.sqlite"
}
if (-not $env:API_INTERNAL_URL) {
    $env:API_INTERNAL_URL = "http://127.0.0.1:8000"
}

if (-not (Test-Path (Join-Path $webDir "node_modules"))) {
    Push-Location $webDir
    try { npm ci } finally { Pop-Location }
}
if (-not (Test-Path (Join-Path $apiDir ".venv"))) {
    uv sync --project $apiDir --python 3.12
}

Push-Location $root
try {
    uv run --project $apiDir alembic -c (Join-Path $apiDir "alembic.ini") upgrade head
} finally {
    Pop-Location
}

uv run --project $apiDir python scripts/dev_runner.py
