# Aplica migración v1.23 — mayorista / crédito (S11)
param(
    [string]$DbName = "pos-ai-db",
    [string]$Container = "",
    [string]$RootPassword = "",
    [string]$Migration = (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..\migrations\v1.23.0\001-wholesale-credit.sql")
)

if ([string]::IsNullOrWhiteSpace($Container)) {
    $Container = if ($env:MYSQL_CONTAINER) { $env:MYSQL_CONTAINER } else { "pos-ai-db-mysql" }
}
if ([string]::IsNullOrWhiteSpace($RootPassword)) {
    $RootPassword = if ($env:MYSQL_ROOT_PASSWORD) { $env:MYSQL_ROOT_PASSWORD } else { "S3d4f5g6_" }
}

Write-Host ">> Migración v1.23 mayorista/crédito en base: $DbName"
Get-Content $Migration -Raw | docker exec -i $Container mysql -uroot -p"$RootPassword" $DbName
Write-Host ">> Migración aplicada."
