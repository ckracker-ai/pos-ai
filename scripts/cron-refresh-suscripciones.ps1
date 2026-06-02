# Marca suscripciones vencidas (estado VENCIDA) sin esperar al login del tenant.
# Programar en Task Scheduler (Windows) o cron (Linux) 1x/día.
#
# Uso:
#   .\scripts\cron-refresh-suscripciones.ps1
#   $env:CORE_BASE_URL = "http://localhost:1010"; $env:INTERNAL_API_KEY = "supersecretkey"; .\scripts\cron-refresh-suscripciones.ps1

param(
  [string]$CoreBaseUrl = $(if ($env:CORE_BASE_URL) { $env:CORE_BASE_URL } else { "http://localhost:1010" }),
  [string]$InternalKey = $(if ($env:INTERNAL_API_KEY) { $env:INTERNAL_API_KEY } else { "supersecretkey" })
)

$ErrorActionPreference = "Stop"
$uri = "$CoreBaseUrl/empresas/platform/jobs/refresh-subscriptions"

Write-Host "POST $uri"
$resp = Invoke-RestMethod -Uri $uri -Method Post -Headers @{ "x-internal-key" = $InternalKey }

if (-not $resp.success) {
  Write-Error $resp.error
}

$job = $resp.data
Write-Host "OK scanned=$($job.scanned) markedVencida=$($job.markedVencida)" -ForegroundColor Green
