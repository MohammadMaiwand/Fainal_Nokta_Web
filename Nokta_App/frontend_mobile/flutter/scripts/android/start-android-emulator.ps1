# Backend + Flutter on Android emulator (Android Studio AVD)
$ErrorActionPreference = 'Stop'

$FlutterRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$RepoRoot = (Resolve-Path (Join-Path $FlutterRoot '..\..\..')).Path
$BackendRoot = Join-Path $RepoRoot 'backend'
$BackendPort = 8081
$WebPort = 5173
$HealthUrl = "http://127.0.0.1:$BackendPort/health"
$MobileApiUrl = "http://10.0.2.2:$WebPort/api"

function Get-AndroidDeviceId {
    try {
        $raw = flutter devices --machine 2>&1 | Out-String
        $devices = $raw | ConvertFrom-Json
        foreach ($d in $devices) {
            $platform = "$($d.platform)"
            if ($platform -like 'android*' -and $d.id -like 'emulator-*') {
                return $d.id
            }
        }
        foreach ($d in $devices) {
            if ("$($d.platform)" -like 'android*') { return $d.id }
        }
    } catch { }
    if (flutter devices 2>&1 | Select-String -Pattern 'emulator-(\d+)' -AllMatches) {
        return $Matches[0]
    }
    return $null
}

function Test-Health {
    try {
        $r = Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 3
        return $r.StatusCode -eq 200
    } catch {
        try {
            Invoke-WebRequest -Uri "http://127.0.0.1:$BackendPort/api/auth/login" -Method OPTIONS -UseBasicParsing -TimeoutSec 3 | Out-Null
            return $true
        } catch { return $false }
    }
}

if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
    Write-Error 'Flutter SDK not found.'
    exit 1
}

$deviceId = Get-AndroidDeviceId
if (-not $deviceId) {
    Write-Host 'No Android emulator running. Launching Pixel_4a...' -ForegroundColor Yellow
    flutter emulators --launch Pixel_4a
    $deadline = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 3
        $deviceId = Get-AndroidDeviceId
        if ($deviceId) { break }
    }
}

if (-not $deviceId) {
    Write-Error 'No Android device found. Start an AVD in Android Studio Device Manager.'
    exit 1
}

Write-Host "Using device: $deviceId" -ForegroundColor Green

if (-not (Test-Health)) {
    Write-Host "Starting dev stack (backend :$BackendPort + web :$WebPort) ..."
    Set-Location $RepoRoot
    if (-not (Test-Path 'node_modules')) { npm install }
    Start-Job -ScriptBlock {
        param($dir)
        Set-Location $dir
        npm run dev 2>&1
    } -ArgumentList $RepoRoot | Out-Null

    $deadline = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $deadline) {
        if (Test-Health) { break }
        Start-Sleep -Seconds 2
    }
    if (-not (Test-Health)) {
        Write-Error 'Backend did not start. Run: cd backend; npm run dev'
        exit 1
    }
}

Write-Host "Launching Flutter on $deviceId (API: $MobileApiUrl)..." -ForegroundColor Cyan
Set-Location $FlutterRoot
flutter pub get
flutter run -d $deviceId `
    --dart-define=APP_ENV=development
