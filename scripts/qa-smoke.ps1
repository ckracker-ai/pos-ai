# Smoke tests Sprint 4 - ejecutar con el stack levantado (docker compose up -d)
# Uso: .\scripts\qa-smoke.ps1 [-BaseUrl http://localhost:3000] [-FrontendUrl http://localhost]

param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$FrontendUrl = "http://localhost",
  [string]$InternalKey = "supersecretkey",
  [string]$BranchId = "48d4ee18-5349-11f1-a915-00ff541b88ad",
  [string]$AdminEmail = "admin@empanadascostaazul.cl",
  [string]$AdminPassword = "@dmin123_",
  [string]$ComandaEmail = "comanda@empanadacostaazul.cl",
  [string]$ComandaPassword = "Comanda2026"
)

$ErrorActionPreference = "Stop"
$passed = 0
$failed = 0

function Write-Pass([string]$Name) {
  Write-Host "[OK]   $Name" -ForegroundColor Green
  $script:passed++
}

function Write-Fail([string]$Name, [string]$Detail) {
  Write-Host "[FAIL] $Name" -ForegroundColor Red
  if ($Detail) { Write-Host "       $Detail" -ForegroundColor DarkRed }
  $script:failed++
}

function Invoke-Smoke {
  param([string]$Name, [scriptblock]$Action)
  try {
    & $Action
    Write-Pass $Name
  } catch {
    Write-Fail $Name $_.Exception.Message
  }
}

function Get-AuthSession {
  param([string]$Email, [string]$Password)
  $body = @{ email = $Email; password = $Password } | ConvertTo-Json
  $resp = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -Body $body -ContentType "application/json" -Headers @{ "x-internal-key" = $InternalKey }
  if (-not $resp.success) { throw $resp.error }
  return @{
    Token = $resp.data.token
    User  = $resp.data.user
  }
}

function Get-ApiHeaders {
  param([string]$Token, [string]$Branch = $BranchId)
  return @{
    Authorization   = "Bearer $Token"
    "x-internal-key" = $InternalKey
    "x-branch-id"    = $Branch
  }
}

Write-Host ""
Write-Host "=== SVM QA Smoke (Sprint 4) ===" -ForegroundColor Cyan
Write-Host "BFF: $BaseUrl | Frontend: $FrontendUrl"
Write-Host ""

Invoke-Smoke "BFF health (/api/health)" {
  $r = Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method Get
  if (-not $r.success -or $r.data.status -ne "ok") { throw "unexpected health payload" }
}

Invoke-Smoke "Frontend responde (HTTP 200)" {
  $r = Invoke-WebRequest -Uri $FrontendUrl -UseBasicParsing
  if ($r.StatusCode -ne 200) { throw "status $($r.StatusCode)" }
}

$admin = $null
Invoke-Smoke "Login ADMIN" {
  $script:admin = Get-AuthSession -Email $AdminEmail -Password $AdminPassword
  if (-not $admin.Token) { throw "missing token" }
}

$comanda = $null
Invoke-Smoke "Login COMANDA" {
  $script:comanda = Get-AuthSession -Email $ComandaEmail -Password $ComandaPassword
  if (-not $comanda.User.branchId) { throw "branchId missing in user payload" }
}

if ($admin) {
  Invoke-Smoke "ADMIN - listar categorias" {
    $h = Get-ApiHeaders -Token $admin.Token
    $r = Invoke-RestMethod -Uri "$BaseUrl/api/catalog/categories" -Method Get -Headers $h
    if (-not $r.success) { throw $r.error }
  }

  Invoke-Smoke "ADMIN - listar usuarios" {
    $h = Get-ApiHeaders -Token $admin.Token
    $r = Invoke-RestMethod -Uri "$BaseUrl/api/auth/users" -Method Get -Headers $h
    if (-not $r.success) { throw $r.error }
  }
}

if ($comanda) {
  Invoke-Smoke "COMANDA - listar ventas/comandas" {
    $branch = $comanda.User.branchId
    $h = Get-ApiHeaders -Token $comanda.Token -Branch $branch
    $r = Invoke-RestMethod -Uri "$BaseUrl/api/sales/sales" -Method Get -Headers $h
    if (-not $r.success) { throw $r.error }
  }
}

if ($admin) {
  Invoke-Smoke "Soft delete + restore categoria (ciclo QA)" {
    $h = Get-ApiHeaders -Token $admin.Token
    $suffix = Get-Date -Format "yyyyMMddHHmmss"
    $createBody = @{ name = "QA-Smoke-$suffix"; description = "auto" } | ConvertTo-Json
    $created = Invoke-RestMethod -Uri "$BaseUrl/api/catalog/categories" -Method Post -Body $createBody -ContentType "application/json" -Headers $h
    if (-not $created.success) { throw $created.error }
    $cat = $created.data.category
    if (-not $cat.id) { $cat = $created.data }
    $id = $cat.id
    if (-not $id) { throw "category id missing" }

    $patchBody = @{ isActive = $false } | ConvertTo-Json
    $deactivated = Invoke-RestMethod -Uri "$BaseUrl/api/catalog/categories/$id" -Method Patch -Body $patchBody -ContentType "application/json" -Headers $h
    if (-not $deactivated.success) { throw $deactivated.error }

    $restored = Invoke-RestMethod -Uri "$BaseUrl/api/catalog/categories/$id/restore" -Method Post -Body "{}" -ContentType "application/json" -Headers $h
    if (-not $restored.success) { throw $restored.error }
  }
}

Write-Host ""
Write-Host "Resultado: $passed OK, $failed FAIL" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

if ($failed -gt 0) { exit 1 }
exit 0
