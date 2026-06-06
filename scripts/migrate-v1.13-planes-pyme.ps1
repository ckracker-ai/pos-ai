# Límites comerciales PYME en saas_planes (1/3, 3/6, 3/6).
# Uso: .\scripts\migrate-v1.13-planes-pyme.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$password = if ($env:MYSQL_ROOT_PASSWORD) { $env:MYSQL_ROOT_PASSWORD } else { "S3d4f5g6_" }

Write-Host "Aplicando v1.13.0-001-saas-planes-pyme-limits..."
Get-Content "$root\db-init\migrations\v1.13.0\001-saas-planes-pyme-limits.sql" -Raw -Encoding UTF8 |
  docker exec -i pos-ai-db-mysql mysql -uroot "-p$password" --default-character-set=utf8mb4 pos-ai-db

Write-Host "OK. Verifica: SELECT codigo, max_sucursales, max_usuarios, descripcion FROM saas_planes;"
