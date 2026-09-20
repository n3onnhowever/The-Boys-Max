[CmdletBinding()]
param(
  [string]$ScreenshotDirectory = (Join-Path $PSScriptRoot '..\artifacts\ui-povod-v1\states'),
  [Parameter(Mandatory = $true)]
  [string]$ReferencePath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$outputDirectory = [IO.Path]::GetFullPath($ScreenshotDirectory)
$referenceFile = (Resolve-Path -LiteralPath $ReferencePath).Path
$states = @('loading', 'empty', 'error', 'offline')
$labels = @{
  loading = 'Loading'
  empty = 'Empty'
  error = 'Error / Retry'
  offline = 'Offline'
}
$referenceCrops = @{
  loading = [System.Drawing.Rectangle]::new(0, 0, 420, 941)
  empty = [System.Drawing.Rectangle]::new(410, 0, 420, 941)
  error = [System.Drawing.Rectangle]::new(820, 0, 420, 941)
  offline = [System.Drawing.Rectangle]::new(1230, 0, 442, 941)
}

function New-Canvas([int]$Width, [int]$Height) {
  $bitmap = [System.Drawing.Bitmap]::new($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::FromArgb(255, 247, 244, 238))
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

$titleFont = [System.Drawing.Font]::new('Arial', 18, [System.Drawing.FontStyle]::Bold)
$labelFont = [System.Drawing.Font]::new('Arial', 14, [System.Drawing.FontStyle]::Bold)
$textBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 14, 14, 14))
$mutedBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 103, 99, 92))

try {
  $montage = New-Canvas -Width 828 -Height 1800
  try {
    $montage.Graphics.DrawString('POVOD system states · 390 × 844', $titleFont, $textBrush, 24, 16)
    for ($index = 0; $index -lt $states.Count; $index++) {
      $state = $states[$index]
      $imagePath = Join-Path $outputDirectory "$state-390.png"
      $image = [System.Drawing.Image]::FromFile($imagePath)
      try {
        $column = $index % 2
        $row = [Math]::Floor($index / 2)
        $x = 16 + ($column * 406)
        $y = 58 + ($row * 870)
        $montage.Graphics.DrawString($labels[$state], $labelFont, $textBrush, $x, $y)
        $montage.Graphics.DrawImage($image, $x, $y + 24, 390, 844)
      } finally {
        $image.Dispose()
      }
    }
    $montagePath = Join-Path $outputDirectory 'states-montage.png'
    $montage.Bitmap.Save($montagePath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "created $montagePath"
  } finally {
    $montage.Graphics.Dispose()
    $montage.Bitmap.Dispose()
  }

  $reference = [System.Drawing.Bitmap]::FromFile($referenceFile)
  $parity = New-Canvas -Width 828 -Height 3660
  try {
    $parity.Graphics.DrawString('POVOD state parity · approved reference vs implementation', $titleFont, $textBrush, 22, 16)
    $parity.Graphics.DrawString('Approved reference', $labelFont, $mutedBrush, 16, 49)
    $parity.Graphics.DrawString('Implementation · 390 × 844', $labelFont, $mutedBrush, 422, 49)
    for ($index = 0; $index -lt $states.Count; $index++) {
      $state = $states[$index]
      $rowY = 82 + ($index * 892)
      $parity.Graphics.DrawString($labels[$state], $labelFont, $textBrush, 16, $rowY)
      $crop = $reference.Clone($referenceCrops[$state], [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      $implementation = [System.Drawing.Image]::FromFile((Join-Path $outputDirectory "$state-390.png"))
      try {
        $parity.Graphics.DrawImage($crop, 16, $rowY + 24, 390, 874)
        $parity.Graphics.DrawImage($implementation, 422, $rowY + 54, 390, 844)
      } finally {
        $crop.Dispose()
        $implementation.Dispose()
      }
    }
    $parityPath = Join-Path $outputDirectory 'states-parity.png'
    $parity.Bitmap.Save($parityPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "created $parityPath"
  } finally {
    $reference.Dispose()
    $parity.Graphics.Dispose()
    $parity.Bitmap.Dispose()
  }
} finally {
  $titleFont.Dispose()
  $labelFont.Dispose()
  $textBrush.Dispose()
  $mutedBrush.Dispose()
}
