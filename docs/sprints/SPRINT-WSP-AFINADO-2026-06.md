# Sprint — WhatsApp y comprobantes (jun 2026)

**Rama:** `sprint/wsp-comprobantes-2026-06`  
**Estado base:** WSP operativo en simulador; falta afinar calidad, UI y datos históricos.  
**Demo:** teléfono `56900000001` · empresa Costa Azul · sucursal Central · plataforma `platform@pos-ai.local`

---

## Hecho en esta rama (antes del sprint)

- Simulador WSP (`/platform/whatsapp`): teléfono editable, atajos, caption monto.
- Flujo bot: `sucursales` → `buscar` → `pedido` → **`confirmar`** → datos transferencia → `vale 5000` → foto.
- Comprobantes: un registro activo por pedido (upsert + consolidar duplicados + borrar imágenes extra).
- UI comprobantes: Confirmar / Rechazar / Descartar según estado del pedido.
- Plataforma super-admin: mismo shell que tenant (sidebar, tablas `app-table`, modales claros).
- Manual `/manual` por rol actualizado.
- BFF rutas assistant, vision sin “foto borrosa” si falla OpenAI (revisión manual + caption).
- Docker rebuild: frontend, core, bff, assistant.

---

## Backlog del sprint (orden sugerido)

| # | Ítem | Prioridad | Notas del usuario / contexto |
|---|------|-----------|------------------------------|
| **1** | **Checklist E2E WSP + comprobantes** | P0 | ✅ **Cerrado** — flujo validado manualmente (2026-06-02). |
| **2** | **OpenAI: créditos + `OPENAI_API_KEY` válida** | P0 | ✅ **Cerrado** — `/health` → `openAi: true`. |
| **3** | **Limpieza datos demo** | P1 | ✅ **Cerrado** — `cleanupPaymentProofsForBranch` + `cleanup-payment-proofs-demo.ps1` |
| 4 | Estilos tablas tenant (slate → marca) | P1 | ✅ **Cerrado** — tenant: `branches`, `users`, `mermas`, `suppliers`, `comprobantes`, `manual`, `pos` (UI). Ticket impresión mantiene `slate-900` a propósito. Script: `scripts/replace-slate-brand.ps1`. |
| 5 | Carrito WSP (varios ítems antes de `confirmar`) | P2 | ✅ TDD `test/wsp-multi-item-cart.test.ts` · `docs/assistant/WSP-CARRITO-MULTI-BUSQUEDA.md` · append en core + assistant |
| 6 | Mensajes bot y variantes IA | P2 | ✅ **Cerrado** — `pos-api-assistant/src/agent/wspMessages.ts` (ayuda, carrito, comprobantes, variantes visión). |
| 7 | Datos transferencia | P1 | ✅ **Cerrado** — `transferProfile.ts` (core) sin fallbacks demo; vista previa `WspTransferPreview` en tenant `/empresas` y plataforma; `confirmar` bloquea con `TRANSFER_PROFILE_INCOMPLETE` si faltan campos. |
| 8 | Notificaciones admin WSP | P2 | ✅ Un aviso admin por pedido; reenvío no repite (S0 A5) |
| 9 | Encoding planes SaaS en BD | P3 | ✅ **Cerrado** — migración `v1.12.0-001-saas-planes-encoding`; `planDisplay.ts` (core) + `getPlanDisplayName` en normalizer; Sequelize `utf8mb4`. |
| 10 | Registro público / checkout SaaS | P3 | Fuera de WSP pero mencionado en docs comerciales. |

---

## Ítem 1 — Checklist E2E ✅ (cerrado 2026-06-02)

### Pre-requisitos

- [x] Servicios HTTP: frontend `:8010`, BFF health, core health, assistant health.
- [x] Binding WSP `56900000001` en Plataforma → Empresas.
- [x] Usuario tenant admin con sucursal Central.
- [x] Assistant `openAi: true` en `/health` (ítem 2).

### Simulador (`/platform/whatsapp`)

- [x] `sucursales` → `1`
- [x] `buscar empanada` → listado numerado (sin UUID al cliente)
- [x] `pedido 1 2` → resumen **sin** datos de pago todavía
- [x] `confirmar` → banco, cuenta, RUT, “envía foto”
- [x] `vale 5000` → anota monto
- [x] 📷 imagen → un solo mensaje de recibido; no pide comprobante antes de `confirmar`

### Tenant (`/comprobantes`)

- [x] Una sola fila por pedido tras **Actualizar**
- [x] Botones **Confirmar pago** y **Rechazar** visibles si pedido `PENDING`
- [x] Confirmar → pedido `COMPLETED`, cliente notificado
- [x] Rechazar → pedido cancelado, stock liberado

### Criterio de cierre ítem 1

Flujo completo sin duplicados en pantalla ni errores 4xx/5xx en red. **Validado.**

---

## Comandos útiles

```powershell
docker compose build pos-frontend pos-api-core pos-api-bff pos-api-assistant
docker compose up -d --force-recreate pos-frontend pos-api-core pos-api-bff pos-api-assistant
```

URLs: UI http://localhost:8010 · BFF http://localhost:2020/pos/proxy/health · Core http://localhost:1010/health

---

## Ítem 2 — OpenAI ✅ (cerrado)

- [x] `OPENAI_API_KEY` en `.env` raíz.
- [x] `docker compose up -d --force-recreate pos-api-assistant`
- [x] `GET http://localhost:3030/health` → `"openAi": true`
- [ ] Prueba opcional: foto comprobante en simulador → IA lee monto/destinatario (no solo revisión manual).

---

## Ítem 3 — Limpieza datos demo ✅ (cerrado)

1. **Automático al cargar pendientes** + botón **Limpiar duplicados** en `/comprobantes`.
2. **API** `POST /payment-proofs/consolidate-duplicates` ahora:
   - elimina duplicados activos por `saleId` (conserva el más reciente);
   - archiva (`REJECTED`) comprobantes pendientes cuyo pedido ya no está `PENDING` o no existe en la sucursal.
3. **Script:** `.\scripts\cleanup-payment-proofs-demo.ps1` (valida que no queden `saleId` repetidos en pendientes).

Criterio de cierre cumplido: un pedido = un comprobante visible en pendientes; sin registros colgados de pedidos cerrados.

---

## Después del sprint WSP

| Sprint P0 | Doc |
|-----------|-----|
| Catálogo | [`SPRINT-CATALOGO-CATEGORIAS-2026-06.md`](./SPRINT-CATALOGO-CATEGORIAS-2026-06.md) |
| Territorio CUT + sucursales | [`SPRINT-TERRITORIO-CUT-SUCURSALES-2026-06.md`](./SPRINT-TERRITORIO-CUT-SUCURSALES-2026-06.md) |
| Roadmap maestro (2 semanas) | [`SPRINT-MASTER-ROADMAP-2026-H2.md`](./SPRINT-MASTER-ROADMAP-2026-H2.md) |

---

## Próximo paso tras ítem 3
