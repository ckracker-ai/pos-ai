# Handoff — próximo día de trabajo

**Fecha base:** 2026-06-02 · Repo: `d:\Proyectos\POS-AI`  
**Última ejecución handoff:** **S0 + S1 cerrados** · smoke S0/S1 · TDD catálogo + carrito WSP.

---

## Instrucción única para el agente (copiar/pegar mañana)

```
Retoma POS-AI según docs/HANDOFF-PROXIMO-DIA.md y SPRINT-PLAN.md.
S0–S5 + S4 cerrados. Prioridad: WSP P2 (mensajes/estilos) o S6 ERP AI.
Smoke: .\scripts\qa-smoke.ps1 -IncludeS0 -IncludeS1
Migración S1 si BD nueva: .\scripts\migrate-v1.9-categories.ps1
```

---

## Lo que quedó listo (S0 cerrado)

| Área | Estado |
|------|--------|
| WSP + comprobantes | E2E, admin sin re-spam, carrito multi-búsqueda (`WSP-CARRITO-MULTI-BUSQUEDA.md`) |
| Delivery ventas | API + POS + columna reportes |
| Territorio / sucursales | Regiones/comunas + CRUD UI (CUT completo → **S2**) |
| Seguridad mínima | Cifrado transfer, recifrado, `timingSafeEqual`, warn secrets |
| Smoke S0 | `.\scripts\qa-smoke.ps1 -IncludeS0` |

**URLs:** `http://localhost:8010/` · tenant login `/login` · plataforma `/platform/login`

**Credenciales demo:**

- Plataforma: `platform@pos-ai.local` / `PlatformAdmin2026!`
- Tenant admin: `admin@empanadascostaazul.cl` / (ver seed local)
- Vendedor: `vendedor@empanadascostaazul.cl` / `Vendedor@12345`

```powershell
cd d:\Proyectos\POS-AI
docker compose up -d
.\scripts\qa-smoke.ps1 -IncludeS0
# Si BD nueva:
.\scripts\migrate-v1.8-territory.ps1
.\scripts\migrate-v1.7-assistant.ps1
.\scripts\migrate-v1.9-categories.ps1
```

---

## Sprint A — UI corporativa (recomendado primero)

**Objetivo:** Misma identidad que la landing (olivo `#4A533C`, lino `#D1C7BD`, vainilla `#F4F4F3`) en **todo** el producto.

| Alcance | Archivos / notas |
|---------|------------------|
| Tokens Tailwind | Ya en `global.css` / `tailwind` — extender si falta |
| Layout tenant | `DashboardLayout`, `SidebarMenu`, `Navbar` — fondos, bordes lino, acentos olivo |
| Layout plataforma | `/platform/*` — hoy slate oscuro; unificar o variante “dark olive” coherente |
| Formularios / cards | Botones primarios olivo, superficies vainilla |
| Login / registro / checkout | Alinear con landing (opcional fondo hero reducido) |

**No hacer en un solo día:** animaciones pesadas, rediseño completo de cada pantalla POS — usar **componentes base** (`Button`, `Card`, `PageHeader`) y migrar módulos por lotes.

**Criterio de hecho:** Dashboard tenant + login tenant + login plataforma se ven “familia” de la landing.

---

## Sprint B — SDK / pasarela (análisis + contrato)

**Objetivo:** Dejar listo el **alcance** y el **contrato** antes de codificar el SDK real (Webpay / Flow / Mercado Pago).

### Dos flujos de pago (no mezclar)

| Flujo | Quién paga | Estado actual |
|-------|------------|---------------|
| **Suscripción SaaS** | El tenant a POS-AI | Sandbox: `/checkout`, webhook `subscription-payment` |
| **Venta al cliente final** | Cliente WSP → comercio | Plan Full: link + webhook `confirmOnlinePayment` (doc `PAYMENT-WEBHOOK.md`) |

### Entregables del análisis

1. **Matriz de decisión:** proveedor(es) Chile, costo, PCI, redirect vs embedded.
2. **Contrato webhook unificado** (campos mínimos): `provider`, `externalId`, `amount`, `currency`, `status`, `metadata.empresaId|pedidoId|suscripcionId`.
3. **Carpeta propuesta:** `packages/payment-sdk/` o `pos-api-core/src/modules/payments/` con interfaces `PaymentProvider`, `createCheckout`, `parseWebhook`.
4. **Checklist v1.8:** sandbox redirect, firma HMAC, idempotencia, pruebas Postman.

**Docs existentes:** `docs/comercial/SAAS-CHECKOUT-SANDBOX.md`, `docs/assistant/PAYMENT-WEBHOOK.md`, `docs/comercial/VISION-v2.0-SAAS.md`.

---

## Sprint C — WhatsApp por sucursal (spike diseño)

**Situación actual (código):**

- Binding por **empresa** + teléfono cliente (`assistant_channel_bindings`).
- `default_branch_id` y `session_branch_id` en binding — el cliente elige sucursal en conversación.
- Stock y pedidos usan `branchId` en tools del assistant.
- Comprobantes: notificación a **vendedor WSP** asociado a sucursal (revisar `users.whatsapp_phone` + lógica en core).

### Preguntas a cerrar con negocio

1. ¿**Un número WSP por empresa** o **un número por sucursal** (Costa Azul Maipú vs Centro)?
2. Si es por sucursal: ¿Meta Business con varios números o un solo inbox con routing por palabra clave?
3. ¿El **admin validación** es por empresa o por sucursal?
4. ¿Catálogo/stock siempre de la sucursal activa en sesión o puede mezclar?

### Opciones de diseño

| Opción | Pros | Contras |
|--------|------|---------|
| A. Un WSP empresa + `session_branch` (actual) | Simple Meta, un webhook | Confusión si muchas sucursales |
| B. Binding por `(empresa, branch_id, phone)` | Claro operativamente | N números Meta, más config plataforma |
| C. Un número + menú “elige sucursal” al inicio | Un solo número | Fricción cliente |

**Entregable spike:** 1 página en `docs/assistant/WSP-POR-SUCURSAL.md` con decisión + cambios de schema si aplica.

---

## Orden sugerido mañana

1. **30 min** — `docker compose ps` + smoke + confirmar landing/dashboard.
2. **Sprint A** — UI base (tokens + Navbar/Sidebar + 1 pantalla plataforma).
3. **Sprint B** — Doc alcance pasarela (sin implementar SDK completo salvo que sobre tiempo).
4. **Sprint C** — Reunión/spike WSP sucursal → doc decisión.

---

## Comandos rápidos

```powershell
cd d:\Proyectos\POS-AI
docker compose up -d --build
.\scripts\qa-smoke.ps1
```

| Acción | URL / comando |
|--------|----------------|
| Landing | http://localhost:8010/ |
| Dashboard tenant | http://localhost:8010/dashboard |
| Empresa (pestañas) | http://localhost:8010/empresas |
| Plataforma WSP sim | http://localhost:8010/platform/whatsapp |
| Plan sprints | `SPRINT-PLAN.md` |
| **Seguridad (pendiente)** | `docs/SEGURIDAD-BACKLOG.md` — keys, cifrado datos, `.env` solo en server, rate-limit |

---

## Backlog seguridad (pendiente — no implementar sin sprint)

Fortalecer: rotación de secrets, datos sensibles cifrados (comprobantes + transferencia), **`.env` no en git** (solo en servidor como hoy), **rate-limit en servidor** (login/webhooks/APIs públicas). Detalle: **`docs/SEGURIDAD-BACKLOG.md`**.
