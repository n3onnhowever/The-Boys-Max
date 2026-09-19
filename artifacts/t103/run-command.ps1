param([Parameter(Mandatory=$true)][string]$Name,[Parameter(Mandatory=$true)][string]$Command)
$ErrorActionPreference='Continue'
$root=(Get-Location).Path
if($root -ne 'D:\Dev\Repos\The-Boys-Max-t103'){throw 'T103 working-directory guard'}
$start=[DateTime]::UtcNow
$watch=[Diagnostics.Stopwatch]::StartNew()
$head=(& git rev-parse HEAD).Trim()
$branch=(& git branch --show-current).Trim()
$hashes=@{}
$paths=@(& git ls-files apps packages modules migrations scripts tests package.json package-lock.json compose.yaml Dockerfile) + @(& git ls-files --others --exclude-standard tests scripts)
foreach($path in $paths){if(Test-Path -LiteralPath $path -PathType Leaf){$hashes[$path]=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLower()}}
$manifest="artifacts/t103/logs/$Name-source.json"
$hashes | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 $manifest
$log="artifacts/t103/logs/$Name.txt"
& pwsh -NoProfile -Command $Command *> $log
$code=$LASTEXITCODE
$watch.Stop()
$entry=[ordered]@{name=$Name;command=$Command;cwd=$root;starting_baseline='5e4973f24fb74489387b3c29313cfcd1e8401ca7';head=$head;branch=$branch;started_utc=$start.ToString('o');exit_code=$code;duration_seconds=$watch.Elapsed.TotalSeconds;source_manifest=$manifest;log=$log;log_sha256=(Get-FileHash $log -Algorithm SHA256).Hash.ToLower()}
$file='artifacts/t103/COMMAND_RESULTS.json'
$all=@();if(Test-Path $file){$all=@(Get-Content $file -Raw | ConvertFrom-Json)}
@($all)+@($entry) | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 $file
Get-Content $log -Tail 35
$entry | ConvertTo-Json -Compress
exit $code
