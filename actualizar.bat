@echo off
title Actualizar Catalogo de Tienda Online
echo ===================================================
echo   Actualizando Catalogo de Productos de la Tienda
echo ===================================================
echo.

:: Ejecutar el script de actualizacion usando PowerShell (bypasseando temporalmente las politicas de ejecucion si es necesario)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-products.ps1"

echo.
echo ===================================================
echo   Proceso finalizado.
echo ===================================================
echo.
pause
