# Plan de sprints — POS-AI v1.4 → v1.5

Última actualización: 2026-05-31 (Sprint 2 hardening cerrado).

---

## ✅ Sprint 1 — Multi-tenant v1.4 (cerrado)

| Entrega | Estado |
|---------|--------|
| Core `/empresas` tenant + plataforma | ✅ |
| BFF proxy `/pos/proxy/empresas/*` | ✅ |
| Frontend `/empresas` (perfil tenant) | ✅ |
| Postman carpeta Empresas + Newman QA | ✅ |
| Docker puertos 8010 / 2020 / 1010 | ✅ |

---

## ✅ Sprint 2 — Hardening v1.4 (cerrado)

| # | Tarea | Estado |
|---|-------|--------|
| 2.1 | Commit atómico (BFF + frontend + Postman) | Pendiente si tú lo pides |
| 2.2 | Docs puertos/prefijos | ✅ |
| 2.3 | Smoke `qa-smoke.ps1` / `.sh` + empresas BFF | ✅ |
| 2.4 | Newman assertions carpeta Empresas | ✅ |
| 2.5 | Auditor solo lectura en `/empresas` | ✅ (UI) |

**Verificación:** `.\scripts\qa-smoke.ps1` · Newman carpeta Empresas · UI http://localhost:8010/empresas

---

## Sprint 3 — Plataforma super-admin (siguiente, 1–2 días)

Objetivo: onboarding y lifecycle de empresas desde producto (no solo Postman).

| # | Tarea | Notas |
|---|-------|-------|
| 3.1 | Rol `PLATFORM_ADMIN` (o auth separado sin tenant) | Sin `x-branch-id` |
| 3.2 | BFF `/platform/empresas/*` proxy hacia core | POST, suspend, activate, PATCH platform |
| 3.3 | UI `/platform/empresas` — listado + alta tenant | Tabla, filtros por estado |
| 3.4 | UI acciones suspend/activate | Confirmación modal |
| 3.5 | Postman/collection plataforma en BFF | Paridad con core |

**Fuera de scope Sprint 3:** billing SaaS, planes, facturación.

---

## Sprint 4 — Asistente tel/WSP (v1.5+, según README)

| # | Tarea |
|---|-------|
| 4.1 | Servicio `pos-api-assistant` (esqueleto) |
| 4.2 | Integración WhatsApp / telefonía (TBD) |
| 4.3 | Contexto tenant en conversaciones |

---

## Sprint 5 — Billing SaaS (v1.6+)

| # | Tarea |
|---|-------|
| 5.1 | Modelo planes / suscripción |
| 5.2 | Middleware bloqueo por plan vencido |
| 5.3 | UI facturación plataforma |

---

## Convención de repos

| Producto | Carpeta | Rama | BD |
|----------|---------|------|-----|
| **POS-AI** | `d:\Proyectos\POS-AI` | `POS-AI` | `pos-ai-db` |
| **SVM** | `d:\Proyectos\svm\node` | `prod` | `erp_core_db` |

---

## Deuda técnica conocida

- Postman MCP en Cursor requiere `/setup` con API key (hoy Newman CLI).
- `pos-api-bff/svm-api-bff.postaman_collection.json` — renombrar/limpiar legacy SVM.
- Frontend build local requiere `npm install` en `pos-frontend` (Docker es la vía principal).
