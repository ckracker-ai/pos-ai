# S5 — webhook venta Full (SALE_WSP) vía assistant
# Uso: .\scripts\test-s5-sale-wsp-webhook.ps1 -EmpresaId <uuid> -SaleId <uuid-pedido-pending>
# Requiere: plan Full + pedido PENDING con pago WEBPAY en notas (flujo WSP previo)

param(
  [Parameter(Mandatory = $true)][string]$EmpresaId,
  [Parameter(Mandatory = $true)][string]$SaleId,
  [string]$AssistantUrl = "http://localhost:3030",
  [string]$Secret = $(if ($env:PAYMENT_WEBHOOK_SECRET) { $env:PAYMENT_WEBHOOK_SECRET } else { "supersecretkey" }),
  [string]$Reference = "wsp-s5-$(Get-Date -Format 'yyyyMMddHHmmss')"
)

$ErrorActionPreference = "Stop"
$uri = "$AssistantUrl/webhooks/payment"
$body = @{
  empresa_id = $EmpresaId
  sale_id    = $SaleId
  provider   = "SANDBOX"
  reference  = $Reference
} | ConvertTo-Json

Write-Host "POST $uri"
$resp = Invoke-RestMethod -Uri $uri -Method Post -ContentType "application/json" `
  -Headers @{ "x-payment-webhook-secret" = $Secret } -Body $body

if (-not $resp.success) { Write-Error ($resp.error ?? "payment webhook failed") }
Write-Host "OK sale_id=$($resp.data.sale_id) duplicate=$($resp.duplicate)" -ForegroundColor Green

Write-Host "Reintento (idempotencia)..."
$resp2 = Invoke-RestMethod -Uri $uri -Method Post -ContentType "application/json" `
  -Headers @{ "x-payment-webhook-secret" = $Secret } -Body $body
if (-not $resp2.duplicate) { Write-Warning "expected duplicate=true on second POST" }
