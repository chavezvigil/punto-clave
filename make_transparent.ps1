Add-Type -Assembly System.Drawing

$inputPath = Join-Path (Get-Location) "logo.png"
$outputPath = Join-Path (Get-Location) "logo-transparent.png"

$bmp = [System.Drawing.Bitmap]::FromFile($inputPath)
$newBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height)

for ($x = 0; $x -lt $bmp.Width; $x++) {
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        $pixel = $bmp.GetPixel($x, $y)
        # Off-white / light background threshold:
        # If R > 195, G > 195, B > 185 and color is neutral light gray/cream
        $isLightBg = ($pixel.R -ge 190 -and $pixel.G -ge 190 -and $pixel.B -ge 180) -and ([Math]::Abs($pixel.R - $pixel.G) -lt 25)
        
        if ($isLightBg) {
            $newBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        } else {
            $newBmp.SetPixel($x, $y, $pixel)
        }
    }
}

$newBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$newBmp.Dispose()
Write-Host "Refined transparent logo saved."
