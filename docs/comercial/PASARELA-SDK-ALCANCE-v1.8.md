# Pasarela de pago — alcance SDK v1.8

**Estado:** diseño · **Fecha:** 2026-06-01

---

## Dos flujos (no mezclar)

| ID | Pagador | Beneficiario | UI hoy | Webhook |
|----|---------|--------------|--------|---------|
| `SAAS_SUB` | Tenant (PYME) | POS-AI (suscripción) | `/checkout` sandbox | `POST /public/webhooks/subscription-payment` |
| `SALE_WSP` | Cliente final | Comercio (pedido WSP) | Link en mensaje (Full) | `POST /assistant/webhooks/payment` |

Doc existente: `SAAS-CHECKOUT-SANDBOX.md`, `PAYMENT-WEBHOOK.md`.

---

## Matriz proveedor (Chile)

| Proveedor | Suscripción recurrente | Pago único venta | Redirect | Webhook HMAC | Notas |
|-----------|------------------------|------------------|----------|--------------|-------|
| **Transbank Webpay** | Webpay Oneclick / patrón manual | Webpay Plus | Sí | Sí | Estándar retail CL |
| **Flow** | Planes Flow | Link pago | Sí | Sí | Popular PYME |
| **Mercado Pago** | Preapproval API | Checkout Pro | Sí | Sí | Si ya usan MP |

**Recomendación v1.8:** un proveedor en **sandbox** para `SAAS_SUB` (ej. Flow o Webpay mall) y el mismo adapter para `SALE_WSP` con `metadata.kind`.

---

## Contrato webhook unificado (propuesta)

```json
{
  "provider": "WEBPAY",
  "externalId": "tbk-abc-123",
  "status": "APPROVED",
  "amount": 44990,
  "currency": "CLP",
  "paidAt": "2026-06-01T12:00:00Z",
  "metadata": {
    "kind": "SAAS_SUB",
    "empresaId": "uuid",
    "suscripcionId": "uuid",
    "pedidoId": null
  },
  "signature": "hmac-sha256-hex"
}
```

| Campo | Obligatorio | Uso |
|-------|-------------|-----|
| `kind` | Sí | `SAAS_SUB` \| `SALE_WSP` |
| `status` | Sí | `APPROVED` \| `REJECTED` \| `PENDING` |
| `externalId` | Sí | Idempotencia |
| `amount` | Sí | Validación monto |

**Handlers:**

- `SAAS_SUB` → `SuscripcionDelegate.confirmSubscriptionPayment`
- `SALE_WSP` → `AssistantDelegate.confirmOnlinePayment`

---

## Estructura código propuesta

```
pos-api-core/src/modules/payments/
  types.ts              # PaymentProvider, CheckoutSession, WebhookEvent
  PaymentService.ts     # orquestador por kind
  providers/
    webpay.adapter.ts   # sandbox primero
    flow.adapter.ts     # opcional
```

**BFF:** `POST /public/checkout/create` devuelve `{ redirectUrl }` en lugar de solo sandbox.

**Frontend:** `CheckoutForm` redirige a pasarela; página `/checkout/return?status=ok`.

---

## Checklist implementación v1.8b

- [x] Proveedor dev `SANDBOX` (`PAYMENT_PROVIDER=SANDBOX`)
- [x] Variables env: `PAYMENT_*`, `PAYMENT_GATEWAY_WEBHOOK_SECRET`, `PAYMENT_WEBHOOK_HMAC_SECRET`
- [x] Adapter `createCheckout` (sesión) + webhook unificado BFF
- [x] Idempotencia por `externalId` en BD (`payment_events`, v1.10 — S5 MVP)
- [x] Adapter Webpay sandbox (`WEBPAY_MODE=simulate|integration`) — ver `WEBPAY-SANDBOX.md`
- [x] Postman colección webhooks — `pos-api-bff/pos-api-bff-payments.postman_collection.json`
- [x] E2E: registro → checkout → confirm — `scripts/test-s5-checkout-e2e.ps1`
- [x] E2E Full: webhook venta — `scripts/test-s5-sale-wsp-webhook.ps1` (requiere pedido PENDING previo)

---

## Fuera de alcance v1.8

- Facturación electrónica SII automática
- Prorrateo upgrade plan mid-cycle
- Múltiples proveedores activos por tenant
