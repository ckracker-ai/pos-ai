# POS-AI — ERP SaaS multi-tenant

Producto en desarrollo activo. Evolución SaaS del ERP SVM con multi-empresa en **core, BFF y frontend**.

## Roadmap de versiones

| Versión | Alcance |
|---------|---------|
| **v1.4** (actual) | Multi-tenant: `empresa_id`, CRUD `/empresas`, BD `erp_core_db_v13` |
| **v1.5** (próximo) | Asistente teléfono / WhatsApp (`pos-api-assistant`) |
| **v1.6+** | Billing SaaS, onboarding self-service |

## Relación con SVM

| | **SVM** | **POS-AI** (este repo) |
|---|---|---|
| Carpeta | `d:\Proyectos\svm\node` | `d:\Proyectos\POS-AI` |
| Rama Git | `prod` | `POS-AI` |
| Versión | v1.2.x (congelada) | v1.4.0+ |
| BD | `erp_core_db` | `erp_core_db_v13` |

## Estructura del monorepo

```
POS-AI/
├── pos-frontend/     # UI Next.js
├── pos-api-bff/      # Backend-for-frontend
├── pos-api-core/     # Lógica de negocio + multi-tenant
├── db-init/          # Schema y migraciones
├── docker-compose.yml
└── docker-compose.v13.yml   # sandbox con puertos alternativos
```

## Arranque rápido (v1.4)

```powershell
cd d:\Proyectos\POS-AI
docker compose up -d --build
```

- Frontend: http://localhost
- BFF: http://localhost:3000/api/health
- BD: `erp_core_db_v13` (ver `.env.v13.example`)

Sandbox con puertos alternativos (8080 / 3001 / 3307):

```powershell
docker compose -p pos-ai-sandbox -f docker-compose.yml -f docker-compose.v13.yml --env-file .env.v13.example up -d --build
```

## API v1.4 (core)

- Modelo `Empresa` y `empresa_id` en tablas operativas
- JWT y middleware con contexto de tenant
- CRUD `/empresas` en `pos-api-core`

## Pendiente v1.4

- BFF: proxy `/empresas` y header `x-empresa-id`
- Frontend: contexto tenant, perfil empresa, onboarding

## Credenciales dev

- Admin: `admin@empanadascostaazul.cl` / `@dmin123_`
