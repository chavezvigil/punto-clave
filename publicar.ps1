# Script de PowerShell para subir la tienda a GitHub automaticamente
$ErrorActionPreference = "Continue"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   SUBIR TIENDA ONLINE A GITHUB PAGES" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Directorios de trabajo
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootPath = $ScriptDir

# Cambiar al directorio raiz del proyecto para ejecutar comandos Git
Set-Location $RootPath

# 1. Verificar si ya es un repositorio Git
if (!(Test-Path ".git")) {
    Write-Host " [Git] Inicializando repositorio Git local..." -ForegroundColor Yellow
    git init
    git branch -M main
}

# 2. Obtener URL del repositorio remoto
$RemoteUrl = ""
$HasRemote = $false

# Verificar si ya existe un remote 'origin' sin causar errores de stream
$Remotes = git remote
if ($Remotes -contains "origin") {
    $RemoteUrl = (git remote get-url origin).Trim()
    $HasRemote = $true
    Write-Host " [Link] Repositorio remoto actual detectado: $RemoteUrl" -ForegroundColor Green
} else {
    Write-Host "Para subir tu tienda a GitHub, primero debes crear un repositorio vacio en tu cuenta de GitHub." -ForegroundColor Gray
    Write-Host "Ejemplo de URL: https://github.com/TuUsuario/tu-tienda.git" -ForegroundColor Gray
    Write-Host ""
    
    $InputUrl = Read-Host "Pega la URL de tu repositorio de GitHub"
    
    if ([string]::IsNullOrWhiteSpace($InputUrl)) {
        Write-Host " [Error] URL invalida. Proceso cancelado." -ForegroundColor Red
        return
    }
    
    $RemoteUrl = $InputUrl.Trim()
    try {
        git remote add origin $RemoteUrl
        $HasRemote = $true
        Write-Host " [OK] Repositorio remoto vinculado con exito." -ForegroundColor Green
    } catch {
        Write-Host " [Error] Error al vincular el repositorio remoto: $_" -ForegroundColor Red
        return
    }
}

# 3. Añadir todos los archivos y hacer Commit
Write-Host ""
Write-Host " [Pack] Preparando archivos del catalogo y fotos para subir..." -ForegroundColor Yellow

# Ejecutar script de actualizar catalogo primero para asegurar consistencia
Write-Host " [Update] Ejecutando actualizacion de catalogo antes de subir..." -ForegroundColor Gray
& (Join-Path $ScriptDir "update-products.ps1")

Write-Host ""
Write-Host " [Save] Guardando cambios en el historial de Git..." -ForegroundColor Yellow
git add .
git commit -m "Actualizacion automatica del catalogo de la tienda" 2>$null

# 4. Subir a GitHub (Push)
Write-Host ""
Write-Host " [Upload] Subiendo archivos a GitHub (esto puede demorar dependiendo del peso de las fotos)..." -ForegroundColor Yellow
Write-Host "Nota: Si es la primera vez, es posible que GitHub te pida iniciar sesion en una ventana emergente." -ForegroundColor Gray
Write-Host ""

try {
    git push -u origin main
    Write-Host ""
    Write-Host " [OK] Archivos subidos a GitHub con exito!" -ForegroundColor Green
    Write-Host "===================================================" -ForegroundColor Green
    
    # Intentar parsear la URL de la web
    if ($RemoteUrl -match "github\.com/([^/]+)/([^.]+)") {
        $User = $Matches[1]
        $Repo = $Matches[2]
        $WebUrl = "https://$User.github.io/$Repo/"
        Write-Host " [Web] Tu tienda estara disponible en pocos minutos en:" -ForegroundColor Cyan
        Write-Host " -> $WebUrl" -ForegroundColor Green
        Write-Host ""
    }
    
    Write-Host " [!] RECUERDA ACTIVAR GITHUB PAGES:" -ForegroundColor Yellow
    Write-Host "1. Abre tu repositorio en tu navegador en GitHub." -ForegroundColor White
    Write-Host "2. Ve a 'Settings' (Configuracion) > 'Pages' (Paginas)." -ForegroundColor White
    Write-Host "3. En 'Source', asegurate de elegir la rama 'main' y la carpeta '/ (root)'." -ForegroundColor White
    Write-Host "4. Haz clic en 'Save' (Guardar)." -ForegroundColor White
    Write-Host "===================================================" -ForegroundColor Green
} catch {
    Write-Host " [Error] Error al subir los archivos a GitHub: $_" -ForegroundColor Red
    Write-Host "Verifica que tu conexion a internet sea estable y que tengas permisos de escritura en el repositorio." -ForegroundColor Yellow
}
