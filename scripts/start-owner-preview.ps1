param([switch]$NoSeed)
$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
$pgName = 'povod-owner-preview-pg'
$redisName = 'povod-owner-preview-redis'
$containers = @(docker ps -a --format '{{.Names}}')
if ($containers -notcontains $pgName) {
  docker run -d --name $pgName -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=povod_owner_preview -p 127.0.0.1:55489:5432 postgres:18.6 | Out-Null
} else { docker start $pgName | Out-Null }
if ($containers -notcontains $redisName) {
  docker run -d --name $redisName -p 127.0.0.1:56389:6379 redis:8.2.9 | Out-Null
} else { docker start $redisName | Out-Null }
for ($i=0; $i -lt 30; $i++) {
  docker exec $pgName pg_isready -U postgres -d povod_owner_preview 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 1
}
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL did not become ready' }
$env:NODE_ENV = 'development'
$env:POVOD_OWNER_PREVIEW = '1'
$env:APP_MODE = 'demo'
$env:DEMO_CATALOG_VERSION = 'v1'
$env:DATABASE_URL = 'postgres://postgres@127.0.0.1:55489/povod_owner_preview'
$env:REDIS_URL = 'redis://127.0.0.1:56389'
$env:PUBLIC_ORIGIN = 'http://127.0.0.1:3000'
$env:COOKIE_PROFILE = 'LAX_FIRST_PARTY'
$env:MAX_INGRESS_MODE = 'WEBHOOK'
$env:CREDENTIAL_SCOPE = 'owner-preview-local'
function New-RandomHex {
  $bytes = New-Object byte[] 32
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  return ([BitConverter]::ToString($bytes) -replace '-', '').ToLowerInvariant()
}
$env:SESSION_KEY = New-RandomHex
$env:ESCROW_KEY = New-RandomHex
$env:BOT_TOKEN = New-RandomHex
$env:MAX_WEBHOOK_SECRET = New-RandomHex
$env:ALLOWED_SOURCE_ORIGINS = 'https://www.darwinmuseum.ru'
npm.cmd run migrate
if ($LASTEXITCODE -ne 0) { throw 'Migration failed' }
if (-not $NoSeed) {
  npm.cmd run seed:demo
  if ($LASTEXITCODE -ne 0) { throw 'Demo seed failed' }
}
$env:APP_MODE = 'hybrid'
if (-not $NoSeed) {
  npm.cmd run import:curated-official -- artifacts/real-catalog/curated-official-v1.json
  if ($LASTEXITCODE -ne 0) { throw 'Curated catalog import failed' }
}
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
Write-Host 'Owner preview: http://127.0.0.1:3000/?owner-preview=1'
Write-Host 'Keep this terminal open. Stop with Ctrl+C.'
npm.cmd run start:api
