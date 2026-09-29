# Run in a child shell: pwsh -NoProfile -File scripts/test-handoff-integration.ps1
# Only isolated local synthetic services; no application server or worker starts.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$pgName = 'povod-team-test-pg'
$redisName = 'povod-team-test-redis'
$evidence = Join-Path (Get-Location) '.run-evidence/team-handoff'
New-Item -ItemType Directory -Path $evidence -Force | Out-Null
$existing = @(docker ps -a --format '{{.Names}}')
if ($LASTEXITCODE -ne 0) { throw 'Docker is unavailable.' }
if ($existing -contains $pgName -or $existing -contains $redisName) { throw 'Dedicated test container names already exist; inspect them before retrying.' }
$created = [System.Collections.Generic.List[string]]::new()
try {
  $env:POSTGRES_PASSWORD = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(24)).ToLowerInvariant()
  docker run -d --name $pgName -e POSTGRES_DB=max23_test -e POSTGRES_USER=max23 -e POSTGRES_PASSWORD -p 127.0.0.1:55492:5432 postgres:18.6 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Cannot create isolated PostgreSQL.' }; $created.Add($pgName)
  docker run -d --name $redisName -p 127.0.0.1:56392:6379 redis:8.2.9 redis-server --appendonly yes | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Cannot create isolated Redis.' }; $created.Add($redisName)
  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    docker exec $pgName pg_isready -U max23 -d max23_test *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'Isolated PostgreSQL did not become ready.' }
  $databases = @('max23_test', 'povod_t105_test', 'povod_real_catalog_verify', 'povod_save_fresh', 'povod_demo_verify')
  foreach ($database in $databases[1..4]) {
    docker exec $pgName createdb -U max23 $database
    if ($LASTEXITCODE -ne 0) { throw "Cannot create test database $database" }
  }
  foreach ($name in @('RUNTIME_FILE','MAX_WEBHOOK_SECRET','DEMO_CATALOG_VERSION','MAX_BOT_USERNAME','ALLOWED_SOURCE_ORIGINS','POVOD_MINIAPP_URL','POVOD_PRIVACY_URL','POVOD_ABOUT_URL','POVOD_OWNER_PREVIEW','LIVE_GATE')) { [Environment]::SetEnvironmentVariable($name, $null, 'Process') }
  $env:APP_MODE = 'test'
  $env:COOKIE_PROFILE = 'LAX_FIRST_PARTY'
  $env:PUBLIC_ORIGIN = 'http://localhost:3000'
  $env:MAX_INGRESS_MODE = 'WEBHOOK'
  $env:CREDENTIAL_SCOPE = 'team-handoff-isolated-test'
  $env:AI_EXTERNAL_ENABLED = 'false'
  $env:MAP_EXTERNAL_ENABLED = 'false'
  foreach ($name in @('SESSION_KEY','ESCROW_KEY','BOT_TOKEN','WEBHOOK_SECRET')) { [Environment]::SetEnvironmentVariable($name, [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant(), 'Process') }
  $env:REDIS_URL = 'redis://127.0.0.1:56392'
  $env:RUN_MAX23_INTEGRATION = '1'
  $testBase = 'postgres://max23:' + $env:POSTGRES_PASSWORD + '@127.0.0.1:55492/'
  $env:T105_TEST_DATABASE_URL = $testBase + 'povod_t105_test'
  $env:REAL_CATALOG_TEST_DATABASE_URL = $testBase + 'povod_real_catalog_verify'
  $env:P0_SAVE_TEST_DATABASE_URL = $testBase + 'povod_save_fresh'
  $env:DEMO_TEST_DATABASE_URL = $testBase + 'povod_demo_verify'
  foreach ($database in $databases) {
    $env:DATABASE_URL = $testBase + $database
    npm run migrate *> (Join-Path $evidence "migrate-$database.log")
    if ($LASTEXITCODE -ne 0) { throw "Migration failed for $database; inspect ignored local evidence." }
  }
  $env:DATABASE_URL = $testBase + 'max23_test'
  npm run test:integration *> (Join-Path $evidence 'integration.log')
  if ($LASTEXITCODE -ne 0) { throw 'Integration suite failed; inspect ignored local evidence.' }
  Get-Content (Join-Path $evidence 'integration.log') -Tail 9
} finally {
  foreach ($name in $created) { docker stop $name *> $null; docker rm -v $name *> $null }
}
