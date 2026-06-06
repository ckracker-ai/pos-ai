# Política de reintentos — webhooks de pago (S5)

**Aplica a:** `payment_events` + `POST /payments/webhooks/inbound`

## Reglas

| Caso | ¿Se persiste `payment_events`? | ¿Reintento permitido? |
|------|-------------------------------|------------------------|
| Primer `APPROVED` exitoso | Sí (`result_code=SUCCESS`) | No — segundo POST → `duplicate: true` |
| `REJECTED` / `PENDING` | Sí (`IGNORED_STATUS`) | No — idempotencia por `provider`+`externalId` |
| Error de negocio (`SUBSCRIPTION_ALREADY_ACTIVE`, stock, etc.) | **No** | **Sí** — mismo `externalId` puede reintentarse |
| Error técnico (timeout, 5xx) antes de persistir | No | Sí |

## Operación

- La pasarela debe usar un `externalId` estable por transacción (ej. `buy_order` Webpay, `reference` sandbox).
- Soporte: consultar fila en `payment_events` por `(provider, external_id)` para conciliación.
- Duplicado intencional: responder `200` con `duplicate: true` y payload previo en `data` (sin re-ejecutar handlers).

## Fuera de alcance S5

- Cola de reintentos automática (SQS/cron) — backlog si la pasarela no reenvía webhooks.
