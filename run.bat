@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo [!] No se encontro el entorno virtual.
  echo     Ejecutando instalacion automatica...
  call setup.bat
  if not exist ".venv\Scripts\python.exe" (
    echo [X] La instalacion fallo. Revisa los mensajes anteriores.
    pause
    exit /b 1
  )
)

echo ============================================
echo   RESKATO ROUTE  -  Sistema de Busqueda A*
echo ============================================
echo.
echo   Abriendo http://127.0.0.1:8000 ...
echo   (Cierra esta ventana para detener el servidor)
echo.

".venv\Scripts\python.exe" -m app.main

echo.
echo Servidor detenido.
pause
