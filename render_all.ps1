$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$dir = Get-Location
$profileDark = "file:///" + ($dir.Path -replace '\\', '/') + "/render-profile.html"
$coverDark = "file:///" + ($dir.Path -replace '\\', '/') + "/render-cover.html"
$profileLight = "file:///" + ($dir.Path -replace '\\', '/') + "/render-profile-light.html"
$coverLight = "file:///" + ($dir.Path -replace '\\', '/') + "/render-cover-light.html"

$outProfile = Join-Path $dir.Path "facebook-perfil.png"
$outCover = Join-Path $dir.Path "facebook-portada.png"
$outProfileLight = Join-Path $dir.Path "facebook-perfil-light.png"
$outCoverLight = Join-Path $dir.Path "facebook-portada-light.png"

Write-Host "Rendering profile dark to $outProfile..."
Start-Process -FilePath $edgePath -ArgumentList "--headless", "--disable-gpu", "--screenshot=`"$outProfile`"", "--window-size=800,800", "`"$profileDark`"" -Wait

Write-Host "Rendering cover dark to $outCover..."
Start-Process -FilePath $edgePath -ArgumentList "--headless", "--disable-gpu", "--screenshot=`"$outCover`"", "--window-size=1640,624", "`"$coverDark`"" -Wait

Write-Host "Rendering profile light to $outProfileLight..."
Start-Process -FilePath $edgePath -ArgumentList "--headless", "--disable-gpu", "--screenshot=`"$outProfileLight`"", "--window-size=800,800", "`"$profileLight`"" -Wait

Write-Host "Rendering cover light to $outCoverLight..."
Start-Process -FilePath $edgePath -ArgumentList "--headless", "--disable-gpu", "--screenshot=`"$outCoverLight`"", "--window-size=1640,624", "`"$coverLight`"" -Wait

Write-Host "All Renders Completed Successfully!"
