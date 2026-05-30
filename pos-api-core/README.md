# POS-AI Core API (v1.4)

Core API multi-tenant. Puerto por defecto **1010**, base de datos **pos-ai-db**.

## Comandos

- `npm install`
- `npm run build`
- `npm start`
- `npm run dev`

## Variables de entorno

Copiar `.env.example` a `.env`:

| Variable | Default |
|----------|---------|
| `PORT` / `CORE_PORT` | `1010` |
| `DB_NAME` | `pos-ai-db` |
| `DB_HOST` | `127.0.0.1` |
| `DB_PORT` | `3308` (host; contenedor usa 3306) |
| `INTERNAL_API_KEY` | (requerido) |

## Docker (solo core)

```powershell
docker build -t pos-api-core .
docker run --env-file .env -p 1010:1010 pos-api-core
```

## Postman

Importar `pos-api-core.postman_collection.json` — carpeta **Empresas**.

Checklist QA: `QA-EMPRESAS-v1.4.md`.

## Stack completo

Desde la raíz del monorepo: `docker compose up -d --build`
