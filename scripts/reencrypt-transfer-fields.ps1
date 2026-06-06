$ErrorActionPreference = "Stop"

Write-Host "Rebuild core con script de recifrado..."
docker compose build pos-api-core | Out-Host
docker compose up -d --force-recreate pos-api-core | Out-Host

Write-Host "Ejecutando recifrado en pos-api-core..."
docker exec pos-ai-api-core node dist/db/reencryptTransferFields.js | Out-Host

Write-Host "OK — recifrado de campos transferencia completado."

