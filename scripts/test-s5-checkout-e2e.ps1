# S5 E2E — registro → checkout confirm (ledger) → suscripción ACTIVA
# Uso: .\scripts\test-s5-checkout-e2e.ps1
# Requiere: stack arriba + migrate v1.6 + v1.10

param(
  [string]$BaseUrl = "http://localhost:2020/pos/proxy",
  [string]$InternalKey = $(if ($env:INTERNAL_API_KEY) { $env:INTERNAL_API_KEY } else { "supersecretkey" })
)

$ErrorActionPreference = "Stop"
$suffix = Get-Date -Format "yyyyMMddHHmmss"
$rnd = Get-Random -Minimum 10000 -Maximum 99999
$rut = "88.999.$rnd-K"
$email = "s5-e2e-$suffix@example.com"
$ref = "s5-e2e-$suffix"

Write-Host "=== S5 E2E checkout ===" -ForegroundColor Cyan

Write-Host "0. GET legal/current..."
$legal = Invoke-RestMethod -Uri "$BaseUrl/public/legal/current" -Method Get
if (-not $legal.success) { throw "legal: $($legal.error)" }
$legalAcceptance = @{
  termsVersion   = $legal.data.terms.version
  privacyVersion = $legal.data.privacy.version
  accepted       = $true
}

Write-Host "1. Registro..."
$regBody = @{
  rut            = $rut
  razonSocial    = "S5 E2E SpA $suffix"
  adminEmail     = $email
  adminPassword  = "Str0ngPass!123"
  adminFullName  = "Admin S5"
  planCodigo     = "BASICO"
  legalAcceptance = $legalAcceptance
} | ConvertTo-Json -Depth 5

$reg = Invoke-RestMethod -Uri "$BaseUrl/public/registro" -Method Post -ContentType "application/json" -Body $regBody
if (-not $reg.success) { throw "registro: $($reg.error)" }
$empresaId = $reg.data.empresa.id
if (-not $empresaId) { $empresaId = $reg.data.empresaId }
Write-Host "   empresaId=$empresaId" -ForegroundColor DarkGray

Write-Host "2. GET checkout (canPay)..."
$chk = Invoke-RestMethod -Uri "$BaseUrl/public/checkout/$empresaId" -Method Get
if (-not $chk.success) { throw "checkout: $($chk.error)" }
$summary = $chk.data.checkout
if (-not $summary.canPay) { throw "expected canPay=true (PILOTO)" }
Write-Host "   total=$($summary.totalClp) estado=$($summary.suscripcionEstado)" -ForegroundColor DarkGray

Write-Host "3. POST checkout/confirm (ledger)..."
$confirmBody = @{
  empresaId       = $empresaId
  provider        = "SANDBOX"
  reference       = $ref
  legalAcceptance = $legalAcceptance
} | ConvertTo-Json -Depth 5
$paid = Invoke-RestMethod -Uri "$BaseUrl/public/checkout/confirm" -Method Post -ContentType "application/json" -Body $confirmBody
if (-not $paid.success) { throw "confirm: $($paid.error)" }
$estado = $paid.data.suscripcion.estado
if ($estado -ne "ACTIVA") { throw "expected ACTIVA, got $estado" }
Write-Host "   suscripcion=$estado" -ForegroundColor Green

Write-Host "4. GET checkout (ya no canPay)..."
$chk2 = Invoke-RestMethod -Uri "$BaseUrl/public/checkout/$empresaId" -Method Get
if ($chk2.data.checkout.canPay) { throw "expected canPay=false after payment" }

Write-Host "5. Duplicate confirm..."
$dup = Invoke-RestMethod -Uri "$BaseUrl/public/checkout/confirm" -Method Post -ContentType "application/json" -Body $confirmBody
if (-not $dup.success) { throw "duplicate confirm failed: $($dup.error)" }
if (-not $dup.data.duplicate) { throw "expected duplicate=true on second confirm" }
Write-Host "   duplicate=true OK" -ForegroundColor Green

Write-Host ""
Write-Host "S5 E2E OK — login: $email / Str0ngPass!123" -ForegroundColor Green
