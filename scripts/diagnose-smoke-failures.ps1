# Diagnóstico rápido cuando qa-smoke falla en /public/planes o login ADMIN
$ErrorActionPreference = "Continue"
$BaseUrl = "http://localhost:2020/pos/proxy"
$CoreUrl = "http://localhost:1010"
$Key = if ($env:INTERNAL_API_KEY) { $env:INTERNAL_API_KEY } else { "supersecretkey" }

Write-Host "=== Diagnóstico POS-AI smoke ===" -ForegroundColor Cyan

Write-Host "`n1. Contenedores"
docker compose ps 2>&1

Write-Host "`n2. Core health ($CoreUrl/health)"
try {
  $h = Invoke-RestMethod -Uri "$CoreUrl/health" -Method Get -TimeoutSec 5
  Write-Host "   OK: $($h | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
  Write-Host "   FAIL: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "   -> Levanta core: docker compose up -d pos-api-core pos-ai-db-mysql" -ForegroundColor Yellow
}

Write-Host "`n3. Planes vía Core (requiere x-internal-key)"
try {
  $p = Invoke-RestMethod -Uri "$CoreUrl/empresas/planes/list" -Method Get -TimeoutSec 5 `
    -Headers @{ "x-internal-key" = $Key }
  $n = @($p.data.planes).Count
  Write-Host "   OK — $n planes" -ForegroundColor Green
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Write-Host "   FAIL HTTP $status — $($_.Exception.Message)" -ForegroundColor Red
  if ($status -eq 401) {
    Write-Host "   -> INTERNAL_API_KEY distinto entre BFF y Core (.env vs docker-compose)" -ForegroundColor Yellow
  } else {
    Write-Host "   -> Migraciones SaaS: .\scripts\migrate-v1.6-planes.ps1 y migrate-v1.6.1-suscripciones.ps1" -ForegroundColor Yellow
  }
}

Write-Host "`n4. Planes vía BFF ($BaseUrl/public/planes)"
try {
  $b = Invoke-RestMethod -Uri "$BaseUrl/public/planes" -Method Get -TimeoutSec 5
  if ($b.success) { Write-Host "   OK" -ForegroundColor Green }
  else { Write-Host "   FAIL: $($b.error)" -ForegroundColor Red }
} catch {
  Write-Host "   FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n5. Login ADMIN (sin x-internal-key en body; core /auth es público)"
$body = @{ email = "admin@empanadascostaazul.cl"; password = "@dmin123_" } | ConvertTo-Json
try {
  $login = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5
  if ($login.success) { Write-Host "   OK token recibido" -ForegroundColor Green }
  else { Write-Host "   FAIL: $($login.error)" -ForegroundColor Red }
} catch {
  Write-Host "   FAIL: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "   -> Revisa logs core: docker compose logs pos-api-core --tail 30" -ForegroundColor Yellow
  Write-Host "   -> Si cambiaste password en .env, usa esa o:" -ForegroundColor Yellow
  Write-Host "      BOOTSTRAP_ADMIN_RESET_PASSWORD=true + docker compose up -d --force-recreate pos-api-core" -ForegroundColor Yellow
}

Write-Host "`n6. Últimas líneas log core (bootstrap admin / BD)"
docker compose logs pos-api-core --tail 15 2>&1

Write-Host ""
