# Publica el monorepo en GitHub como repositorio PRIVADO.
# Nadie puede ver el codigo sin ser colaborador invitado en GitHub.
#
# Uso:
#   gh auth login
#   .\scripts\github-publish.ps1

$ErrorActionPreference = "Stop"
$git = "C:\Program Files\Git\cmd\git.exe"
$repo = "ckracker-ai/svm-erp"
$root = Split-Path $PSScriptRoot -Parent

Set-Location $root

if (-not (Test-Path .git)) {
  throw "No hay repositorio git en $root. Ejecuta git init primero."
}

gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw @"
GitHub CLI no esta autenticado.
Ejecuta:  gh auth login
Luego vuelve a correr este script.
"@
}

$remotes = & $git remote 2>$null
if ($remotes -notcontains "origin") {
  & $git remote add origin "git@github.com:$repo.git"
}

$repoExists = $false
gh repo view $repo --json visibility 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
  $repoExists = $true
  $info = gh repo view $repo --json visibility,isPrivate | ConvertFrom-Json
  if ($info.visibility -ne "PRIVATE" -and -not $info.isPrivate) {
    Write-Host "ADVERTENCIA: $repo es PUBLICO. Forzando visibilidad PRIVATE..." -ForegroundColor Yellow
    gh repo edit $repo --visibility private --accept-visibility-change-consequences
    if ($LASTEXITCODE -ne 0) {
      throw "El repo existe pero es publico. Cambialo a Private en GitHub Settings o borra el repo y vuelve a ejecutar este script."
    }
    Write-Host "Repo actualizado a PRIVATE." -ForegroundColor Green
  } else {
    Write-Host "Repo $repo ya existe y es PRIVATE." -ForegroundColor Green
  }
} else {
  Write-Host "Creando repo PRIVADO $repo ..." -ForegroundColor Cyan
  gh repo create $repo `
    --private `
    --source=. `
    --remote=origin `
    --description "SVM ERP monorepo (frontend, api-bff, api-core, db-init) - PRIVATE"
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo crear el repositorio. Revisa permisos de la cuenta GitHub."
  }
}

# Verificacion final
$check = gh repo view $repo --json visibility,isPrivate | ConvertFrom-Json
if ($check.visibility -ne "PRIVATE" -and -not $check.isPrivate) {
  throw "Abortado: el repositorio no quedo en modo PRIVATE."
}

Write-Host "Push rama dev..." -ForegroundColor Cyan
& $git push -u origin dev
if ($LASTEXITCODE -ne 0) { throw "Fallo push de dev" }

Write-Host "Push rama prod..." -ForegroundColor Cyan
& $git push -u origin prod
if ($LASTEXITCODE -ne 0) { throw "Fallo push de prod" }

Write-Host ""
Write-Host "Listo (repositorio PRIVADO): https://github.com/$repo" -ForegroundColor Green
Write-Host "Solo usuarios invitados en GitHub pueden ver el codigo." -ForegroundColor Green
Write-Host "Ramas: dev (desarrollo), prod (produccion/VPS)" -ForegroundColor Green
