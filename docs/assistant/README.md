# POS-AI Assistant — Plan Estándar (v1.7)

Servicio **`pos-api-assistant`** (puerto **3030**): agente de ventas por **WhatsApp** con stock por sucursal.

Requiere plan **Estándar** o **Full** (`assistantWhatsapp: true` en `saas_planes`).

## Arranque

```powershell
.\scripts\migrate-v1.7-assistant.ps1
docker compose up -d --build pos-api-core pos-api-assistant pos-api-bff
```

## Pagos por plan

| Plan | Al confirmar pedido | Comprobante |
|------|---------------------|-------------|
| **Estándar** | Datos transferencia + pide foto comprobante | IA analiza imagen → avisa **vendedor WSP de la sucursal** y/o **admin** |
| **Full** (`pagosOnline`) | **Link de pago** (`PAYMENT_LINK_BASE_URL`) | Webhook confirma pedido: **[PAYMENT-WEBHOOK.md](./PAYMENT-WEBHOOK.md)** |

Variantes de comprobante (*vale*, capturas bancarias, montos parciales): **[COMPROBANTES-VARIANTES.md](./COMPROBANTES-VARIANTES.md)**.
Migración: `.\scripts\migrate-v1.7-assistant.ps1` (incluye `003-assistant-payment-proofs`).

Configurar en plataforma → Empresas → Canal WhatsApp: teléfono cliente + **WSP admin**.  
Vendedor en sucursal: columna `users.whatsapp_phone` (editable en **Usuarios** del tenant; prioridad sobre admin al notificar).

**Validación en POS tenant:** `/comprobantes` — confirmar o rechazar proof → pedido `COMPLETED` o `CANCELLED` (+ libera stock).

## Simulador visual (plataforma)

Tras login super-admin: **http://localhost:8010/platform/whatsapp**

Chat en el navegador (mismo motor que el webhook). Botón **📷 Imagen** para simular comprobante (base64 → visión). Enlace también desde **Plataforma → Empresas → Simular WSP**.

Instalación MySQL vacía: `db-init` ya incluye tablas v1.7 y demo Costa Azul **Estándar**; en BD existente: `.\scripts\migrate-all.ps1`.

## Probar sin Meta (API / PowerShell)

Teléfono demo: **56900000001** (Costa Azul, plan Estándar).

```powershell
Invoke-RestMethod -Uri "http://localhost:3030/webhooks/whatsapp" -Method POST -ContentType "application/json" -Body '{"from":"56900000001","text":"sucursales"}'

Invoke-RestMethod -Uri "http://localhost:3030/webhooks/whatsapp" -Method POST -ContentType "application/json" -Body '{"from":"56900000001","text":"buscar empanada"}'

# Tras elegir sucursal (ej. 1):
Invoke-RestMethod -Uri "http://localhost:3030/webhooks/whatsapp" -Method POST -ContentType "application/json" -Body '{"from":"56900000001","text":"1"}'

Invoke-RestMethod -Uri "http://localhost:3030/webhooks/whatsapp" -Method POST -ContentType "application/json" -Body '{"from":"56900000001","text":"buscar empanada"}'

# Pedido (usa producto_id del listado, primeros 8 chars o UUID completo):
Invoke-RestMethod -Uri "http://localhost:3030/webhooks/whatsapp" -Method POST -ContentType "application/json" -Body '{"from":"56900000001","text":"pedido d0a00000-0000-4000-8000-000000000001 2"}'
```

Registro de teléfonos: plataforma **Empresas** → sección *Canal WhatsApp*.

Respuesta JSON incluye `reply` (texto que iría al cliente por WSP).

## API Core (interna)

Prefijo `/assistant` + headers `x-internal-key`, `x-empresa-id`.

Ver `TOOLS-SPEC.md` y `SYSTEM-PROMPT.md`.

## Producción WhatsApp (Meta)

Checklist completo: **[META-WHATSAPP.md](./META-WHATSAPP.md)** (variables, webhook, sandbox, despliegue).

Resumen:

- Callback: `https://<dominio>/webhooks/whatsapp`
- `WHATSAPP_VERIFY_TOKEN` = mismo valor en Meta y en `.env`
- Por tenant: teléfono en **Plataforma → Empresas → Canal WhatsApp**
- Envío al cliente: `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` (ver `META-WHATSAPP.md`)

Variables opcionales: `OPENAI_API_KEY` (sin ella solo comandos locales).
