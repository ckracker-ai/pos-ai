# Aplica migraciones v1.6 (planes) y v1.7 (asistente WSP) en orden.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

& "$root\scripts\migrate-v1.6-planes.ps1"
& "$root\scripts\migrate-v1.6.1-suscripciones.ps1"
& "$root\scripts\migrate-v1.7-assistant.ps1"

Write-Host "OK — migraciones v1.6 + v1.6.1 + v1.7 aplicadas."
Write-Host "Rebuild sugerido: docker compose up -d --build pos-api-core pos-api-assistant pos-api-bff pos-frontend"
