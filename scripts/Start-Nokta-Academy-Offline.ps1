param(
  [int]$BackendPort = 8081,
  [int]$FrontendPort = 4173,
  [switch]$Rebuild,
  [switch]$NoPause
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$backendDir = Join-Path $root 'backend'
$frontendDir = Join-Path $root 'frontend'
$runtimeDir = Join-Path $root '.offline-runtime'
$backendLog = Join-Path $runtimeDir 'backend.log'
$backendErr = Join-Path $runtimeDir 'backend.err.log'
$frontendLog = Join-Path $runtimeDir 'frontend.log'
$frontendErr = Join-Path $runtimeDir 'frontend.err.log'

function Write-Step($message) {
  Write-Host "[Nokta] $message" -ForegroundColor Cyan
}

function Write-Ok($message) {
  Write-Host "[OK] $message" -ForegroundColor Green
}

function Write-Warn($message) {
  Write-Host "[WARN] $message" -ForegroundColor Yellow
}

function Fail($message) {
  Write-Host "[ERROR] $message" -ForegroundColor Red
  if (-not $NoPause) {
    Write-Host ''
    Write-Host 'Press Enter to close...'
    [void][Console]::ReadLine()
  }
  exit 1
}

function Test-Port($port) {
  $client = New-Object Net.Sockets.TcpClient
  try {
    $async = $client.BeginConnect('127.0.0.1', $port, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne(800, $false)) {
      return $false
    }
    $client.EndConnect($async)
    return $true
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

function Wait-Port($port, $name) {
  for ($i = 0; $i -lt 40; $i++) {
    if (Test-Port $port) {
      Write-Ok "$name is listening on port $port"
      return
    }
    Start-Sleep -Milliseconds 500
  }
  Fail "$name did not start on port $port. Check logs in $runtimeDir"
}

function Require-Command($command, $installHint) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
    Fail "$command was not found. $installHint"
  }
}

function Ensure-NodeModules($dir, $name) {
  if (-not (Test-Path (Join-Path $dir 'node_modules'))) {
    Fail "$name dependencies are missing. Connect internet once and run: npm ci --prefix $name"
  }
}

function Ensure-EnvFile {
  $envPath = Join-Path $backendDir '.env'
  $examplePath = Join-Path $backendDir '.env.example'
  if (-not (Test-Path $envPath)) {
    if (-not (Test-Path $examplePath)) {
      Fail 'backend\.env is missing and backend\.env.example was not found.'
    }
    Copy-Item -LiteralPath $examplePath -Destination $envPath
    Write-Ok 'Created backend\.env from backend\.env.example'
  }
}

function Ensure-MongoDb {
  if (Test-Port 27017) {
    Write-Ok 'MongoDB is already running on port 27017'
    return
  }

  $serviceNames = @('MongoDB', 'MongoDB Server', 'mongodb')
  foreach ($serviceName in $serviceNames) {
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if (-not $service) { continue }

    if ($service.Status -ne 'Running') {
      Write-Step "Starting MongoDB Windows service ($serviceName)..."
      try {
        Start-Service -Name $serviceName
      } catch {
        Write-Warn "Could not start service $serviceName. Trying next option..."
        continue
      }
    }

    for ($i = 0; $i -lt 20; $i++) {
      if (Test-Port 27017) {
        Write-Ok "MongoDB service is running ($serviceName)"
        return
      }
      Start-Sleep -Milliseconds 500
    }
  }

  Fail 'MongoDB is not running. Install MongoDB once, or start it manually before opening Nokta.'
}

function Read-BackendPortFromEnv {
  $envPath = Join-Path $backendDir '.env'
  if (-not (Test-Path $envPath)) {
    return $BackendPort
  }

  $match = Select-String -Path $envPath -Pattern '^\s*PORT\s*=\s*(\d+)\s*$' | Select-Object -First 1
  if ($match) {
    return [int]$match.Matches[0].Groups[1].Value
  }
  return $BackendPort
}

function Stop-PortListeners([int]$port) {
  try {
    $lines = netstat -ano -p tcp | Select-String ":$port\s+.*LISTENING\s+(\d+)\s*$"
    foreach ($line in $lines) {
      if ($line -match 'LISTENING\s+(\d+)\s*$') {
        $processId = [int]$Matches[1]
        if ($processId -gt 0) {
          Write-Step "Stopping PID $processId on port $port"
          & taskkill /PID $processId /T /F 2>$null | Out-Null
        }
      }
    }
  } catch {
    Write-Warn "Could not stop listeners on port $port"
  }
}

function Get-LatestWriteTime($paths) {
  $latest = [DateTime]::MinValue
  foreach ($path in $paths) {
    if (-not (Test-Path $path)) {
      continue
    }

    $items = Get-ChildItem -LiteralPath $path -Recurse -File -ErrorAction SilentlyContinue
    foreach ($item in $items) {
      if ($item.FullName -match '\\node_modules\\|\\dist\\|\\.vite\\|\\coverage\\') {
        continue
      }
      if ($item.LastWriteTime -gt $latest) {
        $latest = $item.LastWriteTime
      }
    }
  }
  return $latest
}

function Test-BuildFresh($outputFile, $sourcePaths) {
  if (-not (Test-Path $outputFile)) {
    return $false
  }

  $outputTime = (Get-Item -LiteralPath $outputFile).LastWriteTime
  $sourceTime = Get-LatestWriteTime $sourcePaths
  return $outputTime -ge $sourceTime
}

function Ensure-Builds {
  $backendDist = Join-Path $backendDir 'dist\server.js'
  $frontendDist = Join-Path $frontendDir 'dist\index.html'
  $backendSources = @(
    (Join-Path $backendDir 'src'),
    (Join-Path $backendDir 'openapi'),
    (Join-Path $backendDir 'package.json'),
    (Join-Path $backendDir 'tsconfig.json')
  )
  $frontendSources = @(
    (Join-Path $frontendDir 'src'),
    (Join-Path $frontendDir 'public'),
    (Join-Path $frontendDir 'index.html'),
    (Join-Path $frontendDir 'package.json'),
    (Join-Path $frontendDir 'vite.config.ts'),
    (Join-Path $frontendDir 'tailwind.config.js')
  )

  if ($Rebuild -or -not (Test-BuildFresh $backendDist $backendSources)) {
    Write-Step 'Building backend from local files...'
    Push-Location $backendDir
    try {
      & npm.cmd run build
      if ($LASTEXITCODE -ne 0) { Fail 'Backend build failed.' }
    } finally {
      Pop-Location
    }
  }

  if ($Rebuild -or -not (Test-BuildFresh $frontendDist $frontendSources)) {
    Write-Step 'Building frontend from local files...'
    Push-Location $frontendDir
    try {
      & npm.cmd run build
      if ($LASTEXITCODE -ne 0) { Fail 'Frontend build failed.' }
    } finally {
      Pop-Location
    }
  }
}

function Start-LocalProcess($name, $file, $arguments, $workdir, $outLog, $errLog) {
  Write-Step "Starting $name..."
  Start-Process `
    -FilePath $file `
    -ArgumentList $arguments `
    -WorkingDirectory $workdir `
    -WindowStyle Hidden `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog
}

Write-Host ''
Write-Host 'Nokta Academy Offline Launcher' -ForegroundColor White
Write-Host '--------------------------------'

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

Require-Command 'node' 'Install Node.js 18+ once, then run this launcher again.'
Require-Command 'npm.cmd' 'Install Node.js/npm once, then run this launcher again.'
Ensure-NodeModules $backendDir 'backend'
Ensure-NodeModules $frontendDir 'frontend'
Ensure-EnvFile
Ensure-MongoDb
Ensure-Builds

$BackendPort = Read-BackendPortFromEnv
$env:BACKEND_PORT = "$BackendPort"
$env:FRONTEND_PORT = "$FrontendPort"

if (-not (Test-Port $BackendPort)) {
  Start-LocalProcess `
    -name 'backend API' `
    -file 'npm.cmd' `
    -arguments @('run', 'start') `
    -workdir $backendDir `
    -outLog $backendLog `
    -errLog $backendErr
} else {
  Write-Ok "Backend port $BackendPort is already in use"
}

Wait-Port $BackendPort 'Backend API'

try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:$BackendPort/health" -TimeoutSec 8
  if ($health.status -ne 'ok') {
    Write-Warn 'Backend responded, but health status is not ok.'
  } else {
    Write-Ok 'Backend health check passed'
  }
} catch {
  Fail "Backend health check failed. Check $backendLog and $backendErr"
}

if (-not (Test-Port $FrontendPort)) {
  Start-LocalProcess `
    -name 'frontend web app' `
    -file 'node.exe' `
    -arguments @('scripts/serve-dist.mjs') `
    -workdir $frontendDir `
    -outLog $frontendLog `
    -errLog $frontendErr
} else {
  Write-Ok "Frontend port $FrontendPort is already in use"
}

Wait-Port $FrontendPort 'Frontend web app'

Write-Host ''
Write-Host 'Nokta Academy is ready offline.' -ForegroundColor Green
Write-Host "App:     http://127.0.0.1:$FrontendPort"
Write-Host "API:     http://127.0.0.1:$BackendPort/api"
Write-Host "Health:  http://127.0.0.1:$BackendPort/health"
Write-Host ''
Write-Host "Logs: $runtimeDir"
Write-Host ''
Write-Host 'Press Enter to STOP servers and close this launcher...'
if (-not $NoPause) {
  [void][Console]::ReadLine()
  Write-Step 'Stopping local Nokta servers...'
  Stop-PortListeners $FrontendPort
  Stop-PortListeners $BackendPort
  Write-Ok 'Servers stopped.'
  Start-Sleep -Seconds 1
}
