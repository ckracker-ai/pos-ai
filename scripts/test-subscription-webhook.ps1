# Prueba webhook suscripción SaaS (sandbox)
param(
  [Parameter(Mandatory = $true)][string]$EmpresaId,
  [string]$BaseUrl = "http://localhost:2020/pos/proxy",
  [string]$Secret = $(if ($env:SUBSCRIPTION_WEBHOOK_SECRET) { $env:SUBSCRIPTION_WEBHOOK_SECRET } else { "supersecretkey" }),
  [string]$Reference = "TBK-test-$(Get-Date -Format 'yyyyMMddHHmmss')"
)

$ErrorActionPreference = "Stop"
$uri = "$BaseUrl/public/webhooks/subscription-payment"
$body = @{
  empresa_id = $EmpresaId
  provider   = "WEBPAY"
  reference  = $Reference
  status     = "paid"
} | ConvertTo-Json

Write-Host "POST $uri"
$resp = Invoke-RestMethod -Uri $uri -Method Post -ContentType "application/json" `
  -Headers @{ "x-subscription-webhook-secret" = $Secret } -Body $body

if (-not $resp.success) { Write-Error $resp.error }
Write-Host "OK suscripcion estado: $($resp.data.suscripcion.estado)" -ForegroundColor Green
