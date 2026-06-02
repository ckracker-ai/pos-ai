# Checkout suscripción SaaS — sandbox (v1.8)

Flujo para cobrar la **suscripción del tenant** (no confundir con el webhook de **ventas online** del plan Full: `docs/assistant/PAYMENT-WEBHOOK.md`).

## Flujo

1. **Registro** → `POST /pos/proxy/public/registro` → redirect a `/checkout?empresaId=…`
2. **Checkout** muestra neto + IVA 19% + total (valor del plan en `saas_planes`)
3. **Sandbox** — botón “Simular pago aprobado” → `POST /pos/proxy/public/checkout/confirm`
4. **Webhook** (pasarela real o pruebas) → `POST /pos/proxy/public/webhooks/subscription-payment`

Tras pago confirmado: `empresa_suscripciones.estado` = **ACTIVA**, vigencia +30 días, `external_subscription_id` = referencia.

El usuario puede **omitir** el pago y seguir en **PILOTO** (90 días desde registro).

## API pública (BFF)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/pos/proxy/public/checkout/:empresaId` | Resumen precio y estado |
| POST | `/pos/proxy/public/checkout/confirm` | Sandbox / confirmación directa |
| POST | `/pos/proxy/public/webhooks/subscription-payment` | Webhook pasarela |

### Webhook body

```json
{
  "empresa_id": "uuid-empresa",
  "provider": "WEBPAY",
  "reference": "TBK-12345",
  "status": "paid"
}
```

Header: `x-subscription-webhook-secret: <SUBSCRIPTION_WEBHOOK_SECRET>`  
(o campo `secret` en el body).

## Variables

| Variable | Servicio | Default dev |
|----------|----------|-------------|
| `SUBSCRIPTION_WEBHOOK_SECRET` | pos-api-bff | `INTERNAL_API_KEY` |

## Prueba PowerShell

Tras registro (reemplaza `EMPRESA_ID`):

```powershell
$secret = "supersecretkey"
$empresaId = "EMPRESA_ID"

# Resumen checkout
Invoke-RestMethod "http://localhost:2020/pos/proxy/public/checkout/$empresaId"

# Simular pago (UI equivalente)
Invoke-RestMethod -Uri "http://localhost:2020/pos/proxy/public/checkout/confirm" -Method Post `
  -ContentType "application/json" `
  -Body (@{ empresaId = $empresaId; provider = "SANDBOX"; reference = "test-1" } | ConvertTo-Json)

# Webhook pasarela
Invoke-RestMethod -Uri "http://localhost:2020/pos/proxy/public/webhooks/subscription-payment" -Method Post `
  -Headers @{ "x-subscription-webhook-secret" = $secret } `
  -ContentType "application/json" `
  -Body (@{
    empresa_id = $empresaId
    provider = "WEBPAY"
    reference = "TBK-999"
    status = "paid"
  } | ConvertTo-Json)
```

## UI

- **http://localhost:8010/checkout?empresaId=…**
- Tras pago → login con banner “Pago confirmado”

## Producción

Sustituir el botón sandbox por redirect a Webpay/Flow/Mercado Pago; la pasarela debe llamar al webhook con el mismo contrato.
