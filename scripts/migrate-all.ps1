# Aplica migraciones v1.6 (planes) y v1.7 (asistente WSP) en orden.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

& "$root\scripts\migrate-v1.6-planes.ps1"
& "$root\scripts\migrate-v1.6.1-suscripciones.ps1"
& "$root\scripts\migrate-v1.7-assistant.ps1"
& "$root\scripts\migrate-v1.8-territory.ps1"
& "$root\scripts\migrate-v1.9-categories.ps1"
& "$root\scripts\migrate-v1.10-payments.ps1"
& "$root\scripts\migrate-v1.11-delivery.ps1"
& "$root\scripts\migrate-v1.12-saas-planes-encoding.ps1"
& "$root\scripts\migrate-v1.13-planes-pyme.ps1"
& "$root\scripts\migrate-v1.14-pyme-informal.ps1"
& "$root\scripts\migrate-v1.15-legal.ps1"
& "$root\scripts\migrate-v1.15.1-legal-backfill.ps1"
& "$root\scripts\migrate-v1.15.2-legal-sla.ps1"
& "$root\scripts\migrate-v1.16-data-subject.ps1"
& "$root\scripts\migrate-v1.17-category-parent-name.ps1"

Write-Host "OK — migraciones v1.6 … v1.17 category-parent-name aplicadas."
Write-Host "Rebuild sugerido: docker compose up -d --build pos-api-core pos-api-assistant pos-api-bff pos-frontend"
