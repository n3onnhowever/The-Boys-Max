[CmdletBinding()]
param(
  [string]$ScreenshotDirectory = 'artifacts/ui-povod-v1/integrated',
  [Parameter(Mandatory=$true)][string]$ReferenceDirectory
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$outputDirectory=[IO.Path]::GetFullPath($ScreenshotDirectory)
$referenceRoot=(Resolve-Path -LiteralPath $ReferenceDirectory).Path
$ink=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#0E0E0E'))
$muted=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#6F6D68'))
$title=[Drawing.Font]::new('Segoe UI',22,[Drawing.FontStyle]::Bold)
$label=[Drawing.Font]::new('Segoe UI',14,[Drawing.FontStyle]::Bold)
function Canvas([int]$Width,[int]$Height){
  $bitmap=[Drawing.Bitmap]::new($Width,$Height,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics=[Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([Drawing.ColorTranslator]::FromHtml('#FFFDF8'))
  $graphics.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  return @{Bitmap=$bitmap;Graphics=$graphics}
}
$sets=@(
  @{Label='Core';Reference='01_povod_ui_pack_core_4screens.png';Screens=@('home','search','detail','plan-detail')},
  @{Label='Secondary';Reference='02_povod_ui_pack_secondary_4screens.png';Screens=@('saved','my-plans','profile','filters')},
  @{Label='System states';Reference='03_povod_ui_pack_states_4screens.png';Screens=@('loading','empty','error','offline')}
)
$board=Canvas 1660 2750
try {
  $board.Graphics.DrawString('POVOD UI v1 | Integrated production build | 390 x 844',$title,$ink,20,14)
  for($row=0;$row -lt 3;$row++){
    for($column=0;$column -lt 4;$column++){
      $name=$sets[$row].Screens[$column]
      $x=[int](20+$column*410);$y=[int](66+$row*888)
      $board.Graphics.DrawString($name,$label,$muted,$x,$y)
      $shot=[Drawing.Image]::FromFile((Join-Path $outputDirectory "390/$name.png"))
      try{$board.Graphics.DrawImage($shot,$x,($y+28),390,844)}finally{$shot.Dispose()}
    }
  }
  $board.Bitmap.Save((Join-Path $outputDirectory 'POVOD_UI_V1_FULL_MONTAGE.png'),[Drawing.Imaging.ImageFormat]::Png)
} finally {$board.Graphics.Dispose();$board.Bitmap.Dispose()}
$comparison=Canvas 3360 3020
try {
  $comparison.Graphics.DrawString('POVOD UI v1 | Approved Master UI packs vs integrated app',$title,$ink,20,14)
  for($row=0;$row -lt 3;$row++){
    $y=[int](64+$row*980)
    $comparison.Graphics.DrawString(($sets[$row].Label+' | Approved Master reference'),$label,$muted,20,$y)
    $comparison.Graphics.DrawString('Integrated | Actual 390 x 844 app viewports',$label,$muted,1730,$y)
    $reference=[Drawing.Image]::FromFile((Join-Path $referenceRoot $sets[$row].Reference))
    try{$comparison.Graphics.DrawImage($reference,20,($y+30),1672,941)}finally{$reference.Dispose()}
    for($column=0;$column -lt 4;$column++){
      $name=$sets[$row].Screens[$column];$x=[int](1730+$column*402)
      $comparison.Graphics.DrawString($name,$label,$muted,$x,($y+35))
      $shot=[Drawing.Image]::FromFile((Join-Path $outputDirectory "390/$name.png"))
      try{$comparison.Graphics.DrawImage($shot,$x,($y+66),390,844)}finally{$shot.Dispose()}
    }
  }
  $comparison.Bitmap.Save((Join-Path $outputDirectory 'POVOD_UI_V1_MASTER_COMPARISON.png'),[Drawing.Imaging.ImageFormat]::Png)
} finally {$comparison.Graphics.Dispose();$comparison.Bitmap.Dispose();$title.Dispose();$label.Dispose();$ink.Dispose();$muted.Dispose()}
Write-Output 'Created full montage and comparison against all three approved Master UI packs.'
