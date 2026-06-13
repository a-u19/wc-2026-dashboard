# World Cup 2026 Dashboard - Start Script
$root = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$backendPath = Join-Path $root "backend"
$frontendPath = Join-Path $root "frontend"
$currentPath = $env:PATH

Write-Host "Starting World Cup 2026 Dashboard..." -ForegroundColor Green
Write-Host "Root: $root" -ForegroundColor DarkGray

# Start Python backend — use 'python -m uvicorn' so PATH issues don't matter
Write-Host "`nStarting Python backend on :8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
  "`$env:PATH = '$currentPath'; Set-Location '$backendPath'; python -m uvicorn main:app --reload --port 8000"

Start-Sleep -Seconds 2

# Start frontend
Write-Host "Starting Vite frontend on :5173..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
  "`$env:PATH = '$currentPath'; Set-Location '$frontendPath'; npm run dev"

Start-Sleep -Seconds 3

Write-Host "`nDashboard running at: http://localhost:5173" -ForegroundColor Green
Start-Process "http://localhost:5173"
