@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "PATH=%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin;%ProgramFiles%\Docker\Docker\resources\bin;%PATH%"

echo POS-AI — levantando Docker Compose
echo Carpeta: %CD%
echo.

where docker >nul 2>&1
if errorlevel 1 (
  echo No se encontro docker.exe. Instala o abre Docker Desktop.
  goto :fail
)

docker info >nul 2>&1
if errorlevel 1 (
  echo El motor Docker no responde. Intentando abrir Docker Desktop...
  if exist "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe" (
    start "" "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"
  ) else if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
    start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
  ) else (
    start "" "shell:AppsFolder\Docker.DockerForWindows.Settings"
  )
  echo Esperando a que el motor quede listo...
  set /a _n=0
  :wait_engine
  timeout /t 3 /nobreak >nul
  docker info >nul 2>&1
  if not errorlevel 1 goto :up
  set /a _n+=1
  if %_n% LSS 40 goto :wait_engine
  echo Docker Desktop no arranco a tiempo. Abrelo, espera "Engine running" y vuelve a ejecutar este .bat
  goto :fail
)

:up
docker compose up -d
if errorlevel 1 goto :fail

echo.
docker compose ps
echo.
echo App:      http://localhost:8010
echo BFF:      http://localhost:2020
echo Core:     http://localhost:1010
echo Mailpit:  http://localhost:8025
echo.
pause
exit /b 0

:fail
echo.
pause
exit /b 1
