# Plan de sprints — POS-AI

**Actualizado:** 2026-06-02 · Sprint activo WSP/comprobantes.

**Sprint en curso:** [`docs/sprints/SPRINT-WSP-AFINADO-2026-06.md`](docs/sprints/SPRINT-WSP-AFINADO-2026-06.md) · rama `sprint/wsp-comprobantes-2026-06`

---

## ✅ v1.4 — FINALIZADA

| Área | Entrega |
|------|---------|
| Core | `/empresas` tenant + plataforma, `pos-ai-db`, puerto 1010 |
| BFF | `/pos/proxy/*`, proxy empresas tenant + plataforma |
| Frontend tenant | `/empresas`, POS, mantenedores |
| Frontend plataforma | `/platform/login`, `/platform/empresas` (MVP) |
| QA | Smoke, Postman Empresas, checklist deploy |

---

## ✅ v1.7 — Plan Estándar (ENTREGADO)

| # | Tarea | Estado |
|---|-------|--------|
| 7.1 | `pos-api-assistant` + webhook WSP | ✅ |
| 7.2 | Core `/assistant/*` + bindings + gate `assistantWhatsapp` | ✅ |
| 7.3 | Migraciones v1.7 (`001`–`004`) | ✅ |
| 7.4 | Catálogo demo Costa Azul + UI plataforma WSP + **perfil transferencia** | ✅ |
| 7.5 | Simulador `/platform/whatsapp` | ✅ |
| 7.6 | Meta Graph API + firma webhook | ✅ doc `META-WHATSAPP.md` |
| 7.7 | Comprobantes: IA vs perfil banco/RUT + variantes | ✅ |
| 7.8 | Tenant `/comprobantes` confirmar/rechazar + WSP cliente | ✅ |
| 7.9 | Doc maestro `docs/COMENZAR-POS-AI.md` + HTML PDF | ✅ |

**URLs dev:** http://localhost:8010 · BFF `:2020/pos/proxy/health` · Assistant `:3030/health`

**Demo WSP:** teléfono `56900000001` · Admin WSP `56900000002` · Costa Azul plan Estándar

**Comandos arranque:**

```powershell
cd d:\Proyectos\POS-AI
.\scripts\migrate-v1.7-assistant.ps1
docker compose up -d --build pos-api-core pos-api-assistant pos-api-bff pos-frontend
```

---

## 🔄 v1.6 — Billing SaaS (parcial)

| Hecho | Pendiente |
|-------|-----------|
| `saas_planes` + `empresas.plan_id` | Cobro recurrente pasarela (v1.8+) |
| `empresa_suscripciones` + login bloqueo vencimiento | Cron batch `.\scripts\cron-refresh-suscripciones.ps1` ✅ |
| Catálogo BASICO / ESTANDAR / FULL | `empresa_suscripciones` facturación externa |
| Plataforma: cambiar plan + extender piloto/gracia | — |
| Enforcement límites sucursal/usuario | — |
| UI tenant `users.whatsapp_phone` | ✅ |
| Imagen comprobante en `/comprobantes` | ✅ |

Doc: `docs/comercial/PLANES-BD.md` · `.\scripts\migrate-v1.6.1-suscripciones.ps1`

---

## 🔄 v1.5 — Plataforma (parcial)

| # | Tarea | Estado |
|---|-------|--------|
| 5.1 | Dashboard super-admin `/platform/dashboard` | ✅ KPIs + suscripciones |
| 5.2 | `platform_users` + login BD (seed env) | ✅ |
| 5.3 | Postman BFF plataforma | ✅ `pos-api-bff-platform.postman_collection.json` |

---

## 🚀 Mañana — instrucción única al agente

```
Retoma POS-AI según docs/HANDOFF-PROXIMO-DIA.md y SPRINT-PLAN.md.
Prioridad: (1) UI estilo landing tenant+plataforma, (2) alcance SDK pasarela v1.8, (3) spike WSP por sucursal.
```

Detalle completo: **`docs/HANDOFF-PROXIMO-DIA.md`**

| Sprint | ID | Entrega | Estado |
|--------|-----|---------|--------|
| **A — UI corporativa** | `v1.8a-ui` | Sidebar olivo, dashboard tenant, `PlatformShell`, login ya alineado | ✅ base |
| **B — Pasarela** | `v1.8b-pay` | `docs/comercial/PASARELA-SDK-ALCANCE-v1.8.md` | ✅ diseño |
| **C — WSP sucursal** | `v1.8c-wsp` | `docs/assistant/WSP-POR-SUCURSAL.md` | ✅ spike |
| **D — Seguridad** | `v1.9-sec` (propuesto) | `docs/SEGURIDAD-BACKLOG.md` | ⏳ pendiente |

**Seguridad (nota):** keys en server, `.env` fuera del repo, cifrado datos críticos, rate-limit en servidor — ver backlog.

---

## 📋 Mañana — checklist (5 min + demo)

1. **Docker arriba:** `docker compose ps` — core, bff, frontend, assistant, mysql.
2. **Migraciones:** `.\scripts\migrate-v1.7-assistant.ps1` si BD nueva o sin `004-transfer-profile`.
3. **Smoke:** `.\scripts\qa-smoke.ps1`
4. **Demo E2E Estándar:**
   - Plataforma → Costa Azul → datos transferencia + binding `56900000001`
   - `/platform/whatsapp` → sucursal → buscar → pedido → mensaje transferencia
   - Enviar imagen comprobante (simulador) o PowerShell webhook
   - Tenant `/comprobantes` → **Confirmar pago**
5. **Env opcionales:** `OPENAI_API_KEY`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` (Meta real).

**Documento único para PDF/comercial:** `docs/comercial/COMENZAR-POS-AI.html` → Imprimir → PDF.

---

## 🔄 Landing comercial (MVP hecho — 2026-06-01)

| Hecho | Pendiente |
|-------|-----------|
| `/` landing futurista (hero 3D, sección IA, colores corporativos) | — |
| Logo PNG limpio + `PosAiLogo` height/navbar | Asset `pos-ai-mark` solo icono (opcional) |
| Precios desde `GET /public/planes` (BFF) | Pasarela pago web real |
| `/registro` + `/checkout` sandbox + webhook suscripción | Renovación automática recurrente |
| Perfil empresa pestañas + transferencia tenant | — |
| Formulario contacto (mailto) | CRM / leads en BD |
| **UI app = landing** | Sprint `v1.8a-ui` mañana |

---

## v2.0 — Visión SaaS self-service

Documento: `docs/comercial/VISION-v2.0-SAAS.md`

| Hito | Entrega |
|------|---------|
| v1.8 | Pasarela sandbox suscripción SaaS + webhook (`SAAS-CHECKOUT-SANDBOX.md`) |
| v1.8b | Webhook cobro **ventas** Full (`PAYMENT-WEBHOOK.md`) — hecho en assistant |
| v1.9 | Registro público + checkout suscripción |
| v2.0 | Recurrencia, email, bloqueo impago |

---

## Convención repos

| Producto | Carpeta | Rama | BD |
|----------|---------|------|-----|
| **POS-AI** | `d:\Proyectos\POS-AI` | `POS-AI` | `pos-ai-db` |
| **SVM** | `d:\Proyectos\svm\node` | `prod` | `erp_core_db` |

---

## Índice documentación

| Doc | Uso |
|-----|-----|
| `docs/COMENZAR-POS-AI.md` | Guía completa texto |
| `docs/comercial/COMENZAR-POS-AI.html` | Exportar PDF |
| `docs/comercial/PLAN-SAAS-POS-AI.md` | Matriz comercial |
| `docs/assistant/README.md` | Assistant técnico |
| `docs/assistant/COMPROBANTES-VARIANTES.md` | Tipos comprobante |
| `docs/assistant/META-WHATSAPP.md` | Producción Meta |
