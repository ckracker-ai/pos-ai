# POS-AI — ERP SaaS multi-tenant

Producto **v1.7**: multi-empresa + **asistente WhatsApp** (plan Estándar) + validación comprobantes en POS.

**Guía completa (PDF):** [`docs/COMENZAR-POS-AI.md`](docs/COMENZAR-POS-AI.md) · [`docs/comercial/COMENZAR-POS-AI.html`](docs/comercial/COMENZAR-POS-AI.html)  
**Sprints / handoff:** [`SPRINT-PLAN.md`](SPRINT-PLAN.md)

**v1.6 (en curso):** planes SaaS en BD (`saas_planes`) enlazados a cada empresa.

```powershell
.\scripts\migrate-v1.7-assistant.ps1
docker compose up -d --build pos-api-core pos-api-assistant pos-api-bff pos-frontend
```

## Roadmap

| Versión | Alcance |
|---------|---------|
| **v1.4** ✅ | Multi-tenant, BD `pos-ai-db`, core **1010** |
| **v1.7** ✅ | Assistant WSP, comprobantes, `/comprobantes` tenant |
| **v1.8** | Pasarela cobro ventas (Full) |
| **v2.0** | SaaS self-service checkout |

## Repositorios GitHub

| Producto | Repositorio | Rama principal |
|----------|-------------|----------------|
| **POS-AI** | https://github.com/ckracker-ai/pos-ai | `main` (desarrollo: `POS-AI`) |
| **SVM** | https://github.com/ckracker-ai/svm-erp | `prod` / `dev` |

## Relación con SVM (local)

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
| pos-api-assistant | **3030** | WhatsApp / assistant |
| pos-ai-db-mysql | **3308** (host) | — |

> MySQL host: **3308** (SVM usa 3306). Override: `MYSQL_HOST_PORT=3309`.

- UI: http://localhost:8010 → redirige a `/platform/login`
- Login tenant: http://localhost:8010/login
- BFF health: http://localhost:2020/pos/proxy/health
- Core health: http://localhost:1010/health

Sandbox (puertos alternativos): ver `.env.sandbox.example` + `docker-compose.sandbox.yml`.

## QA smoke

```powershell
.\scripts\qa-smoke.ps1
```

Checklist manual: `deploy/QA-SMOKE-CHECKLIST.md` · Empresas Postman: `pos-api-core/QA-EMPRESAS-v1.4.md`

## Credenciales dev

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin tenant | `admin@empanadascostaazul.cl` | `@dmin123_` |
| **Vendedor** | `vendedor@empanadascostaazul.cl` | `Vendedor@12345` |
| Comanda | `comanda@empanadascostaazul.cl` | `Comanda@12345` |
| Plataforma | `platform@pos-ai.local` | `PlatformAdmin2026!` |

Los usuarios demo se crean al arrancar `pos-api-core` (`seedBootstrapDemoUsers`). Si ya existía la BD sin vendedor: reinicia core (`docker compose restart pos-api-core`) o `BOOTSTRAP_DEMO_USERS_RESET_PASSWORD=true` una vez.

- **Plataforma:** http://localhost:8010/platform/login
- MySQL user: `usr_pos_ai` / `Usr@12345`
