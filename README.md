# POS-AI — ERP SaaS multi-tenant (v1.3+)

Producto en desarrollo activo. Evolución SaaS del ERP SVM: multi-empresa, onboarding de tenants y (futuro) asistente por teléfono/WhatsApp.

## Relación con SVM

| | **SVM** | **POS-AI** (este repo) |
|---|---|---|
| Carpeta | `d:\Proyectos\svm\node` | `d:\Proyectos\POS-AI` |
| Rama Git | `prod` | `POS-AI` |
| Versión | v1.2.x (congelada) | v1.3.0+ |
| Base de datos | `erp_core_db` | `erp_core_db_v13` |
| Cliente actual | Costa Azul (producción) | Sandbox / nuevos tenants |
| Desarrollo | Solo hotfixes acordados | Línea principal |

Comparten origen e historial Git, pero son **proyectos distintos** a partir de la opción B de separación.

## Arranque rápido (dev v1.3)

```powershell
# Stack aislado (puertos 8080 / 3001 / 3307)
docker compose -f docker-compose.v13.yml up -d --build

# O sobre el compose principal con BD v13
copy .env.v13.example .env
docker compose up -d --build
```

Variables clave en `.env.v13.example`: `DB_NAME=erp_core_db_v13`.

## Base de datos

- Schema modular en `db-init/schema/v1.3-*`
- Migraciones en `db-init/migrations/v1.3.0/`
- Scripts: `db-init/scripts/provision-v13-sandbox.ps1`, `run-migration-v13.ps1`

Empresa demo: slug `costa-azul`, ID `11111111-1111-4111-8111-111111111111`.

## API (novedades v1.3)

- Modelo `Empresa` y `empresa_id` en tablas operativas
- JWT y middleware con contexto de tenant
- CRUD `/empresas` en api-core

## Pendiente en esta línea

- BFF: proxy `/empresas` y header `x-empresa-id`
- Frontend: contexto tenant, perfil empresa, onboarding
- Billing SaaS y módulo asistente (api-assistant)

## Credenciales dev

- Admin: `admin@empanadascostaazul.cl` / `@dmin123_`
- MySQL root (dev): ver `.env.v13.example`
