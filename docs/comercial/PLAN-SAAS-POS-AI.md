# Plan comercial SaaS — POS-AI

**Borrador acordado** (2026-05-31). Alineado con módulos en `pos-frontend/src/core/config/role-access.ts`.

---

## Posicionamiento: PYMEs Chile (precio accesible)

**Público:** empanaderías, cafeterías, retail chico, 1–3 locales, 2–15 personas operando. **No** competir con ERP enterprise (SAP, Odoo implementación pesada, consultoras).

**Principios de precio**

| Principio | Aplicación |
|-----------|------------|
| Mensualidad predecible | Sin sorpresas por “módulo extra” en Básico |
| Menos que armar piezas | Un solo SaaS vs POS + Excel + WSP manual + contador desordenado |
| Subir por canal, no por castigo | Estándar/Full = más alcance (IA, pagos), no quitar el POS |
| Onboarding simple | Piloto 1–3 meses con descuento; sin fee de implementación altísimo |
| Facturación clara | Precio en **CLP + IVA**; opción anual con ~2 meses gratis |

**Referencia mental para el cliente PYME:** “Menos que un sueldo part-time de cajero, más orden que cinco planillas.”

**Evitar en comunicación:** “licencia enterprise”, mínimos anuales altos, contratos obligatorios 24 meses, cobro por transacción agresivo en Básico.

---

## Rangos orientativos (CLP/mes + IVA) — PYME

> **Borrador comercial**, no precio final publicado. Ajustar según costo infra + WSP/IA + pasarela.

| Plan | Rango sugerido | Quién lo elige |
|------|----------------|----------------|
| **Básico** | **$19.990 – $29.990** | Un local, equipo chico, solo operación en tienda |
| **Estándar** | **$39.990 – $49.990** | Quien ya vende o atiende por WhatsApp y quiere IA ligada al POS |
| **Full** | **$59.990 – $79.990** | 2+ locales o quiere link de pago + voz sin contratar otro stack |

**Anual (opcional):** p. ej. paga 10 meses, usa 12 (~17% descuento).

**Piloto lanzamiento:** primeros clientes **−20% a −30%** por 3 meses a cambio de feedback y caso de éxito (no regalar para siempre).

**Add-ons** (no inflar el plan base): sucursal extra ~$8.990–$12.990/mes; usuario extra ~$2.990–$4.990; DTE/facturación electrónica aparte cuando exista el módulo.

**Límites PYME (acordado 2026-06):** Básico 1 sucursal + 3 usuarios (Admin, Vendedor, Comanda); Estándar y Full 3 sucursales + 6 usuarios (Admin, Auditor, Vendedor, Comanda por sucursal). Ampliar con add-on. Informales sin RUT: ver `PYME-INFORMAL-MODULO.md`.

---

## Visión de tres planes

| Plan | Público | Núcleo |
|------|---------|--------|
| **Básico** | PYME retail / gastronomía que opera el día a día | ERP operativo completo (10 módulos) |
| **Estándar** | Quien quiere atención y pedidos fuera del local | Básico + **Asistente IA WhatsApp** |
| **Full** | Operación omnicanal + cobro digital | Estándar + **IA voz/teléfono** + **pagos online** |

La escalera comercial es clara: **operar → automatizar canal → cobrar y atender por voz**.

---

## Plan Básico — 10 módulos (sí, concuerda)

El producto **ya incluye sistema de ventas**: es el módulo **Punto de venta (POS)**. No conviene venderlo como plan aparte; es el corazón del Básico.

Conteo comercial recomendado (**10 bloques** visibles para el cliente):

| # | Módulo | Qué cubre |
|---|--------|-----------|
| 1 | Dashboard | Resumen y accesos por rol |
| 2 | Punto de venta | Ventas, carrito, comprobante, IVA |
| 3 | Catálogo | Productos, proveedores, categorías |
| 4 | Comandas | Cocina / pedidos en vivo |
| 5 | Reportes | Ventas, mermas, exportación |
| 6 | Usuarios y roles | Admin, auditor, vendedor, comanda |
| 7 | Sucursales | Multi-local (límites por plan, ver abajo) |
| 8 | Mermas | Registro y aprobación |
| 9 | Empresa | Perfil comercial y facturación del tenant |
| 10 | Ayuda | Manual operativo por rol |

**Incluido en infra SaaS (no es “módulo” de precio):** multi-tenant, login por empresa, roles, auditoría básica.

**Fuera del Básico (plataforma / otros planes):** panel super-admin plataforma, asistente IA, pasarela de pago, facturación de suscripción (v1.6+).

### Límites sugeridos en Básico (monetización sin quitar módulos)

En lugar de ocultar pantallas, limitar por **uso**:

- Sucursales: p. ej. 1–2
- Usuarios activos: p. ej. hasta 5
- Sin asistente IA ni cobro online integrado

Así el cliente ve el producto completo y sube de plan por capacidad y canales, no por “módulos rotos”.

---

## Plan Estándar — Básico + Asistente IA WhatsApp

| Incluye | Detalle |
|---------|---------|
| Todo el Básico | Los 10 módulos sin restricción de funcionalidad core |
| `pos-api-assistant` (WSP) | Consultas, estado pedidos, menú, horarios (alcance MVP → ampliar) |
| Límites relajados | Más sucursales / usuarios que Básico |

**Mensaje comercial:** “Tu negocio responde en WhatsApp con IA conectada al mismo stock y ventas del POS.”

---

## Plan Full — Estándar + voz + pagos online

| Incluye | Detalle |
|---------|---------|
| Todo Estándar | WSP + ERP |
| Asistente **teléfono / voz** | IVR o agente de voz (integración posterior) |
| **Medios de pago online** | Webpay / Mercado Pago / Flow (Chile) u otro según mercado |
| Operación omnicanal | Pedido WSP/tel → cobro link → reflejo en ventas/reportes |

**Mensaje comercial:** “Vende y cobra desde cualquier canal; una sola verdad en inventario y caja.”

---

## Qué NO agregaría como “módulo 11” en Básico

| Idea | Por qué |
|------|---------|
| “Sistema de ventas” aparte | Ya es el POS (módulo 2) |
| Facturación electrónica SII | Mejor **add-on** o plan **Pro/Chile** (complejidad legal) |
| Delivery (Uber/Rappi) | Add-on por vertical gastronomía |
| CRM masivo | Fuera del foco POS; distrae del core |

## Add-ons opcionales (precio aparte, cualquier plan)

- Facturación electrónica (DTE Chile)
- Sucursales o usuarios extra
- Capacitación / onboarding
- SLA soporte prioritario
- API / integraciones a medida

---

## Enlace con base de datos

Cada empresa tiene `plan_id` → `saas_planes`. Detalle técnico: `PLANES-BD.md`.

---

## v2.0 — Dirección: automatizar y cobrar en web

- **Canal principal:** registro + checkout + pago pasarela → empresa y plan creados solos.
- **Canal alterno:** cliente contacta ventas → alta manual en plataforma (piloto, transferencia).
- Documento: `VISION-v2.0-SAAS.md`

## Roadmap técnico ↔ comercial

| Versión producto | Entrega comercial |
|------------------|-------------------|
| v1.4 (hecho) | Básico operativo + plataforma MVP (alta manual) |
| v1.5 | Dashboard plataforma + feature flags por plan |
| v1.6 | Planes en BD, suscripción, límites |
| v1.7 | Estándar: assistant WSP |
| v1.8 | Pasarela sandbox + webhooks |
| v1.9 | Registro público + checkout MVP |
| v2.0 | **SaaS self-service:** recurrencia, email, bloqueo impago; ventas directo = excepción |

---

## Nombres comerciales sugeridos (marketing)

- **POS-AI Básico** — “Tu local, en orden” (PYME, precio entrada)
- **POS-AI Estándar** — “WhatsApp conectado a tu caja”
- **POS-AI Full** — “Vende y cobra en todos lados”

**Frase PYME:** “ERP de verdad, precio de local chico.”

---

## Nota para propuesta PDF/HTML

Actualizar `propuesta-svm-erp.html` → versión **POS-AI** con esta matriz de planes cuando se definan precios en UF/CLP.
