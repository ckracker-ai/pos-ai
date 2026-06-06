# v1.11.0 — S4 delivery tracking
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$password = if ($env:MYSQL_ROOT_PASSWORD) { $env:MYSQL_ROOT_PASSWORD } else { "S3d4f5g6_" }

Get-ChildItem "$root\db-init\migrations\v1.11.0\*.sql" | Sort-Object Name | ForEach-Object {
  Write-Host "Applying $($_.Name)..."
  Get-Content $_.FullName -Raw | docker exec -i pos-ai-db-mysql mysql -uroot "-p$password" pos-ai-db
}

Write-Host "OK. Rebuild: docker compose up -d --build pos-api-core pos-api-bff pos-frontend"
