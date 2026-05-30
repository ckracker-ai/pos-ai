# Provisiona erp_core_db_v13 en MySQL existente (volumen ya inicializado con v1.2).
param(
    [string]$Container = $env:MYSQL_CONTAINER ?? "erp_db_mysql",
    [string]$RootPassword = $env:MYSQL_ROOT_PASSWORD ?? "S3d4f5g6_"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SqlFile = Join-Path $ScriptDir "provision-v13-sandbox.sql"

Write-Host ">> Provisionando sandbox v1.3 en contenedor: $Container"

Get-Content $SqlFile -Raw | docker exec -i $Container mysql -uroot -p"$RootPassword"

Write-Host ">> Listo. Sandbox v1.3 multi-tenant en erp_core_db_v13"
Write-Host ">> Apunta pos-api-core: DB_NAME=erp_core_db_v13"
