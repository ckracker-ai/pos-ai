# QA — BFF Plataforma (v1.5)

Colección Postman: `pos-api-bff-platform.postman_collection.json`

## Requisitos

- Stack Docker levantado (`pos-api-bff` en **2020**, `pos-api-core` en **1010**).
- Usuario plataforma (seed core): `platform@pos-ai.local` / `PlatformAdmin2026!` (o `PLATFORM_ADMIN_*` en `.env`).

## Newman

```bash
npx newman run pos-api-bff/pos-api-bff-platform.postman_collection.json \
  --env-var "bffBaseUrl=http://localhost:2020/pos/proxy" \
  --env-var "coreBaseUrl=http://localhost:1010" \
  --env-var "keyInternal=supersecretkey"
```

Ejecutar primero **POST /platform/auth/login** (o toda la carpeta en orden).

## Cron suscripciones vencidas

El login tenant ya valida vencimiento; el job batch evita depender del primer login del día:

```powershell
.\scripts\cron-refresh-suscripciones.ps1
```

Programar 1×/día (Task Scheduler / cron en VPS). Variables: `CORE_BASE_URL`, `INTERNAL_API_KEY`.
