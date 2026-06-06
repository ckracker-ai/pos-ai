# Corrige encoding UTF-8 en nombres de saas_planes (B??sico → Básico).
# Uso: .\scripts\migrate-v1.12-saas-planes-encoding.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$password = if ($env:MYSQL_ROOT_PASSWORD) { $env:MYSQL_ROOT_PASSWORD } else { "S3d4f5g6_" }

Write-Host "Aplicando v1.12.0-001-saas-planes-encoding..."
Get-Content "$root\db-init\migrations\v1.12.0\001-saas-planes-encoding.sql" -Raw -Encoding UTF8 |
  docker exec -i pos-ai-db-mysql mysql -uroot "-p$password" --default-character-set=utf8mb4 pos-ai-db

Write-Host "OK. Verifica: SELECT codigo, nombre FROM saas_planes;"
