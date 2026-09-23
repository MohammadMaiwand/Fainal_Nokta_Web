# Full release verification for Nokta Academy (Windows PowerShell)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

function Run-Step($label, $command, $cwd) {
  Write-Host "`n==> $label" -ForegroundColor Cyan
  Push-Location $cwd
  try {
    Invoke-Expression $command
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $command" }
  } finally {
    Pop-Location
  }
}

Run-Step "Backend lint" "npm run lint" (Join-Path $root "backend")
Run-Step "Backend build" "npm run build" (Join-Path $root "backend")
Run-Step "Backend tests" "npm run test" (Join-Path $root "backend")
Run-Step "Frontend typecheck" "npm run typecheck" (Join-Path $root "frontend")
Run-Step "Frontend tests" "npm run test" (Join-Path $root "frontend")
Run-Step "Frontend validate-permissions" "npm run validate-permissions" (Join-Path $root "frontend")
Run-Step "Frontend validate-translations" "npm run validate-translations" (Join-Path $root "frontend")
Run-Step "Frontend offline smoke" "npm run test:offline" (Join-Path $root "frontend")
Run-Step "Frontend build" "npm run build" (Join-Path $root "frontend")

Write-Host "`nAll release verification steps passed." -ForegroundColor Green
