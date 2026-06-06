# Documentos legales y aceptaciones auditables (S7).
# Uso: .\scripts\migrate-v1.15-legal.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$password = if ($env:MYSQL_ROOT_PASSWORD) { $env:MYSQL_ROOT_PASSWORD } else { "S3d4f5g6_" }

Write-Host "Aplicando v1.15.0-001-legal-documents..."
Get-Content "$root\db-init\migrations\v1.15.0\001-legal-documents.sql" -Raw -Encoding UTF8 |
  docker exec -i pos-ai-db-mysql mysql -uroot "-p$password" --default-character-set=utf8mb4 pos-ai-db

Write-Host "OK. Verifica: SELECT doc_type, version, is_current FROM legal_documents;"
