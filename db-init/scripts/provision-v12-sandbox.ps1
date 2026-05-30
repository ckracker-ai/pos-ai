# Provisiona erp_core_db_v13 con schema v1.2 (probar migración v1.2 -> v1.3).
param(
    [string]$Container = $env:MYSQL_CONTAINER ?? "erp_db_mysql",
    [string]$RootPassword = $env:MYSQL_ROOT_PASSWORD ?? "S3d4f5g6_"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SqlFile = Join-Path $ScriptDir "provision-v12-sandbox.sql"

Write-Host ">> Provisionando sandbox v1.2 en erp_core_db_v13 (para migración)"

Get-Content $SqlFile -Raw | docker exec -i $Container mysql -uroot -p"$RootPassword"

Write-Host ">> Siguiente: .\clone-v12-to-v13.ps1 && .\run-migration-v13.ps1 erp_core_db_v13"
