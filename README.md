# POS-AI — ERP SaaS multi-tenant

Producto v1.4: multi-empresa en core, BFF y frontend.

## Roadmap

| Versión | Alcance |
|---------|---------|
| **v1.4** (actual) | Multi-tenant, BD `pos-ai-db`, core puerto **1010** |
| **v1.5** | Asistente tel/WSP (`pos-api-assistant`) |

## Relación con SVM

| | **SVM** | **POS-AI** |
|---|---|---|
| Carpeta | `d:\Proyectos\svm\node` | `d:\Proyectos\POS-AI` |
| Versión | v1.2.x | v1.4.0+ |
| BD | `erp_core_db` | `pos-ai-db` |

## Estructura

```
POS-AI/
├── pos-frontend/
├── pos-api-bff/        # puerto 2020, prefijo /pos/proxy
├── pos-api-core/       # puerto 1010
├── db-init/init.sql    # → pos-ai-db
└── docker-compose.yml  # proyecto Docker: pos-ai
```

## Arranque

```powershell
cd d:\Proyectos\POS-AI
docker compose up -d --build
```

| Servicio | Puerto host | Ruta API |
|----------|-------------|----------|
| pos-frontend | **8010** | — |
| pos-api-bff | **2020** | `/pos/proxy/*` |
| pos-api-core | 1010 | (interno) |
| pos-ai-db-mysql | **3308** (host) | — |

> MySQL host: **3308** (SVM usa 3306). Override: `MYSQL_HOST_PORT=3309`.

- UI: http://localhost:8010
- BFF health: http://localhost:2020/pos/proxy/health
- Core health: http://localhost:1010/health

Sandbox (puertos alternativos): ver `.env.sandbox.example` + `docker-compose.sandbox.yml`.

## QA smoke

```powershell
.\scripts\qa-smoke.ps1
```

Checklist manual: `deploy/QA-SMOKE-CHECKLIST.md` · Empresas Postman: `pos-api-core/QA-EMPRESAS-v1.4.md`

## Credenciales dev

- Admin: `admin@empanadascostaazul.cl` / `@dmin123_`
- MySQL user: `usr_pos_ai` / `Usr@12345`
