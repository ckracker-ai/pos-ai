# WhatsApp por sucursal — spike diseño

**Estado:** propuesta recomendada · **Fecha:** 2026-06-01

---

## Situación actual (código)

| Pieza | Comportamiento |
|-------|----------------|
| `assistant_channel_bindings` | Un registro por **teléfono cliente** + **empresa** |
| `default_branch_id` | Sucursal por defecto al iniciar conversación |
| `session_branch_id` | Sucursal elegida en la sesión (tools `obtener_sucursales`) |
| Stock / pedidos | Siempre contra `branchId` de sesión |
| Comprobantes | Validación contra perfil **empresa**; notifica vendedor con `users.whatsapp_phone` por sucursal |
| Meta webhook | Un `WHATSAPP_PHONE_NUMBER_ID` global (env) |

---

## Preguntas de negocio

1. ¿Un número WSP por **empresa** o uno por **sucursal**?
2. ¿El cliente debe elegir sucursal siempre o solo si hay más de una?
3. ¿Admin de validación es único por empresa o por sucursal?
4. ¿Catálogo puede mostrar otras sucursales (transferencia entre locales)?

---

## Opciones

### A — Un número por empresa + sesión por sucursal (actual)

- **Pros:** Un webhook Meta, configuración simple, Costa Azul piloto OK.
- **Contras:** Cliente puede pedir a sucursal equivocada si no elige bien.

**Recomendación:** mantener para **v1.8** y mejorar UX del menú inicial (“Elige sucursal: 1 Maipú, 2 Centro”).

### B — Un número por sucursal

- **Pros:** Operación clara (“este WSP es solo Maipú”).
- **Contras:** N cuentas Meta, N `PHONE_NUMBER_ID`, routing en plataforma, costo por número.

**Cambios schema:** `assistant_channel_bindings.phone_number_id`, tabla `branch_whatsapp_channels`.

### C — Un número + IVR menú obligatorio

- Menú al primer mensaje si `empresa.sucursales > 1`.
- Sin cambio Meta; solo prompt + `session_branch_id`.

---

## Decisión recomendada (MVP → v1.9)

| Fase | Decisión |
|------|----------|
| **v1.8** | **Opción A + C:** reforzar menú sucursal en system prompt y simulador plataforma |
| **v1.9** | Evaluar opción B si cliente pide líneas separadas por local |

---

## Tareas técnicas si se avanza a B

1. Migración: `branches.whatsapp_phone_number_id`, `meta_display_phone`
2. Webhook assistant: resolver empresa por `phone_number_id` entrante
3. Plataforma: configurar canal por sucursal en `/platform/empresas`
4. Seed Costa Azul: segundo binding demo opcional

---

## Simulador plataforma

Hoy el simulador pide teléfono cliente; no elige sucursal explícitamente — el assistant usa binding + tools.

**Mejora rápida:** dropdown “Sucursal sesión” que llame `PATCH /assistant/bindings/:id/session-branch` antes de enviar mensajes.
