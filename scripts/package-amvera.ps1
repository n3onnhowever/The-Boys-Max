param([string]$OutputDirectory = '.run-evidence/amvera-package')
$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
$dirty = @(git status --porcelain)
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect Git state' }
if ($dirty.Count -ne 0) { throw 'Commit and verify the final source before packaging' }
$source = (git rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $source -notmatch '^[0-9a-f]{40}$') { throw 'Invalid source SHA' }
$destination = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputDirectory))
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$zip = Join-Path $destination ("povod-amvera-" + $source.Substring(0,12) + ".zip")
if (Test-Path -LiteralPath $zip) { throw "Package already exists: $zip" }
$paths = @(
  'Dockerfile','.dockerignore','amvera.yaml','.npmrc','package.json','package-lock.json',
  'tsconfig.json','tsconfig.build.json',
  'patches','apps','packages','modules','migrations','certs','licenses',
  'scripts/migrate.ts','scripts/import-curated-official.ts','scripts/seed-demo.ts',
  'scripts/amvera-runtime.ts','scripts/health-worker.cjs',
  'scripts/patch-drizzle-declarations.mjs','scripts/copy-assets.mjs','scripts/data'
)
git archive --format=zip "--output=$zip" $source -- @paths
if ($LASTEXITCODE -ne 0) { throw 'Git archive failed' }
$hash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath "$zip.sha256" -Value "$hash  $(Split-Path -Leaf $zip)" -Encoding ascii
Write-Output "SOURCE_SHA=$source"
Write-Output "PACKAGE=$zip"
Write-Output "PACKAGE_SHA256=$hash"
