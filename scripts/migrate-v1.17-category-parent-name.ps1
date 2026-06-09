# Subcategorías: mismo nombre bajo distinto padre (Carne en Hamburguesas y Sandwich)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$password = if ($env:MYSQL_ROOT_PASSWORD) { $env:MYSQL_ROOT_PASSWORD } else { "S3d4f5g6_" }

Write-Host "Aplicando v1.17.0-001-category-name-per-parent..."
Get-Content "$root\db-init\migrations\v1.17.0\001-category-name-per-parent.sql" -Raw -Encoding UTF8 |
  docker exec -i pos-ai-db-mysql mysql -uroot "-p$password" --default-character-set=utf8mb4 pos-ai-db
Write-Host "OK."
