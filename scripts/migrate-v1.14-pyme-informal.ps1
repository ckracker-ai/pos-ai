# PYME informal: estado_tributario y campos de formalización.
# Uso: .\scripts\migrate-v1.14-pyme-informal.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$password = if ($env:MYSQL_ROOT_PASSWORD) { $env:MYSQL_ROOT_PASSWORD } else { "S3d4f5g6_" }

Write-Host "Aplicando v1.14.0-001-empresa-estado-tributario..."
Get-Content "$root\db-init\migrations\v1.14.0\001-empresa-estado-tributario.sql" -Raw -Encoding UTF8 |
  docker exec -i pos-ai-db-mysql mysql -uroot "-p$password" --default-character-set=utf8mb4 pos-ai-db

Write-Host "OK. Verifica: DESCRIBE empresas; SELECT id, estado_tributario, rubro_negocio FROM empresas LIMIT 5;"
