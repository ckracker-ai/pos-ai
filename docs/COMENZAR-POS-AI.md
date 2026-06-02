# POS-AI — Guía para comenzar (SaaS multi-tenant)

**Versión producto:** v1.7 (assistant WhatsApp + comprobantes) · **Fecha:** 2026-05-31  
**Uso:** documento base para onboarding interno, demo comercial y exportar a PDF.

> **Exportar PDF:** abrir `docs/comercial/COMENZAR-POS-AI.html` en Chrome/Edge → Imprimir → Guardar como PDF.

---

## 1. Qué es POS-AI

POS-AI es un **ERP SaaS en la nube** para PYMEs en Chile (retail, gastronomía, 1–3 locales). Un solo sistema reemplaza POS suelto + Excel + WhatsApp manual: **ventas, inventario por sucursal, usuarios, reportes** y, en planes superiores, **asistente de ventas por WhatsApp** (y en Full, voz + cobro web).

Cada **empresa (tenant)** tiene su propia base lógica: productos, stock, sucursales, usuarios y plan contratado.

---

## 2. Arquitectura (servicios)

| Servicio | Puerto dev | Rol |
|----------|------------|-----|
| **pos-frontend** | 8010 | UI tenant (caja, reportes, comprobantes) + plataforma super-admin |
| **pos-api-bff** | 2020 | API pública `/pos/proxy/*`, auth JWT, proxy al core |
| **pos-api-core** | 1010 | Lógica de negocio, multi-tenant, MySQL |
| **pos-api-assistant** | 3030 | Webhook WhatsApp, agente ventas, visión comprobantes |
| **MySQL** | 3308 | BD `pos-ai-db` |

**Arranque rápido:**

```powershell
cd d:\Proyectos\POS-AI
.\scripts\migrate-v1.7-assistant.ps1
docker compose up -d --build
```

---

## 3. Tres planes SaaS

| Plan | Para quién | Incluye |
|------|------------|---------|
| **Básico** | Local que opera en tienda | 10 módulos ERP (POS, catálogo, comandas, reportes, usuarios, sucursales, mermas, empresa, ayuda). Sin IA ni pagos online en ventas. |
| **Estándar** | Quien vende/atiente por WhatsApp | Todo Básico + **asistente IA WhatsApp**: consultas, pedidos, stock por sucursal, **transferencia + comprobante**. |
| **Full** | Omnicanal + cobro digital | Todo Estándar + **link de pago web** en pedidos WSP + **asistente voz/teléfono** (roadmap integración). |

Flags en BD (`saas_planes.features`): `assistantWhatsapp`, `assistantVoz`, `pagosOnline`.

Detalle comercial: `docs/comercial/PLAN-SAAS-POS-AI.md` · Técnico BD: `docs/comercial/PLANES-BD.md`.

---

## 4. Módulos del tenant (10 bloques)

| # | Módulo | Ruta | Qué hace |
|---|--------|------|----------|
| 1 | Dashboard | `/dashboard` | Resumen y accesos por rol |
| 2 | Punto de venta | `/pos` | Ventas en caja, carrito, IVA |
| 3 | Catálogo | `/products`, proveedores, categorías | Productos e inventario por sucursal |
| 4 | Comandas | `/comandas` | Pedidos cocina en vivo |
| 5 | Reportes | `/reportes` | Ventas, inventario, mermas |
| 6 | Usuarios | `/users` | Roles: admin, auditor, vendedor, comanda |
| 7 | Sucursales | `/branches` | Multi-local |
| 8 | Mermas | `/mermas` | Pérdidas con aprobación |
| 9 | Empresa | `/empresas` | Datos comerciales del tenant |
| 10 | Ayuda | `/manual` | Manual por rol |

**v1.7 — extra plan Estándar/Full:**

| Módulo | Ruta | Qué hace |
|--------|------|----------|
| Comprobantes WSP | `/comprobantes` | Vendedor **confirma o rechaza** pagos por transferencia enviados por clientes WhatsApp |

**Plataforma (super-admin):** `/platform/login` → empresas, planes, canal WhatsApp, simulador WSP.

---

## 5. Asistente POS-AI por WhatsApp (plan Estándar / Full)

### 5.1 Flujo cliente

1. Cliente escribe al número WSP registrado (binding por teléfono).
2. Elige **sucursal** → **busca producto** → arma **pedido**.
3. Recibe instrucciones de pago:
   - **Estándar:** datos bancarios del comercio (banco, cuenta, titular, RUT) + pide **foto comprobante**.
   - **Full:** **link de pago web** (`pagosOnline`); no transferencia por defecto.
4. Envía imagen o escribe *vale* / *ya pagué*.
5. Recibe respuesta automática; el **vendedor valida en POS**.

### 5.2 Validaciones automáticas (IA + reglas)

Por empresa se configura **perfil de transferencia** (Plataforma → Empresas → Canal WhatsApp):

- Banco, tipo cuenta, N° cuenta, titular, RUT.

Al recibir comprobante, el asistente:

- Extrae monto, destinatario, banco (OpenAI visión, opcional).
- Compara con **total del pedido** y **datos bancarios del comercio**.
- Clasifica variantes: OK, monto distinto, parcial, destinatario incorrecto, imagen borrosa, no es comprobante, etc.

Doc variantes: `docs/assistant/COMPROBANTES-VARIANTES.md`.

### 5.3 Confirmación del vendedor (POS tenant)

Ruta **`/comprobantes`** (admin, auditor, vendedor):

| Acción | Efecto |
|--------|--------|
| **Confirmar pago** | Comprobante → `ADMIN_CONFIRMED`, pedido → `COMPLETED`, cliente notificado por WSP |
| **Rechazar** | Comprobante → `REJECTED`, pedido → `CANCELLED`, **stock liberado**, cliente notificado |

Notificaciones WSP al vendedor/admin al llegar comprobante: teléfono en `users.whatsapp_phone` (sucursal) o `empresas.assistant_admin_phone`.

### 5.4 Configuración

- **Plataforma:** teléfono cliente demo, WSP admin, **datos transferencia**, plan Estándar/Full.
- **Meta producción:** `docs/assistant/META-WHATSAPP.md`.
- **Simulador sin Meta:** `http://localhost:8010/platform/whatsapp`.

Demo Costa Azul: teléfono `56900000001`, admin `56900000002`.

---

## 6. Asistente telefónico / voz (plan Full — roadmap)

Incluido comercialmente en **Full** (`assistantVoz: true`). Misma lógica de negocio que WSP (stock, pedidos, sucursales), canal **voz/IVR** por integrar.

Spec agente: `docs/assistant/SYSTEM-PROMPT.md` · API core: `/assistant/resolve?channel=VOZ`.

**Estado v1.7:** gate de plan y binding preparados; integración telefónica pendiente v1.8+.

---

## 7. Medios de pago web (plan Full u opt-in)

Si la empresa tiene **`pagosOnline: true`**:

- Al confirmar pedido WSP se envía **link de pago** (`PAYMENT_LINK_BASE_URL`, ej. Webpay/Mercado Pago/Flow en v1.8).
- No se pide comprobante de transferencia por defecto.
- Webhook de pasarela confirmará pedido automáticamente (v1.8 — pendiente).

**Dos pagos distintos:**

| Concepto | Qué es |
|----------|--------|
| **Suscripción SaaS** | Lo que la PYME paga a POS-AI por usar el software (v2.0 checkout web) |
| **Cobro ventas al cliente final** | Link en pedido WSP (plan Full) — integración pasarela v1.8 |

Visión self-service: `docs/comercial/VISION-v2.0-SAAS.md`.

---

## 8. Credenciales y URLs dev

| Rol | URL | Usuario |
|-----|-----|---------|
| Plataforma | http://localhost:8010/platform/login | `platform@pos-ai.local` / `PlatformAdmin2026!` |
| Tenant Costa Azul | http://localhost:8010/login | `admin@empanadascostaazul.cl` / `@dmin123_` |
| **Vendedor** | http://localhost:8010/login | `vendedor@empanadascostaazul.cl` / `Vendedor@12345` |
| Comanda | http://localhost:8010/login | `comanda@empanadascostaazul.cl` / `Comanda@12345` |

BFF health: http://localhost:2020/pos/proxy/health

---

## 9. Estado sprints (handoff mañana)

### ✅ v1.4 — Cerrado

Multi-tenant, plataforma MVP, POS, mantenedores.

### ✅ v1.7 — Entregado (Estándar WSP)

- `pos-api-assistant` + webhook + simulador plataforma
- Core `/assistant/*`, bindings, pedidos PENDING, stock descontado
- Perfil transferencia por empresa + validación comprobante vs banco/RUT
- Comprobantes tenant `/comprobantes` confirmar/rechazar
- Migraciones `001`–`004` v1.7 (`migrate-v1.7-assistant.ps1`)

### 🔄 v1.6 — Parcial

Planes en BD, catálogo plataforma. Pendiente: suscripciones, cobro real, límites sucursal/usuario.

### 📋 Mañana — checklist operativo

1. `docker compose up -d --build` + migraciones v1.7 si BD limpia.
2. Probar flujo E2E: WSP simulador → pedido → comprobante → `/comprobantes` confirmar.
3. Verificar variables Meta/OpenAI si demo con cliente real.
4. v1.5 dashboard plataforma (backlog) o v1.8 pasarela sandbox.

Detalle tareas: `SPRINT-PLAN.md`.

---

## 10. Documentos relacionados

| Documento | Contenido |
|-----------|-----------|
| `SPRINT-PLAN.md` | Sprints y handoff |
| `docs/comercial/PLAN-SAAS-POS-AI.md` | Matriz comercial |
| `docs/assistant/README.md` | Assistant técnico |
| `docs/assistant/META-WHATSAPP.md` | Producción Meta |
| `docs/assistant/COMPROBANTES-VARIANTES.md` | Tipos de comprobante |
| `deploy/QA-SMOKE-CHECKLIST.md` | QA manual |

---

*POS-AI — ERP de verdad, precio de local chico.*
