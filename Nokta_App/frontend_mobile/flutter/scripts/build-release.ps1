# Nokta Academy — release build helper (run from flutter/ directory)
param(
    [Parameter(Mandatory = $true)]
    [string]$ApiBaseUrl,
    [ValidateSet('production', 'staging')]
    [string]$AppEnv = 'production'
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..

if (-not $ApiBaseUrl.StartsWith('https://')) {
    Write-Error 'Release builds require HTTPS API_BASE_URL'
}

$defines = @(
    "--dart-define=API_BASE_URL=$ApiBaseUrl",
    "--dart-define=APP_ENV=$AppEnv"
)

flutter pub get
flutter gen-l10n
flutter test
flutter build apk --release @defines
flutter build appbundle --release @defines

Get-Item build/app/outputs/flutter-apk/app-release.apk,
         build/app/outputs/bundle/release/app-release.aab |
    Select-Object Name, @{ N = 'MB'; E = { [math]::Round($_.Length / 1MB, 2) } }
