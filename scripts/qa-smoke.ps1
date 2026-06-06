# Smoke tests POS-AI — ejecutar con el stack levantado (docker compose up -d)
# Uso: .\scripts\qa-smoke.ps1
#      .\scripts\qa-smoke.ps1 -IncludeS0   # territorio, sucursales, delivery, assistant
#      .\scripts\qa-smoke.ps1 -IncludeS1   # árbol categorías jerárquicas (S1)
#      .\scripts\qa-smoke.ps1 -IncludeS2   # territorio CUT completo (S2)
#      .\scripts\qa-smoke.ps1 -IncludeS5   # pasarela ledger idempotencia (S5 cerrado)
#      .\scripts\qa-smoke.ps1 -IncludeS4   # delivery tracking cola (S4)

param(
  [switch]$IncludeS0,
  [switch]$IncludeS1,
  [switch]$IncludeS2,
  [switch]$IncludeS4,
  [switch]$IncludeS5,
  [string]$AssistantUrl = "http://localhost:3030",
  [string]$CoreUrl = "http://localhost:1010",
  [string]$BaseUrl = "http://localhost:2020",
  [string]$ProxyPrefix = "/pos/proxy",
  [string]$FrontendUrl = "http://localhost:8010",
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
$ApiRoot = "$BaseUrl$ProxyPrefix"

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
  $resp = Invoke-RestMethod -Uri "$ApiRoot/auth/login" -Method Post -Body $body -ContentType "application/json" -Headers @{ "x-internal-key" = $InternalKey }
  if (-not $resp.success) { throw $resp.error }
  return @{
    Token = $resp.data.token
    User  = $resp.data.user
  }
}

function Get-ApiHeaders {
  param([string]$Token, [string]$Branch = $BranchId)
  return @{
    Authorization    = "Bearer $Token"
    "x-internal-key" = $InternalKey
    "x-branch-id"    = $Branch
  }
}

Write-Host ""
Write-Host "=== POS-AI QA Smoke ===" -ForegroundColor Cyan
if ($IncludeS0) { Write-Host "Modo S0: territorio, branch, delivery, assistant" -ForegroundColor DarkCyan }
if ($IncludeS1) { Write-Host "Modo S1: categorías jerárquicas (tree + leaves)" -ForegroundColor DarkCyan }
if ($IncludeS2) { Write-Host "Modo S2: territorio CUT (346 comunas + búsqueda)" -ForegroundColor DarkCyan }
if ($IncludeS5) { Write-Host "Modo S5: payment_events idempotencia (core inbound)" -ForegroundColor DarkCyan }
if ($IncludeS4) { Write-Host "Modo S4: delivery tracking pending queue" -ForegroundColor DarkCyan }
Write-Host "BFF: $ApiRoot | Frontend: $FrontendUrl"
Write-Host ""

Invoke-Smoke "BFF health ($ProxyPrefix/health)" {
  $r = Invoke-RestMethod -Uri "$ApiRoot/health" -Method Get
  if (-not $r.success -or $r.data.status -ne "ok") { throw "unexpected health payload" }
}

Invoke-Smoke "Frontend responde (HTTP 200)" {
  $r = Invoke-WebRequest -Uri $FrontendUrl -UseBasicParsing
  if ($r.StatusCode -ne 200) { throw "status $($r.StatusCode)" }
}

Invoke-Smoke "Landing HTML (POS-AI)" {
  $r = Invoke-WebRequest -Uri $FrontendUrl -UseBasicParsing
  if ($r.Content -notmatch 'Punto de venta Inteligente') { throw 'landing tagline missing' }
}

Invoke-Smoke "GET /public/planes (BFF)" {
  $r = Invoke-RestMethod -Uri "$ApiRoot/public/planes" -Method Get
  if (-not $r.success) { throw $r.error }
  if (-not $r.data.planes -or $r.data.planes.Count -lt 1) { throw 'planes empty' }
}

$admin = $null
Invoke-Smoke "Login ADMIN" {
  $script:admin = Get-AuthSession -Email $AdminEmail -Password $AdminPassword
  if (-not $admin.Token) { throw "missing token" }
  if (-not $admin.User.empresaId) { throw "empresaId missing in user payload" }
}

$comanda = $null
Write-Host "[..]   Login COMANDA (opcional)" -ForegroundColor DarkGray
try {
  $comanda = Get-AuthSession -Email $ComandaEmail -Password $ComandaPassword
  if (-not $comanda.User.branchId) { throw "branchId missing" }
  Write-Pass "Login COMANDA"
} catch {
  Write-Host "[WARN] COMANDA omitido - $($_.Exception.Message)" -ForegroundColor Yellow
}

if ($admin) {
  $adminBranch = if ($admin.User.branchId) { $admin.User.branchId } else { $BranchId }
  $adminHeaders = Get-ApiHeaders -Token $admin.Token -Branch $adminBranch

  Invoke-Smoke "ADMIN - GET /empresas/me (BFF)" {
    $r = Invoke-RestMethod -Uri "$ApiRoot/empresas/me" -Method Get -Headers $adminHeaders
    if (-not $r.success) { throw $r.error }
    if (-not $r.data.empresa.id) { throw "empresa.id missing" }
  }

  Invoke-Smoke "ADMIN - listar categorias" {
    $r = Invoke-RestMethod -Uri "$ApiRoot/catalog/categories" -Method Get -Headers $adminHeaders
    if (-not $r.success) { throw $r.error }
  }

  Invoke-Smoke "ADMIN - listar usuarios" {
    $r = Invoke-RestMethod -Uri "$ApiRoot/auth/users" -Method Get -Headers $adminHeaders
    if (-not $r.success) { throw $r.error }
  }

  Invoke-Smoke "ADMIN - PATCH /empresas/:id (reversible)" {
    $empresaId = $admin.User.empresaId
    $patchBody = @{ nombreFantasia = "QA Smoke $(Get-Date -Format 'HHmmss')" } | ConvertTo-Json
    $patched = Invoke-RestMethod -Uri "$ApiRoot/empresas/$empresaId" -Method Patch -Body $patchBody -ContentType "application/json" -Headers $adminHeaders
    if (-not $patched.success) { throw $patched.error }
    $restoreBody = @{ nombreFantasia = "Costa Azul" } | ConvertTo-Json
    $restored = Invoke-RestMethod -Uri "$ApiRoot/empresas/$empresaId" -Method Patch -Body $restoreBody -ContentType "application/json" -Headers $adminHeaders
    if (-not $restored.success) { throw $restored.error }
  }
}

if ($comanda) {
  Invoke-Smoke "COMANDA - listar ventas/comandas" {
    $branch = $comanda.User.branchId
    $h = Get-ApiHeaders -Token $comanda.Token -Branch $branch
    $r = Invoke-RestMethod -Uri "$ApiRoot/sales/sales" -Method Get -Headers $h
    if (-not $r.success) { throw $r.error }
  }
}

if ($admin) {
  $adminBranch = if ($admin.User.branchId) { $admin.User.branchId } else { $BranchId }
  $h = Get-ApiHeaders -Token $admin.Token -Branch $adminBranch

  if ($IncludeS0) {
    $ctxHeaders = @{
      Authorization    = "Bearer $($admin.Token)"
      "x-internal-key" = $InternalKey
    }

    Invoke-Smoke "S0 - Assistant health (openAi)" {
      $r = Invoke-RestMethod -Uri "$AssistantUrl/health" -Method Get
      if (-not $r.openAi) { throw "openAi=false (revisar OPENAI_API_KEY)" }
    }

    Invoke-Smoke "S0 - GET /territory/regions" {
      $r = Invoke-RestMethod -Uri "$ApiRoot/territory/regions" -Method Get -Headers $ctxHeaders
      if (-not $r.success) { throw $r.error }
      $regions = @($r.data.regions)
      if ($regions.Count -lt 1) { throw "regions empty" }
      $first = $regions[0]
      if (-not $first.codigoCut -or -not $first.nombre) { throw "region payload missing codigoCut/nombre" }
    }

    Invoke-Smoke "S0 - GET /branch (sin sucursal activa requerida)" {
      $r = Invoke-RestMethod -Uri "$ApiRoot/branch" -Method Get -Headers $ctxHeaders
      if (-not $r.success) { throw $r.error }
      $branches = @($r.data.branches)
      if ($branches.Count -lt 1) { throw "branches empty" }
      $b0 = $branches[0]
      if (-not $b0.id -or -not $b0.name) { throw "branch payload missing id/name" }
    }

    Invoke-Smoke "S0 - Limpieza comprobantes (duplicados + stale)" {
      $branchForProofs = if ($admin.User.branchId) { $admin.User.branchId } else { $BranchId }
      $proofHeaders = Get-ApiHeaders -Token $admin.Token -Branch $branchForProofs
      $clean = Invoke-RestMethod -Uri "$ApiRoot/payment-proofs/consolidate-duplicates" -Method Post -Body "{}" -ContentType "application/json" -Headers $proofHeaders
      if (-not $clean.success) { throw $clean.error }
      $list = Invoke-RestMethod -Uri "$ApiRoot/payment-proofs?status=pending" -Method Get -Headers $proofHeaders
      if (-not $list.success) { throw $list.error }
      $proofs = @($list.data.proofs)
      $seen = @{}
      foreach ($p in $proofs) {
        if ($seen.ContainsKey($p.saleId)) { throw "duplicate saleId in pending list: $($p.saleId)" }
        $seen[$p.saleId] = $true
        if ($p.saleStatus -and $p.saleStatus -ne "PENDING") {
          throw "pending list includes closed sale $($p.saleId) status=$($p.saleStatus)"
        }
      }
    }

    Invoke-Smoke "S0 - Venta con delivery (API)" {
      $branchForSale = if ($admin.User.branchId) { $admin.User.branchId } else { $BranchId }
      $saleHeaders = Get-ApiHeaders -Token $admin.Token -Branch $branchForSale

      $prodResp = Invoke-RestMethod -Uri "$ApiRoot/catalog/products/by-branch/$branchForSale" -Method Get -Headers $saleHeaders
      if (-not $prodResp.success) { throw $prodResp.error }
      $products = @($prodResp.data.products)
      if ($products.Count -lt 1) { $products = @($prodResp.data) }
      $pick = $products | Where-Object {
        $s = if ($null -ne $_.stock) { [int]$_.stock } else { 0 }
        $s -gt 0
      } | Select-Object -First 1
      if (-not $pick) { $pick = $products | Select-Object -First 1 }
      if (-not $pick.id) { throw "no product available for sale smoke" }

      $unit = if ($null -ne $pick.price) { [decimal]$pick.price } else { [decimal]1000 }
      $qty = 1
      $deliveryAmt = 2000
      $subtotal = $unit * $qty
      $total = $subtotal + $deliveryAmt

      $saleBody = @{
        total                = [double]$total
        discount             = 0
        status               = "PENDING"
        requiresDelivery     = $true
        deliveryCustomerName = "Cliente QA S0"
        deliveryPhone        = "56912345678"
        deliveryAddress      = "Av. QA 123, Santiago"
        deliveryAmount       = $deliveryAmt
        notes                = "smoke-s0-delivery"
        details              = @(
          @{
            productId = $pick.id
            quantity  = $qty
            unitPrice = [double]$unit
            subtotal  = [double]$subtotal
          }
        )
      } | ConvertTo-Json -Depth 6

      $created = Invoke-RestMethod -Uri "$ApiRoot/sales/sales" -Method Post -Body $saleBody -ContentType "application/json" -Headers $saleHeaders
      if (-not $created.success) { throw $created.error }
      $sale = $created.data.sale
      if (-not $sale) { $sale = $created.data }
      if (-not $sale.requiresDelivery) { throw "requiresDelivery not persisted" }
      if ([string]$sale.deliveryCustomerName -ne "Cliente QA S0") { throw "deliveryCustomerName mismatch" }
    }
  }

  if ($IncludeS2) {
    Invoke-Smoke "S2 - CUT comunas search (santiago)" {
      $r = Invoke-RestMethod -Uri "$ApiRoot/territory/comunas/search?q=santiago" -Method Get -Headers $h
      if (-not $r.success) { throw $r.error }
      $comunas = @($r.data.comunas)
      if ($comunas.Count -lt 1) { throw "search santiago empty; run migrate v1.8 and restart core" }
      $c0 = $comunas[0]
      if (-not $c0.codigoCut -or -not $c0.nombre) { throw "comuna payload incomplete" }
    }

    Invoke-Smoke "S2 - POST /territory/resolve (comunaText)" {
      $body = @{ comunaText = "estacion central" } | ConvertTo-Json
      $r = Invoke-RestMethod -Uri "$ApiRoot/territory/resolve" -Method Post -Body $body -ContentType "application/json" -Headers $h
      if (-not $r.success) { throw $r.error }
      $comunas = @($r.data.comunas)
      if ($comunas.Count -lt 1) { throw "resolve returned no comunas" }
    }
  }

  if ($IncludeS1) {
    Invoke-Smoke "S1 - GET /catalog/categories/tree" {
      $r = Invoke-RestMethod -Uri "$ApiRoot/catalog/categories/tree?activeOnly=true" -Method Get -Headers $h
      if (-not $r.success) { throw $r.error }
      $tree = @($r.data.tree)
      if ($tree.Count -lt 1) { $tree = @($r.data) }
      if ($tree.Count -lt 1) { throw "category tree empty (run migrate-v1.9-categories.ps1)" }
      $root = $tree[0]
      if (-not $root.slug) { throw "tree node missing slug" }
      if ($null -eq $root.children) { throw "tree node missing children[]" }
    }

    Invoke-Smoke "S1 - GET /catalog/categories/leaves" {
      $r = Invoke-RestMethod -Uri "$ApiRoot/catalog/categories/leaves" -Method Get -Headers $h
      if (-not $r.success) { throw $r.error }
      $leaves = @($r.data.categories)
      if ($leaves.Count -lt 1) { $leaves = @($r.data) }
      if ($leaves.Count -lt 1) { throw "no leaf categories" }
      $leaf = $leaves[0]
      if (-not $leaf.id -or -not $leaf.slug) { throw "leaf missing id/slug" }
    }
  }

  if ($IncludeS4) {
    Invoke-Smoke "S4 - GET /sales/deliveries/pending" {
      $r = Invoke-RestMethod -Uri "$ApiRoot/sales/deliveries/pending" -Method Get -Headers $h
      if (-not $r.success) { throw $r.error }
      if ($null -eq $r.data.deliveries) { throw "deliveries array missing (run migrate-v1.11-delivery.ps1)" }
    }
  }

  if ($IncludeS5) {
    $empresaId = $admin.User.empresaId
    if (-not $empresaId) { throw "admin session missing empresaId" }
    $extId = "smoke-s5-$(Get-Date -Format 'yyyyMMddHHmmss')"
    $rejectBody = @{
      provider   = "SANDBOX"
      externalId = $extId
      status     = "REJECTED"
      amount     = 0
      currency   = "CLP"
      metadata   = @{ kind = "SAAS_SUB"; empresaId = $empresaId }
    } | ConvertTo-Json -Depth 5

    Invoke-Smoke "S5 - core inbound REJECTED (1st)" {
      $r = Invoke-RestMethod -Uri "$CoreUrl/payments/webhooks/inbound" -Method Post `
        -Body $rejectBody -ContentType "application/json" -Headers @{ "x-internal-key" = $InternalKey }
      if (-not $r.success) { throw $r.error }
    }

    Invoke-Smoke "S5 - core inbound duplicate (2nd)" {
      $r = Invoke-RestMethod -Uri "$CoreUrl/payments/webhooks/inbound" -Method Post `
        -Body $rejectBody -ContentType "application/json" -Headers @{ "x-internal-key" = $InternalKey }
      if (-not $r.success) { throw $r.error }
      if (-not $r.data.duplicate) { throw "expected duplicate=true on second POST" }
    }
  }

  Invoke-Smoke "Soft delete + restore categoria (ciclo QA)" {
    $suffix = Get-Date -Format "yyyyMMddHHmmss"
    $createBody = @{ name = "QA-Smoke-$suffix"; description = "auto" } | ConvertTo-Json
    $created = Invoke-RestMethod -Uri "$ApiRoot/catalog/categories" -Method Post -Body $createBody -ContentType "application/json" -Headers $h
    if (-not $created.success) { throw $created.error }
    $cat = $created.data.category
    if (-not $cat.id) { $cat = $created.data }
    $id = $cat.id
    if (-not $id) { throw "category id missing" }

    $patchBody = @{ isActive = $false } | ConvertTo-Json
    $deactivated = Invoke-RestMethod -Uri "$ApiRoot/catalog/categories/$id" -Method Patch -Body $patchBody -ContentType "application/json" -Headers $h
    if (-not $deactivated.success) { throw $deactivated.error }

    $restored = Invoke-RestMethod -Uri "$ApiRoot/catalog/categories/$id/restore" -Method Post -Body "{}" -ContentType "application/json" -Headers $h
    if (-not $restored.success) { throw $restored.error }
  }
}

Write-Host ""
Write-Host "Resultado: $passed OK, $failed FAIL" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

if ($failed -gt 0) { exit 1 }
exit 0
