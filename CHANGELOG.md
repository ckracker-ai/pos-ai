# Changelog

## [1.4.0] — 2026-05-31

Versión multi-tenant cerrada: empresa en core, BFF y frontend; MVP super-admin plataforma.

### Multi-tenant (empresa en todo el stack)
- Monorepo: `pos-api-core`, `pos-api-bff`, `pos-frontend` (puertos **1010 / 2020 / 8010**, prefijo `/pos/proxy`)
- BD **`pos-ai-db`** (`db-init/init.sql`)
- Core: CRUD `/empresas` tenant, lifecycle plataforma, login bloqueado por estado empresa
- BFF: proxy `/empresas` (perfil tenant)
- Frontend: mantenedor **`/empresas`** (admin edita, auditor lectura)

### Plataforma (MVP v1.4 — dashboard básico; UI rica en v1.5)
- Auth plataforma (`PLATFORM_ADMIN` vía env en BFF)
- BFF: `/platform/empresas` (listado, alta, suspend/activate)
- UI: `/platform/login`, `/platform/empresas`
- Entrada por defecto: `http://localhost:8010` → `/platform/login`

### QA y ops
- Smoke scripts actualizados (`scripts/qa-smoke.ps1`, `.sh`)
- Postman carpeta **Empresas** + `QA-EMPRESAS-v1.4.md`
- `SPRINT-PLAN.md` con roadmap v1.5+

### Próximo (v1.5)
- Dashboard super-admin ampliado (métricas, filtros, planes)
- Asistente teléfono / WhatsApp (`pos-api-assistant`)

## [1.3.0] — absorbido en v1.4

- Trabajo multi-tenant inicial (rama `POS-AI`, pre-renombre)

## [1.2.0] — 2026-05-29

### Operaciones y mantenedores
- Desactivación lógica (soft delete) documentada para **usuarios** y **sucursales** con filtro Activos/Inactivos y restauración.
- Protección al desactivar: no auto-baja, no eliminar al último administrador activo.
- Sucursales: aviso de usuarios activos asignados al desactivar.

### Mermas y reportes
- Reporte de mermas con filtro por estado, nota de rechazo y exportación Excel.
- Validación estricta: cantidad de merma debe ser mayor a 0 (UI + API).
- Bloqueo de aprobación de mermas con cantidad 0.

### Comandas y UX
- Comandas muestran referencia de venta (ej. Venta #EF-01) en lugar de UUID interno.
- Eliminados IDs de sucursal visibles en barra activa y pantallas operativas.

### Validación numérica
- Sanitización de entradas numéricas en productos, mermas y POS (sin negativos ni símbolos inválidos).

### Roles y permisos
- Configuración centralizada `role-access.ts` (dashboard, menú, rutas).
- Auditor: aprobar/rechazar mermas, consulta usuarios/sucursales; sin alta/baja ni gestión de locales.
- Restricciones en API core para sucursales y creación de usuarios (solo admin).
