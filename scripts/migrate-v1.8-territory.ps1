# v1.8.0 — Territorio CUT Chile + columnas sucursal
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$password = if ($env:MYSQL_ROOT_PASSWORD) { $env:MYSQL_ROOT_PASSWORD } else { "S3d4f5g6_" }

Get-ChildItem "$root\db-init\migrations\v1.8.0\*.sql" | Sort-Object Name | ForEach-Object {
  Write-Host "Applying $($_.Name)..."
  Get-Content $_.FullName -Raw | docker exec -i pos-ai-db-mysql mysql -uroot "-p$password" pos-ai-db
}

Write-Host "OK. Reinicia core: docker compose up -d --force-recreate pos-api-core"
