# Plan de sprints — POS-AI

**v1.4.0 — FINALIZADA** (2026-05-31)

---

## ✅ v1.4 — Entregado

| Área | Entrega |
|------|---------|
| Core | `/empresas` tenant + plataforma, `pos-ai-db`, puerto 1010 |
| BFF | `/pos/proxy/*`, proxy empresas tenant + plataforma |
| Frontend tenant | `/empresas`, POS, mantenedores |
| Frontend plataforma | `/platform/login`, `/platform/empresas` (MVP tabla + lifecycle) |
| QA | Smoke, Postman Empresas, checklist deploy |

**URLs dev:** http://localhost:8010 → `/platform/login` · tenant: `/login` · BFF health: `:2020/pos/proxy/health`

**Credenciales:** ver `README.md` y `.env.docker.example`

---

## v1.5 — Siguiente (no iniciado)

| # | Tarea |
|---|-------|
| 5.1 | Dashboard super-admin completo (KPIs, búsqueda, filtros estado) |
| 5.2 | Rol `PLATFORM_ADMIN` en BD (opcional vs solo env) |
| 5.3 | Postman BFF plataforma |
| 5.4 | `pos-api-assistant` (tel/WSP) |

## v1.6+ — Billing SaaS

Planes, suscripción, bloqueo por plan vencido.

---

## Convención de repos

| Producto | Carpeta | Rama | BD |
|----------|---------|------|-----|
| **POS-AI** | `d:\Proyectos\POS-AI` | `POS-AI` | `pos-ai-db` |
| **SVM** | `d:\Proyectos\svm\node` | `prod` | `erp_core_db` |
