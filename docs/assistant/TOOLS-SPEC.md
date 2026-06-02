# POS-AI Assistant — especificación de tools (borrador)

**Estado:** diseño · servicio `pos-api-assistant` aún no existe.

Cada tool del LLM debe llamar al **tenant** correcto (`empresa_id`) y respetar `sucursal_id`.

---

## `obtener_sucursales_disponibles`

- **Core (futuro):** `GET /branch` o listado público por tenant token de sesión WSP/voz.
- **Respuesta:** `{ id, name, address, isActive }[]`

---

## `consultar_stock_sucursal`

- **Parámetros:** `producto_id`, `sucursal_id`
- **Core (futuro):** inventario por producto + branch (existente en módulo inventory/catalog).
- **Respuesta:** `{ producto_id, sucursal_id, cantidad, precio, moneda: "CLP" }`
- **Regla:** cantidad = 0 → no confirmar venta sin reserva/traspaso.

---

## `buscar_en_otras_sucursales`

- **Parámetros:** `producto_id`
- **Core (futuro):** agregación stock > 0 en todas las branches del tenant, excluyendo opcionalmente la sucursal actual.
- **Respuesta:** `{ sucursal_id, nombre, cantidad }[]`

---

## `crear_pedido_multisucursal`

- **Parámetros:** `cliente_telefono`, `sucursal_id`, `items[]`, `metodo_pago`
- **Core (futuro):** reutilizar flujo `sales` + validación stock en `sucursal_id` en transacción.
- **Respuesta:** `{ pedido_id, total, estado }`

---

## `enviar_detalles_pago_wsp`

- **Parámetros:** `cliente_telefono`, `pedido_id`
- **Integración:** proveedor WSP (Meta Cloud API, etc.) + plantilla con link Webpay/MP o datos transferencia.
- **Plan Full:** cobro online; **Estándar:** transferencia / link según `metodo_pago` del tenant.

---

## Contexto de sesión (por canal)

| Campo | Origen |
|-------|--------|
| `empresa_id` | Número WSP / trunk telefónico → mapping en BD |
| `sucursal_id` | Pregunta al usuario o última preferencia |
| `canal` | `VOZ` \| `WHATSAPP` |

---

## Versión objetivo

- **v1.7:** tools contra core + WSP (Estándar).
- **v1.8+:** canal voz + `enviar_detalles_pago_wsp` (Full).
