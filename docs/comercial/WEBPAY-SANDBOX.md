# Webpay Plus — sandbox POS-AI (S5)

## Desarrollo — copia y pega (empezar ya)

Pon esto en tu `.env` (o copia desde `.env.docker.example`) y reinicia core + BFF:

```env
WEBPAY_MODE=integration
WEBPAY_COMMERCE_CODE=597010000500
WEBPAY_API_SECRET=5729914e0d440847db17ef8755dcb4b14187bbc23e206514b7e256b755c0459a
WEBPAY_API_BASE_URL=https://webpay3gint.transbank.cl
PAYMENT_SANDBOX_RETURN_BASE_URL=http://localhost:8010
FRONTEND_PUBLIC_URL=http://localhost:8010
```

```powershell
docker compose up -d --build pos-api-core pos-api-bff pos-frontend
```

Checkout: `http://localhost:8010/checkout?empresaId=<uuid>` → **Pagar con Webpay (sandbox)** → formulario Transbank de integración.

Tarjetas de prueba: [Transbank Developers — tarjetas de prueba](https://transbankdevelopers.cl/documentacion/como_empezar#tarjetas-de-prueba).

> Credenciales de **integración** (sin dinero real). Producción: código y llave propios tras certificación Transbank.

**Sin Transbank:** `WEBPAY_MODE=simulate` (simulador morado en POS-AI, sin variables anteriores).

---

## Modos

| `WEBPAY_MODE` | Credenciales | Flujo |
|---------------|--------------|--------|
| `simulate` (default) | No requiere | UI `/checkout/webpay-simulate` → confirma ledger |
| `integration` | `WEBPAY_COMMERCE_CODE` + `WEBPAY_API_SECRET` | Redirect API Transbank → `/checkout/webpay-return?token_ws=…` |

## Variables (core)

| Variable | Ejemplo integración |
|----------|---------------------|
| `WEBPAY_MODE` | `integration` |
| `WEBPAY_COMMERCE_CODE` | Dev POS-AI: `597010000500` (alternativa doc TBK Webpay Plus: `597055555532`) |
| `WEBPAY_API_SECRET` | Llave integración (ver bloque copiar/pegar arriba) |
| `WEBPAY_API_BASE_URL` | `https://webpay3gint.transbank.cl` |
| `PAYMENT_SANDBOX_RETURN_BASE_URL` | `http://localhost:8010` |

## API

| Método | Ruta BFF |
|--------|----------|
| POST | `/pos/proxy/public/checkout/create-session` `{ empresaId, provider: "WEBPAY" }` |
| POST | `/pos/proxy/public/checkout/sandbox-complete` | Simulador (token interno) |
| POST | `/pos/proxy/public/checkout/webpay-commit` | `{ token_ws }` tras retorno TBK |

## Postman y E2E (cierre S5)

- Colección: `pos-api-bff/pos-api-bff-payments.postman_collection.json`
- E2E suscripción: `.\scripts\test-s5-checkout-e2e.ps1`
- E2E venta Full: `.\scripts\test-s5-sale-wsp-webhook.ps1 -EmpresaId … -SaleId …`

---

## Prueba simulador (sin Transbank)

```powershell
# Tras registro → checkout UI → "Pagar con Webpay (sandbox)"
# O crear sesión manual:
$empresaId = "UUID-EMPRESA-PENDIENTE-PAGO"
Invoke-RestMethod -Uri "http://localhost:2020/pos/proxy/public/checkout/create-session" -Method Post `
  -ContentType "application/json" `
  -Body (@{ empresaId = $empresaId; provider = "WEBPAY" } | ConvertTo-Json)
# Abrir redirectUrl en el navegador
```

## Integración real

1. Obtener credenciales en [Transbank Developers](https://www.transbankdevelopers.cl/).
2. Exportar env en `docker-compose` / `.env` y `WEBPAY_MODE=integration`.
3. `create-session` devuelve `redirectUrl` de Transbank (no simulador).
4. Tras pago, Transbank redirige a `/checkout/webpay-return` con `token_ws`.

Idempotencia: `externalId` = `buy_order` (`WP…`) en tabla `payment_events`.
