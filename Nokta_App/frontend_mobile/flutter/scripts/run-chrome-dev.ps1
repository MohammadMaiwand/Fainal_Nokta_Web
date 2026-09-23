# Run Nokta Flutter app in Chrome for login/API testing (development only).
$ErrorActionPreference = 'Stop'
$FlutterRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$RepoRoot = (Resolve-Path (Join-Path $FlutterRoot '..\..\..')).Path
$BackendPort = 8081
$VitePort = 5173
$FlutterWebPort = 59234
$HealthUrl = "http://127.0.0.1:$BackendPort/health"

function Test-Health {
  try {
    $r = Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 3
    return $r.StatusCode -eq 200
  } catch { return $false }
}

if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
  Write-Error 'Flutter SDK not found in PATH.'
}

if (-not (Test-Health)) {
  Write-Host "Starting dev stack (backend :$BackendPort + web :$VitePort) ..." -ForegroundColor Yellow
  Set-Location $RepoRoot
  if (-not (Test-Path 'node_modules')) { npm install }
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot'; npm run dev"
  $deadline = (Get-Date).AddSeconds(90)
  while ((Get-Date) -lt $deadline) {
    if (Test-Health) { break }
    Start-Sleep -Seconds 2
  }
  if (-not (Test-Health)) {
    Write-Error 'Dev stack did not start. From repo root: npm run dev'
  }
}

Set-Location $FlutterRoot
if (-not (Test-Path 'web')) {
  flutter create . --platforms=web
}
flutter pub get
Write-Host "Chrome: http://localhost:$FlutterWebPort (API: http://127.0.0.1:$VitePort/api)" -ForegroundColor Cyan
flutter run -d chrome `
  --web-port=$FlutterWebPort `
  --dart-define=APP_ENV=development
