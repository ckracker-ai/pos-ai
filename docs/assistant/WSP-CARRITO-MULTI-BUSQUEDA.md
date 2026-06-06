# WSP — Carrito con varias búsquedas

Flujo real de compra por WhatsApp: el cliente arma el pedido con **varias búsquedas** antes de `confirmar`.

## Escenario (TDD)

| Paso | Mensaje usuario | Comportamiento esperado |
|------|-----------------|-------------------------|
| 1 | `sucursales` → `1` | Bot: «¿Qué deseas buscar?» (sin pedir UUID) |
| 2 | `buscar cafe` | Listado numerado + hint multi-producto |
| 3 | `pedido 1x1` | Crea carrito abierto (`awaiting_customer_confirm`) |
| 4 | `buscar empanada` | Nuevo listado + footer *Carrito abierto* |
| 5 | `pedido 1x2` o `agregar 1x2` | **Mismo** `pedido_id`, total acumulado |
| 6 | `mi pedido` | Detalle con café + empanadas |
| 7 | `confirmar` | Datos transferencia / comprobante |

## Implementación

- **Assistant:** `cartFlow.ts` (mensajes), `runAgent.ts` → `addCartLines()` usa `appendPendingOrderItems` si hay carrito abierto.
- **Core:** `POST /assistant/orders/pending/items` → `AssistantDelegate.appendItemsToPendingOrder()`.
- **Tests:** `pos-api-assistant/test/wsp-multi-item-cart.test.ts` — `npm run test:wsp-cart`.

## Comandos útiles

```powershell
cd pos-api-assistant
npm install
npm run test:wsp-cart
```

## Reglas de negocio

- Carrito **abierto** = pedido PENDING con `awaiting_customer_confirm = true` → se pueden agregar líneas.
- Carrito **bloqueado** = ya envió datos de pago / espera comprobante → no se agregan ítems; mensaje distinto.
- Misma sucursal en sesión; stock validado por ítem en cada agregado.
