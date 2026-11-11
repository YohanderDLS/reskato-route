@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   RESKATO ROUTE  -  Instalacion
echo ============================================
echo.

set "UV=%USERPROFILE%\.local\bin\uv.exe"

if not exist "%UV%" (
  echo [1/4] Descargando uv ^(gestor de Python, no requiere administrador^)...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; $bin=Join-Path $env:USERPROFILE '.local\bin'; New-Item -ItemType Directory -Force -Path $bin | Out-Null; $zip=Join-Path $env:TEMP 'uv-win.zip'; Invoke-WebRequest 'https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-pc-windows-msvc.zip' -OutFile $zip -UseBasicParsing; Expand-Archive -Path $zip -DestinationPath $bin -Force"
  if not exist "%UV%" (
    echo [X] No se pudo descargar uv. Revisa tu conexion a internet.
    pause
    exit /b 1
  )
) else (
  echo [1/4] uv ya esta instalado.
)

echo [2/4] Instalando Python 3.12...
"%UV%" python install 3.12
if errorlevel 1 goto :error

echo [3/4] Creando entorno virtual...
"%UV%" venv --python 3.12 .venv
if errorlevel 1 goto :error

echo [4/4] Instalando dependencias (FastAPI, Uvicorn)...
"%UV%" pip install --python ".venv\Scripts\python.exe" -r requirements.txt
if errorlevel 1 goto :error

echo.
echo ============================================
echo   Instalacion completada.
echo   Ahora ejecuta:  run.bat
echo ============================================
pause
exit /b 0

:error
echo.
echo [X] Ocurrio un error durante la instalacion.
pause
exit /b 1
