param([string]$Name,[string]$Exe,[string[]]$Arguments)
$ErrorActionPreference='Continue'
$start=[DateTime]::UtcNow
$timer=[Diagnostics.Stopwatch]::StartNew()
& $Exe @Arguments 2>&1 | Out-File -Encoding utf8 "artifacts/t102_1/logs/$Name.txt"
$code=$LASTEXITCODE
$timer.Stop()
$path='artifacts/t102_1/COMMAND_RESULTS.json'
$records=@(); if(Test-Path $path){$records=@(Get-Content $path -Raw | ConvertFrom-Json)}
$records+= [pscustomobject]@{name=$Name;command=@($Exe)+$Arguments;cwd=(Get-Location).Path;started_at=$start.ToString('o');duration_seconds=$timer.Elapsed.TotalSeconds;exit_code=$code;log="artifacts/t102_1/logs/$Name.txt";source_revision=if(Test-Path artifacts/t102_1/SOURCE_REVISION.json){(Get-Content artifacts/t102_1/SOURCE_REVISION.json -Raw|ConvertFrom-Json).source_sha256}else{$null}}
ConvertTo-Json -InputObject $records -Depth 8 | Set-Content -Encoding utf8 $path
Write-Output "$Name exit=$code seconds=$($timer.Elapsed.TotalSeconds)"
