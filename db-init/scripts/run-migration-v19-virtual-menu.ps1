# Aplica migración v1.19 — menú virtual QR (WSP)
param(
    [string]$DbName = "pos-ai-db",
    [string]$Container = $env:MYSQL_CONTAINER ?? "pos-ai-db-mysql",
    [string]$RootPassword = $env:MYSQL_ROOT_PASSWORD ?? "S3d4f5g6_",
    [string]$Migration = (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..\migrations\v1.19.0\001-virtual-menu.sql")
)

Write-Host ">> Migración v1.19 menú virtual en base: $DbName"
Get-Content $Migration -Raw | docker exec -i $Container mysql -uroot -p"$RootPassword" $DbName
Write-Host ">> Migración aplicada."
