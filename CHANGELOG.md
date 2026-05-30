# Changelog

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

### POS e impuestos
- IVA Chile **19%** en punto de venta (carrito y comprobante).

### Mermas (fix auditor)
- Rechazo/aprobación por id con rol desde BD; fallback PATCH; rutas BFF/core alineadas.

### Comercial
- Propuesta PDF/HTML en `docs/comercial/`.

### Infraestructura
- Healthchecks Docker, scripts QA smoke y checklist pre-deploy.
- Versión expuesta en health API y sidebar (`v1.2`).
