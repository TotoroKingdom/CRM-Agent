$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$webDir = Join-Path $root "apps/web"
$apiDir = Join-Path $root "apps/api"
$logDir = Join-Path $root ".dev"
$apiOut = Join-Path $logDir "api.out.log"
$apiErr = Join-Path $logDir "api.err.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
if (-not (Test-Path (Join-Path $webDir "node_modules"))) {
    Push-Location $webDir
    try { npm ci } finally { Pop-Location }
}

$env:CRM_DATABASE_PATH = Join-Path $root "data/crm.sqlite"
$env:API_INTERNAL_URL = "http://127.0.0.1:8000"
$api = Start-Process -FilePath "uv" `
    -ArgumentList @("run", "--project", $apiDir, "uvicorn", "app.main:app", "--app-dir", $apiDir, "--host", "127.0.0.1", "--port", "8000") `
    -WorkingDirectory $root -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $apiOut -RedirectStandardError $apiErr

try {
    Write-Host "API: http://127.0.0.1:8000 (logs: $logDir)"
    Write-Host "Web: http://127.0.0.1:3000"
    Push-Location $webDir
    try { npm run dev } finally { Pop-Location }
} finally {
    if (-not $api.HasExited) { Stop-Process -Id $api.Id }
}
