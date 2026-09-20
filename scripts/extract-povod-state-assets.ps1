[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$SourcePath,
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\apps\miniapp\public\assets\states')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$expectedSha256 = '7FF1046935A0246856A9EAB8DCB0920241DDCFA6A96FE97A55FBC96BD15B2053'
$resolvedSource = (Resolve-Path -LiteralPath $SourcePath).Path
$actualSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $resolvedSource).Hash
if ($actualSha256 -ne $expectedSha256) {
  throw "Unexpected state-pack source hash: $actualSha256"
}

Add-Type -AssemblyName System.Drawing
[IO.Directory]::CreateDirectory([IO.Path]::GetFullPath($OutputDirectory)) | Out-Null
$source = [System.Drawing.Bitmap]::FromFile($resolvedSource)

function Export-StateArtwork {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [string]$Name,
    [int]$X,
    [int]$Y,
    [int]$Width,
    [int]$Height
  )

  $bounds = [System.Drawing.Rectangle]::new($X, $Y, $Width, $Height)
  $crop = $Bitmap.Clone($bounds, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $clean = [System.Drawing.Bitmap]::new($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $background = $crop.GetPixel(0, 0)

  for ($row = 0; $row -lt $Height; $row++) {
    for ($column = 0; $column -lt $Width; $column++) {
      $pixel = $crop.GetPixel($column, $row)
      $red = [int]$pixel.R - [int]$background.R
      $green = [int]$pixel.G - [int]$background.G
      $blue = [int]$pixel.B - [int]$background.B
      $distance = [Math]::Sqrt(($red * $red) + ($green * $green) + ($blue * $blue))
      $alpha = if ($distance -le 10) { 0 } elseif ($distance -lt 34) { [Math]::Round((($distance - 10) / 24) * 255) } else { 255 }
      $clean.SetPixel($column, $row, [System.Drawing.Color]::FromArgb($alpha, $pixel.R, $pixel.G, $pixel.B))
    }
  }

  $destination = Join-Path $OutputDirectory $Name
  $clean.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
  $crop.Dispose()
  $clean.Dispose()
  Write-Output ("created {0} ({1}x{2})" -f $destination, $Width, $Height)
}

try {
  Export-StateArtwork -Bitmap $source -Name 'povod-empty-magnifier.png' -X 500 -Y 270 -Width 260 -Height 215
  Export-StateArtwork -Bitmap $source -Name 'povod-error-cable.png' -X 900 -Y 285 -Width 300 -Height 180
} finally {
  $source.Dispose()
}

Write-Output "source sha256 $actualSha256"
