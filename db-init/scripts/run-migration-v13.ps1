# Aplica migración v1.3 sobre la base indicada (sandbox o producción).
param(
    [string]$DbName = "erp_core_db_v13",
    [string]$Container = $env:MYSQL_CONTAINER ?? "erp_db_mysql",
    [string]$RootPassword = $env:MYSQL_ROOT_PASSWORD ?? "S3d4f5g6_",
    [string]$Migration = (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..\migrations\v1.3.0\001-multi-tenant.sql")
)

Write-Host ">> Migración v1.3 en base: $DbName"
Write-Host ">> Archivo: $Migration"

Get-Content $Migration -Raw | docker exec -i $Container mysql -uroot -p"$RootPassword" $DbName

Write-Host ">> Migración aplicada."
