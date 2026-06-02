# v1.6.1 — empresa_suscripciones + platform_users
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$password = if ($env:MYSQL_ROOT_PASSWORD) { $env:MYSQL_ROOT_PASSWORD } else { "S3d4f5g6_" }

Write-Host "Applying v1.6.1-001-empresa-suscripciones..."
Get-Content "$root\db-init\migrations\v1.6.1\001-empresa-suscripciones.sql" -Raw |
  docker exec -i pos-ai-db-mysql mysql -uroot "-p$password" pos-ai-db

Write-Host "OK. Rebuild: docker compose up -d --build pos-api-core pos-api-bff pos-frontend"
