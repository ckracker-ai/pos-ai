# Sprint S0 — Cierre técnico base (jun 2026)

**Roadmap:** [`SPRINT-MASTER-ROADMAP-2026-H2.md`](./SPRINT-MASTER-ROADMAP-2026-H2.md)  
**Duración:** 2 semanas · **80–100 h**  
**Estado:** ✅ **CERRADO** (2026-06-02) — D4 CUT completo explícitamente en **S2**

---

## Objetivo

Cerrar deuda técnica crítica antes de S1 (catálogo jerárquico): WSP estable, delivery en POS validado, cifrado de transferencia verificado y smoke tests repetibles.

---

## Checklist

### A — WSP y comprobantes

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| A1 | E2E WSP + comprobantes | ✅ | Ver [`SPRINT-WSP-AFINADO-2026-06.md`](./SPRINT-WSP-AFINADO-2026-06.md) ítem 1 |
| A2 | OpenAI `openAi: true` en assistant | ✅ | Ítem 2 cerrado |
| A3 | Limpieza datos demo (duplicados) | ✅ | `cleanupPaymentProofsForBranch` + `.\scripts\cleanup-payment-proofs-demo.ps1` |
| A4 | Estilos tablas tenant restantes | ✅ | `app-*` en reportes, products, POS, comandas, users, mermas, comprobantes; utilidades en `global.css` |
| A5 | Notificación admin sin re-spam | ✅ | Un WSP al admin por pedido; reenvío actualiza sin repetir aviso |

### B — Delivery en ventas (reciente)

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| B1 | Migración `002-sales-delivery.sql` aplicada | ✅ | Campos en `sales` |
| B2 | Core + BFF + POS formulario condicional | ✅ | Implementado jun 2026 |
| B3 | QA API venta con `requiresDelivery` | ✅ | `.\scripts\qa-smoke.ps1 -IncludeS0` (2026-06-02) |
| B4 | Venta delivery visible en historial/reportes | ✅ | Columna Delivery en tab Ventas + export Excel |

### C — Seguridad mínima

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| C1 | `FIELD_ENCRYPTION_KEY` en docker/env | ✅ | `.env.docker.example` |
| C2 | Recifrado histórico `transfer_*` | ✅ | `.\scripts\reencrypt-transfer-fields.ps1` |
| C3 | Columnas `varchar(512)` cifrado | ✅ | Migración `003-transfer-fields-encrypted-size.sql` |
| C4 | Advertencia JWT/secretos por defecto | ✅ | `warnInsecureSecrets()` en arranque core |
| C5 | `timingSafeEqual` en `internalKeyGuard` | ✅ | Core |

### D — Territorio + sucursales (cierre S0, no S2 completo)

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| D1 | BFF sin `X-Branch-ID` en `/branch` y `/territory` | ✅ | `branchContext.ts` |
| D2 | Regiones/comunas con datos (no `{}`) | ✅ | `TerritoryDelegate` + `branchPresenter` |
| D3 | CRUD sucursal en UI | ✅ | Validado en navegador jun 2026 |
| D4 | CUT completo ~346 comunas | ✅ S2 | Ver `SPRINT-TERRITORIO-CUT-SUCURSALES-2026-06.md` |

### E — Smoke automatizado

| # | Ítem | Estado | Notas |
|---|------|--------|-------|
| E1 | `qa-smoke.ps1` base v1.4 | ✅ | Login, empresas, categorías |
| E2 | Bloque S0 en smoke | ✅ | territorio, branch, delivery, assistant |
| E3 | Documentar comando en manual/handoff | ✅ | Este doc + `SPRINT-PLAN.md` |

---

## Comandos

```powershell
cd d:\Proyectos\POS-AI
docker compose up -d

# Migraciones v1.8 si BD nueva
.\scripts\migrate-v1.8-territory.ps1

# Smoke base + S0
.\scripts\qa-smoke.ps1 -IncludeS0

# Recifrado (solo si hay texto plano legacy)
.\scripts\reencrypt-transfer-fields.ps1

# A3 — limpieza comprobantes demo
.\scripts\cleanup-payment-proofs-demo.ps1
```

---

## Criterio de cierre S0

- [x] A3 limpieza demo (duplicados + archivado de pedidos cerrados)
- [x] B3 smoke delivery OK
- [x] E2 smoke S0 en verde con stack levantado (**15 OK, 0 FAIL** — verificado al cierre)
- [x] C4 y C5 aplicados
- [x] A5 notificación admin WSP sin re-spam
- [x] Sin regresión en sucursales (editar/guardar) y regiones visibles (validado jun 2026)
- [x] WSP carrito multi-búsqueda (café + empanada antes de `confirmar`) — TDD `test/wsp-multi-item-cart.test.ts`

**S1–S3 cerrados** · **Siguiente:** WSP P2 o **S4** delivery tracking

---

## Bitácora

| Fecha | Avance |
|-------|--------|
| 2026-06-02 | UI sucursales/territorio, presenters core, rebuild frontend; WSP E2E cerrado |
| 2026-06-02 | Doc S0 + extensión `qa-smoke.ps1 -IncludeS0` |
| 2026-06-02 | A4 UI corporativa: reportes, products, POS y utilidades `app-eyebrow` / `app-table` |
| 2026-06-03 | A5 admin WSP: un destinatario + sin re-spam al reenviar comprobante; B4 delivery en reportes |
| 2026-06-02 | **S0 cerrado:** `qa-smoke.ps1 -IncludeS0` 15/15 OK; carrito WSP multi-búsqueda; D4 delegado a S2 |
