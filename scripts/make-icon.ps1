$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$taskSizes = @(16, 32, 48, 64, 128, 256)
$taskImages = @()
foreach ($taskSize in $taskSizes) {
    $taskBitmap = [Drawing.Bitmap]::new($taskSize, $taskSize)
    $taskGraphics = [Drawing.Graphics]::FromImage($taskBitmap)
    $taskGraphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $taskGraphics.TextRenderingHint = [Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $taskGraphics.Clear([Drawing.Color]::Transparent)
    $taskBrush = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#2d6cdf'))
    $taskGraphics.FillRectangle($taskBrush, 0, 0, $taskSize, $taskSize)
    $taskFont = [Drawing.Font]::new('Segoe UI', [float]($taskSize * 0.49), [Drawing.FontStyle]::Bold, [Drawing.GraphicsUnit]::Pixel)
    $taskFormat = [Drawing.StringFormat]::new()
    $taskFormat.Alignment = [Drawing.StringAlignment]::Center
    $taskFormat.LineAlignment = [Drawing.StringAlignment]::Center
    $taskGraphics.DrawString('JJ', $taskFont, [Drawing.Brushes]::White, [Drawing.RectangleF]::new(0, -$taskSize * 0.02, $taskSize, $taskSize), $taskFormat)
    $taskStream = [IO.MemoryStream]::new()
    $taskBitmap.Save($taskStream, [Drawing.Imaging.ImageFormat]::Png)
    $taskImages += ,$taskStream.ToArray()
    $taskStream.Dispose(); $taskFont.Dispose(); $taskFormat.Dispose(); $taskBrush.Dispose(); $taskGraphics.Dispose(); $taskBitmap.Dispose()
}
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskOutput = [IO.File]::Create((Join-Path $taskRoot 'src-tauri\icons\icon.ico'))
$taskWriter = [IO.BinaryWriter]::new($taskOutput)
try {
    $taskWriter.Write([UInt16]0); $taskWriter.Write([UInt16]1); $taskWriter.Write([UInt16]$taskSizes.Count)
    $taskOffset = 6 + 16 * $taskSizes.Count
    for ($taskIndex = 0; $taskIndex -lt $taskSizes.Count; $taskIndex++) {
        $taskDimension = if ($taskSizes[$taskIndex] -eq 256) { 0 } else { $taskSizes[$taskIndex] }
        $taskWriter.Write([byte]$taskDimension); $taskWriter.Write([byte]$taskDimension)
        $taskWriter.Write([UInt16]0); $taskWriter.Write([UInt16]1); $taskWriter.Write([UInt16]32)
        $taskWriter.Write([UInt32]$taskImages[$taskIndex].Length); $taskWriter.Write([UInt32]$taskOffset)
        $taskOffset += $taskImages[$taskIndex].Length
    }
    foreach ($taskBytes in $taskImages) { $taskWriter.Write([byte[]]$taskBytes) }
} finally { $taskWriter.Dispose() }
Write-Output 'Generated JJ app icon.'
