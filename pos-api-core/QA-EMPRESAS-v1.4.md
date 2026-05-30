# QA — Empresas (pos-api-core v1.4)

Checklist manual con Postman (`pos-api-core.postman_collection.json` → carpeta **Empresas**).

## Pre-requisitos

- Stack: `docker compose up -d`
- **Core directo (Postman):** `baseUrl=http://localhost:1010`, `keyInternal=supersecretkey`
- **BFF (smoke/UI):** `http://localhost:2020/pos/proxy/empresas/me` con JWT + headers
- Demo seed: admin `admin@empanadascostaazul.cl` / `@dmin123_`
- UI: http://localhost:8010 → **Mantenedores → Empresa**

## 1. Onboarding plataforma (x-internal-key)

| # | Request | Esperado |
|---|---------|----------|
| 1 | `POST /empresas` con RUT + admin | 201, `empresa.estado=ACTIVO`, `adminUserId` presente |
| 2 | Login con admin creado | 200 + token |
| 3 | `POST /empresas` RUT duplicado | 409 `RUT_ALREADY_REGISTERED` |
| 4 | `POST /empresas` sin admin | 201, `estado=PENDIENTE_ONBOARDING` |
| 5 | Login usuario en empresa PENDIENTE | 403 `EMPRESA_PENDING_ONBOARDING` |

## 2. Perfil tenant (JWT + x-internal-key)

| # | Request | Esperado |
|---|---------|----------|
| 6 | `GET /empresas/me` | 200, datos Costa Azul |
| 7 | `GET /empresas/:id` propio | 200 |
| 8 | `GET /empresas/:id` otro UUID | 403 `EMPRESA_ACCESS_DENIED` |
| 9 | `PATCH /empresas/:id` nombre fantasía | 200 |
| 10 | `PATCH /empresas/:id` con `estado` | 422 o ignorado (tenant no cambia lifecycle) |

## 3. Lifecycle plataforma (x-internal-key, sin JWT)

| # | Request | Esperado |
|---|---------|----------|
| 11 | `POST /empresas/:id/suspend` | 200, `estado=SUSPENDIDO` |
| 12 | Login tenant suspendido | 403 `EMPRESA_SUSPENDED` |
| 13 | `POST /empresas/:id/activate` | 200, `estado=ACTIVO` |
| 14 | `PATCH /empresas/:id/platform` estado | 200 |

## 4. Aislamiento operativo

Tras login Costa Azul, con `x-branch-id` de sucursal propia:

- `GET /catalog/categories` solo datos de su tenant
- Cambiar `x-branch-id` a UUID ajeno → 403 `BRANCH_TENANT_MISMATCH`

## Errores documentados

| Código | HTTP |
|--------|------|
| `EMPRESA_NOT_FOUND` | 404 |
| `EMPRESA_ACCESS_DENIED` | 403 |
| `EMPRESA_SUSPENDED` | 403 |
| `EMPRESA_PENDING_ONBOARDING` | 403 |
| `RUT_ALREADY_REGISTERED` | 409 |
| `SLUG_ALREADY_TAKEN` | 409 |
