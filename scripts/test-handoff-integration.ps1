# Compatibility entry point; the service harness also runs on Linux/macOS.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
npm run test:integration:isolated
exit $LASTEXITCODE
