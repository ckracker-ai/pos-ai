# Limpieza A3 — comprobantes demo (duplicados + registros de pedidos cerrados)
# Uso: .\scripts\cleanup-payment-proofs-demo.ps1
# Requiere: docker compose up -d (BFF + core)

param(
  [string]$BaseUrl = "http://localhost:2020",
  [string]$ProxyPrefix = "/pos/proxy",
  [string]$InternalKey = "supersecretkey",
  [string]$BranchId = "",
  [string]$AdminEmail = "admin@empanadascostaazul.cl",
  [string]$AdminPassword = "@dmin123_"
)

$ErrorActionPreference = "Stop"
$ApiRoot = "$BaseUrl$ProxyPrefix"

$body = @{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$ApiRoot/auth/login" -Method Post -Body $body -ContentType "application/json" -Headers @{ "x-internal-key" = $InternalKey }
if (-not $login.success) { throw $login.error }

$token = $login.data.token
$userBranch = $login.data.user.branchId
$branch = if ($BranchId) { $BranchId } elseif ($userBranch) { $userBranch } else { throw "Sin branchId: pásalo con -BranchId" }

$headers = @{
  Authorization    = "Bearer $token"
  "x-internal-key" = $InternalKey
  "x-branch-id"    = $branch
}

Write-Host "Limpieza comprobantes — sucursal $branch" -ForegroundColor Cyan

$clean = Invoke-RestMethod -Uri "$ApiRoot/payment-proofs/consolidate-duplicates" -Method Post -Body "{}" -ContentType "application/json" -Headers $headers
if (-not $clean.success) { throw $clean.error }

$removed = [int]($clean.data.removedProofs)
$archived = [int]($clean.data.archivedStale)
Write-Host "  Duplicados eliminados: $removed" -ForegroundColor Green
Write-Host "  Registros antiguos archivados: $archived" -ForegroundColor Green

$list = Invoke-RestMethod -Uri "$ApiRoot/payment-proofs?status=pending" -Method Get -Headers $headers
if (-not $list.success) { throw $list.error }

$proofs = @($list.data.proofs)
$saleIds = @{}
$dupSales = 0
foreach ($p in $proofs) {
  if ($saleIds.ContainsKey($p.saleId)) { $dupSales++ }
  else { $saleIds[$p.saleId] = $true }
}

Write-Host "  Pendientes visibles: $($proofs.Count)" -ForegroundColor $(if ($proofs.Count -eq 0) { "DarkGray" } else { "White" })
if ($dupSales -gt 0) {
  Write-Host "  ADVERTENCIA: aún hay $dupSales saleId repetidos en pendientes" -ForegroundColor Yellow
  exit 1
}

Write-Host "OK — listado sin duplicados por pedido." -ForegroundColor Green
exit 0
