# Aplica migraciones SaaS planes en MySQL Docker (BD existente, sin borrar volumen).
# Uso: .\scripts\migrate-v1.6-planes.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$password = if ($env:MYSQL_ROOT_PASSWORD) { $env:MYSQL_ROOT_PASSWORD } else { "S3d4f5g6_" }

Write-Host "Aplicando v1.6.0-001-saas-planes..."
Get-Content "$root\db-init\migrations\v1.6.0\001-saas-planes.sql" -Raw -Encoding UTF8 |
  docker exec -i pos-ai-db-mysql mysql -uroot "-p$password" --default-character-set=utf8mb4 pos-ai-db

Write-Host "Aplicando v1.6.0-002-saas-planes-valor-metodo..."
Get-Content "$root\db-init\migrations\v1.6.0\002-saas-planes-valor-metodo.sql" -Raw -Encoding UTF8 |
  docker exec -i pos-ai-db-mysql mysql -uroot "-p$password" --default-character-set=utf8mb4 pos-ai-db

Write-Host "OK. Rebuild: docker compose up -d --build pos-api-core pos-api-bff pos-frontend"
