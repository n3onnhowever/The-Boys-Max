param(
  [string]$InputPath = 'tmp-kudago-pages.json',
  [string]$OutputDirectory = 'scripts/data',
  [int]$Limit = 150
)

$ErrorActionPreference = 'Stop'
$all = Get-Content -LiteralPath $InputPath -Raw | ConvertFrom-Json
$zone = [TimeZoneInfo]::FindSystemTimeZoneById('Russian Standard Time')
$cutoff = [DateTimeOffset]::Parse('2026-09-30T00:00:00+03:00').ToUnixTimeSeconds()

function Category($tags) {
  $t = @($tags)
  if ($t -contains 'cinema') { return 'CINEMA' }
  if ($t -contains 'theater') { return 'THEATRE' }
  if ($t -contains 'concert' -or $t -contains 'music') { return 'CONCERT' }
  if ($t -contains 'exhibition' -or $t -contains 'museum') { return 'MUSEUM' }
  if ($t -contains 'sport') { return 'SPORT' }
  if ($t -contains 'outdoor' -or $t -contains 'active-recreation') { return 'OUTDOOR' }
  return 'OTHER'
}
function Iso([long]$seconds) {
  return [TimeZoneInfo]::ConvertTime([DateTimeOffset]::FromUnixTimeSeconds($seconds), $zone).ToString('yyyy-MM-ddTHH:mm:sszzz')
}
function Sha($value) {
  $bytes = [Text.Encoding]::UTF8.GetBytes(($value | ConvertTo-Json -Depth 20 -Compress))
  return ([Security.Cryptography.SHA256]::Create().ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') }) -join ''
}

$candidate = @()
foreach ($event in $all) {
  foreach ($date in @($event.dates)) {
    if ($date.start -ge $cutoff -and -not $date.is_continuous -and -not $date.is_endless -and -not $date.is_startless -and -not $date.use_place_schedule -and @($date.schedules).Count -eq 0 -and $event.id -and $event.title -and $event.site_url) {
      $candidate += [PSCustomObject]@{ event = $event; date = $date; start = [long]$date.start; category = Category $event.categories }
    }
  }
}

$quotas = [ordered]@{ CINEMA = 7; MUSEUM = 19; THEATRE = 50; CONCERT = 40; OTHER = 34 }
$selected = @(
  foreach ($category in $quotas.Keys) {
    $candidate | Where-Object category -eq $category | Sort-Object -Property start, @{ Expression = { $_.event.id } } | Select-Object -First $quotas[$category]
  }
) | Sort-Object -Property start, @{ Expression = { $_.event.id } }
if ($selected.Count -ne $Limit) { throw "Only $($selected.Count) exact future sessions are available" }

$records = @()
foreach ($item in $selected) {
  $event = $item.event
  $date = $item.date
  $end = $null
  if ($date.end -gt $date.start -and ($date.end - $date.start) -le 86400) { $end = Iso $date.end }
  $place = $event.place
  $records += [ordered]@{
    identity = "kudago-$($event.id)-$($date.start)"
    source_url = $event.site_url
    source_owner = 'KudaGo'
    reviewed_at = '2026-09-30T00:00:00.000Z'
    source_hash = Sha ([ordered]@{ event_id = $event.id; title = $event.title; site_url = $event.site_url; dates = $date; place = $place; categories = $event.categories; price = $event.price; is_free = $event.is_free })
    rights_note = 'KudaGo public API factual listing; added for the hackathon with explicit operator authorization. Advertising status is not independently reviewed; no descriptions or provider images are reused.'
    title = $event.title
    category = $item.category
    sessions = @([ordered]@{
      identity = "kudago-$($event.id)-$($date.start)"
      starts_at = Iso $date.start
      ends_at = $end
      venue_id = if ($place -and $place.id) { "kudago-place-$($place.id)" } else { $null }
      venue_name = if ($place) { $place.title } else { $null }
      address = if ($place) { $place.address } else { $null }
      price_text = if ([string]::IsNullOrWhiteSpace($event.price)) { $null } else { $event.price }
      fee_status = 'UNKNOWN'
      price_scope = 'EVENT'
    })
  }
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$first = $records[0..74]
$second = $records[75..149]
$utf8 = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText((Join-Path $OutputDirectory 'curated-kudago-moscow-a-v1.json'), (@{ schema = 'povod.curated-official/1'; as_of = '2026-09-30T00:00:00.000Z'; records = $first } | ConvertTo-Json -Depth 20), $utf8)
[System.IO.File]::WriteAllText((Join-Path $OutputDirectory 'curated-kudago-moscow-b-v1.json'), (@{ schema = 'povod.curated-official/1'; as_of = '2026-09-30T00:00:00.000Z'; records = $second } | ConvertTo-Json -Depth 20), $utf8)

[PSCustomObject]@{
  records = $records.Count
  categories = ($records | Group-Object category | Sort-Object Name | ForEach-Object { "$($_.Name):$($_.Count)" }) -join ', '
  first = $records[0].sessions[0].starts_at
  last = $records[-1].sessions[0].starts_at
} | ConvertTo-Json
