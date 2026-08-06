@echo off
title Subir Tienda Online a GitHub
echo ===================================================
echo   Subiendo Tienda Online a GitHub Pages
echo ===================================================
echo.

:: Ejecutar el script de publicacion usando PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0publicar.ps1"

echo.
echo ===================================================
echo   Proceso finalizado.
echo ===================================================
echo.
pause
