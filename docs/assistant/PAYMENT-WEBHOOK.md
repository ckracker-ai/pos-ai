# Webhook pago en línea (plan Full)

Cuando la empresa tiene `pagosOnline: true`, el pedido WSP queda `PENDING` con notas `pago: WEBPAY`. La pasarela (Webpay, Mercado Pago, Flow, etc.) debe notificar a POS-AI al aprobar el cobro.

## Endpoint

`POST http://pos-api-assistant:3030/webhooks/payment`

Headers:

- `Content-Type: application/json`
- `x-payment-webhook-secret: <PAYMENT_WEBHOOK_SECRET>` (o campo `secret` en el body)

Body:

```json
{
  "empresa_id": "11111111-1111-4111-8111-111111111111",
  "sale_id": "<uuid del pedido>",
  "provider": "WEBPAY",
  "reference": "TBK-12345"
}
```

## Flujo

1. Core valida plan Full (`pagosOnline`) y que el pedido esté `PENDING` con método online en notas.
2. Marca la venta `COMPLETED`.
3. Notifica al cliente por WhatsApp (Meta configurado) o log en dev.

## Variables

| Variable | Servicio | Default dev |
|----------|----------|-------------|
| `PAYMENT_WEBHOOK_SECRET` | pos-api-assistant | `INTERNAL_API_KEY` |
| `PAYMENT_LINK_BASE_URL` | pos-api-core | `https://pay.pos-ai.local/p` |

## Prueba local (curl)

Tras crear un pedido Full con link de pago:

```powershell
curl -X POST http://localhost:3030/webhooks/payment `
  -H "Content-Type: application/json" `
  -H "x-payment-webhook-secret: supersecretkey" `
  -d '{\"empresa_id\":\"11111111-1111-4111-8111-111111111111\",\"sale_id\":\"<pedido-uuid>\",\"provider\":\"DEV\",\"reference\":\"test-1\"}'
```

## POS tenant

La confirmación manual de comprobantes (`/comprobantes`) aplica al plan **Estándar** (transferencia). El webhook no reemplaza esa pantalla.
