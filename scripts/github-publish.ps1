# Publica el monorepo en GitHub (requiere gh autenticado o repo vacio creado).
# Uso:
#   gh auth login   # una sola vez
#   .\scripts\github-publish.ps1

$ErrorActionPreference = "Stop"
$git = "C:\Program Files\Git\cmd\git.exe"
$repo = "ckracker-ai/svm-erp"
$root = Split-Path $PSScriptRoot -Parent

Set-Location $root

if (-not (Test-Path .git)) {
  throw "No hay repositorio git en $root"
}

$remotes = & $git remote 2>$null
if ($remotes -notcontains "origin") {
  & $git remote add origin "git@github.com:$repo.git"
}

$auth = gh auth status 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Host "Creando repo privado $repo (si no existe)..." -ForegroundColor Cyan
  gh repo create $repo --private --source=. --remote=origin --description "SVM ERP monorepo (frontend, api-bff, api-core, db-init)" 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Repo ya existe o remote configurado; continuando con push." -ForegroundColor Yellow
  }
}

Write-Host "Push rama dev..." -ForegroundColor Cyan
& $git push -u origin dev
Write-Host "Push rama prod..." -ForegroundColor Cyan
& $git push -u origin prod

Write-Host ""
Write-Host "Listo: https://github.com/$repo" -ForegroundColor Green
Write-Host "Ramas: dev (desarrollo), prod (produccion/VPS)" -ForegroundColor Green
