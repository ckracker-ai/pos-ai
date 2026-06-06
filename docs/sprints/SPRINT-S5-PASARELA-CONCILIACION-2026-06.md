# Sprint S5 — Pasarela + conciliación

**Estado:** ✅ **CERRADO** · **Inicio:** 2026-06-02 · **Cierre:** 2026-06-02  
**Roadmap:** [`SPRINT-MASTER-ROADMAP-2026-H2.md`](SPRINT-MASTER-ROADMAP-2026-H2.md)  
**Diseño:** [`../comercial/PASARELA-SDK-ALCANCE-v1.8.md`](../comercial/PASARELA-SDK-ALCANCE-v1.8.md) · Webpay: [`../comercial/WEBPAY-SANDBOX.md`](../comercial/WEBPAY-SANDBOX.md) · Reintentos: [`../comercial/PAYMENT-RETRIES-POLICY.md`](../comercial/PAYMENT-RETRIES-POLICY.md)

---

## Objetivo (cumplido)

Bitácora idempotente (`payment_events`), parser unificado, rutas `SAAS_SUB` y `SALE_WSP`, checkout registro + Webpay sandbox/integration.

---

## Entregables

| Bloque | Ítems |
|--------|--------|
| Ledger | Migración v1.10, inbound, subscription + assistant vía ledger, `checkout/confirm` vía ledger |
| Sandbox | Adapter SANDBOX, sesión, `/checkout/return`, payment-gateway |
| Webpay | simulate + integration TBK, webpay-commit, UI simulate/return |
| QA | TDD 7 tests, smoke `-IncludeS5`, E2E `test-s5-checkout-e2e.ps1`, `test-s5-sale-wsp-webhook.ps1` |
| Docs/ops | Postman `pos-api-bff-payments.postman_collection.json`, política reintentos |

---

## Fuera de alcance S5 (backlog)

- Adapters **Flow / Mercado Pago**
- Cola automática de reintentos pasarela
- Certificación Webpay **producción**
- Cobro **recurrente** SaaS (v2.0)

---

## Comandos de cierre

```powershell
.\scripts\migrate-v1.10-payments.ps1
docker compose up -d --build pos-api-core pos-api-bff pos-api-assistant pos-frontend
cd pos-api-core; npm run test:payments
.\scripts\qa-smoke.ps1 -IncludeS5
.\scripts\test-s5-checkout-e2e.ps1
```

**SALE_WSP (plan Full, pedido PENDING previo):**

```powershell
.\scripts\test-s5-sale-wsp-webhook.ps1 -EmpresaId <uuid> -SaleId <uuid>
```

---

## Contrato ledger (resumen)

Segundo POST mismo `provider` + `externalId` → `duplicate: true` sin re-ejecutar handlers. Ver [`PAYMENT-RETRIES-POLICY.md`](../comercial/PAYMENT-RETRIES-POLICY.md).

---

## Siguiente recomendado

**WSP P2** (estilos/mensajes) o **S4** delivery tracking.
