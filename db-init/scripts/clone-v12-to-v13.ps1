# Copia datos de erp_core_db a erp_core_db_v13 para probar migraciones.
param(
    [string]$Container = $env:MYSQL_CONTAINER ?? "erp_db_mysql",
    [string]$RootPassword = $env:MYSQL_ROOT_PASSWORD ?? "S3d4f5g6_"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SqlFile = Join-Path $ScriptDir "clone-v12-to-v13.sql"

Write-Host ">> Clonando erp_core_db -> erp_core_db_v13 en: $Container"

Get-Content $SqlFile -Raw | docker exec -i $Container mysql -uroot -p"$RootPassword"

Write-Host ">> Clon completado."
