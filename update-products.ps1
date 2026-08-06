# Script de PowerShell para actualizar el catalogo de productos de forma nativa en Windows
$ErrorActionPreference = "Stop"

Write-Host "--- Iniciando actualizacion del catalogo de productos (PowerShell) ---" -ForegroundColor Cyan

# Directorios de trabajo
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigPath = Join-Path $ScriptDir "products-config.json"
$OutputPath = Join-Path $ScriptDir "products.js"
$RootPath = $ScriptDir

# Extensiones de imagen validas
$ImageExtensions = @(".jpg", ".jpeg", ".png", ".webp", ".gif")

# 1. Cargar o inicializar la configuracion
$Config = @{
    storeName = "Punto Clave"
    whatsappNumber = "50376172548"
    products = @{}
}

if (Test-Path $ConfigPath) {
    try {
        $RawConfig = Get-Content -Path $ConfigPath -Raw -Encoding UTF8
        $Config = ConvertFrom-Json -InputObject $RawConfig
        if ($null -eq $Config.products) {
            $Config.products = [PSCustomObject]@{}
        }
    } catch {
        Write-Host " [!] Error al leer products-config.json, se usaran valores por defecto: $_" -ForegroundColor Yellow
    }
}

# 2. Escanear carpetas de productos
$ProductsRootPath = Join-Path $RootPath "productos"
if (!(Test-Path $ProductsRootPath)) {
    $ProductsRootPath = $RootPath
}

$Folders = Get-ChildItem -Path $ProductsRootPath -Directory | Where-Object {
    $_.Name -ne "tienda" -and !$_.Name.StartsWith(".") -and $_.Name -ne "node_modules" -and $_.Name -ne "productos"
}

Write-Host "Carpetas de productos detectadas: $(($Folders | Select-Object -ExpandProperty Name) -join ', ')"

$ConfigUpdated = $false
$FinalProducts = @()

# Asegurar que el miembro products exista en la configuracion
if ($null -eq $Config.products) {
    $Config.products = @{}
}

# 3. Procesar cada carpeta
foreach ($Folder in $Folders) {
    # Buscar imagenes en la carpeta
    $Images = Get-ChildItem -Path $Folder.FullName -File | Where-Object {
        $ext = $_.Extension.ToLower()
        $ImageExtensions -contains $ext
    }

    if ($Images.Count -eq 0) {
        Write-Host " [!] La carpeta '$($Folder.Name)' no contiene imagenes validas. Se omitira." -ForegroundColor Yellow
        continue
    }

    $FolderEscapedName = $Folder.Name
    $ProdInfo = $Config.products.$FolderEscapedName

    if ($null -eq $ProdInfo) {
        Write-Host " [New] Nueva carpeta detectada: '$FolderEscapedName'. Registrando en config." -ForegroundColor Green
        
        $NewProduct = [PSCustomObject]@{
            title = $FolderEscapedName
            price = 0
            originalPrice = $null
            category = "Otros"
            condition = "Usado - Buen estado"
            availability = "Disponible"
            date = $Folder.CreationTime.ToString("yyyy-MM-dd")
            description = "Descripcion pendiente para $FolderEscapedName."
        }
        
        $Config.products | Add-Member -MemberType NoteProperty -Name $FolderEscapedName -Value $NewProduct -Force
        $ProdInfo = $NewProduct
        $ConfigUpdated = $true
    } elseif ($null -eq $ProdInfo.date -or $ProdInfo.date -eq "") {
        $FolderDate = $Folder.CreationTime.ToString("yyyy-MM-dd")
        $ProdInfo | Add-Member -MemberType NoteProperty -Name "date" -Value $FolderDate -Force
        $ConfigUpdated = $true
    }

    # Construir rutas relativas codificadas para la web
    $RelativeImagePaths = @()
    foreach ($Img in $Images) {
        $EncodedFolder = [System.Web.HttpUtility]::UrlEncode($Folder.Name).Replace("+", "%20")
        $EncodedImg = [System.Web.HttpUtility]::UrlEncode($Img.Name).Replace("+", "%20")
        if ($ProductsRootPath -eq $RootPath) {
            $RelativeImagePaths += "$EncodedFolder/$EncodedImg"
        } else {
            $RelativeImagePaths += "productos/$EncodedFolder/$EncodedImg"
        }
    }

    # Generar un ID simple para la web
    $CleanId = $Folder.Name.ToLower().Replace(" ", "-")
    $CleanId = [System.Text.Encoding]::ASCII.GetString([System.Text.Encoding]::GetEncoding("Cyrillic").GetBytes($CleanId))
    $CleanId = $CleanId -replace '[^a-z0-9\-]', ''

    # Crear objeto de producto final
    $ProductObj = [PSCustomObject]@{
        id = $CleanId
        folderName = $Folder.Name
        title = if ($ProdInfo.title) { $ProdInfo.title } else { $Folder.Name }
        price = if ($ProdInfo.price -ne $null) { [double]$ProdInfo.price } else { 0.0 }
        originalPrice = if ($ProdInfo.originalPrice -ne $null) { [double]$ProdInfo.originalPrice } else { $null }
        category = if ($ProdInfo.category) { $ProdInfo.category } else { "Otros" }
        condition = if ($ProdInfo.condition) { $ProdInfo.condition } else { "Usado - Buen estado" }
        availability = if ($ProdInfo.availability) { $ProdInfo.availability } else { "Disponible" }
        date = if ($ProdInfo.date) { $ProdInfo.date } else { $Folder.CreationTime.ToString("yyyy-MM-dd") }
        description = if ($ProdInfo.description) { $ProdInfo.description } else { "" }
        images = $RelativeImagePaths
    }

    $FinalProducts += $ProductObj
}

# 4. Guardar la configuracion actualizada si es necesario
if ($ConfigUpdated) {
    try {
        $JsonConfig = ConvertTo-Json -InputObject $Config -Depth 10
        [System.IO.File]::WriteAllText($ConfigPath, $JsonConfig, [System.Text.Encoding]::UTF8)
        Write-Host " [OK] Archivo products-config.json actualizado con nuevos productos." -ForegroundColor Green
    } catch {
        Write-Host " [Error] Error al guardar products-config.json: $_" -ForegroundColor Red
    }
}

# 5. Generar archivo products.js de produccion
$StoreInfoJson = ConvertTo-Json -InputObject @{
    storeName = if ($Config.storeName) { $Config.storeName } else { "Punto Clave" }
    whatsappNumber = if ($Config.whatsappNumber) { $Config.whatsappNumber } else { "50376172548" }
} -Depth 5

$ProductsJson = ConvertTo-Json -InputObject $FinalProducts -Depth 5

$JsContent = @"
// Archivo autogenerado. No editar directamente.
// Para modificar los datos de los productos, edita 'products-config.json' y ejecuta 'actualizar.bat'

window.STORE_INFO = $StoreInfoJson;

window.PRODUCTS = $ProductsJson;
"@

try {
    [System.IO.File]::WriteAllText($OutputPath, $JsContent, [System.Text.Encoding]::UTF8)
    Write-Host " [OK] Base de datos de productos compilada con exito en: products.js ($($FinalProducts.Count) productos registrados)" -ForegroundColor Green
} catch {
    Write-Host " [Error] Error al escribir products.js: $_" -ForegroundColor Red
}
