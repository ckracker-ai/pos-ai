# PYME informal — módulo “Negocio en marcha” (diseño)

**Estado:** fase B+C implementada (2026-06) · migración `v1.14.0`

## Objetivo

Permitir que negocios **sin RUT** (informales, ferias, emprendimientos en casa) usen POS-AI para ordenar operación, con un camino claro hacia formalización tributaria.

## Estados tributarios (`empresas`)

| Estado | Descripción | Capacidades |
|--------|-------------|-------------|
| `INFORMAL` | Sin RUT / sin inicio de actividades | POS, catálogo, comandas, reportes básicos, **1 sucursal** |
| `EN_TRAMITE` | Formalización en curso | Igual + checklist y recordatorios |
| `FORMAL` | RUT vigente | Plan completo según suscripción (WSP, pasarela Full, etc.) |

## Registro sin RUT

- Nombre fantasía, rubro, teléfono y email verificados.
- Comuna opcional.
- Identificador interno hasta capturar RUT.
- Plan inicial: **Básico** (mismo precio + IVA).

## Módulo UI — “Camino a tu negocio formal”

Ubicación propuesta: pestaña en `/empresas` o sección **Mi negocio**.

1. Diagnóstico rápido (ocasional vs. sustento).
2. Checklist Chile (orientativo, no asesoría legal): SII, municipalidad, cuenta bancaria.
3. Barra de progreso.
4. Formulario de captura RUT → migración a `FORMAL`.
5. Comprobantes con leyenda “documento interno” en informal ✅ (ticket POS).

## Límites por estado

| Capacidad | Informal | Formal |
|-----------|----------|--------|
| WSP IA | No (o demo) | Estándar+ |
| Pasarela | No | Full + wizard por empresa |
| Multi-sucursal | 1 | Según plan |
| Export “tributario” | No | Futuro DTE |

## Pasarela automatizada (Full + formal)

Wizard en empresa: proveedor → credenciales cifradas por `empresa_id` → webhook con `metadata.empresaId` → flag `pagos_online_activo`.

## Fases de implementación

1. **A** — Matriz planes en BD y landing ✅ (v1.13)
2. **B** — `estado_tributario` + registro sin RUT ✅ (v1.14)
3. **C** — UI checklist formalización ✅ (`/empresas` → Formalizar)
4. **D** — Wizard pasarela por tenant
5. **E** — POS IA (después de A–D acordados)

## Decisiones cerradas (2026-06)

- Básico: 1 empresa, 1 sucursal, 3 usuarios (Admin, Vendedor, Comanda).
- Estándar/Full: 1 empresa, 3 sucursales, 6 usuarios (Admin, Auditor, Vendedor, Comanda×3).
- Informal empieza en Básico hasta formalizar para canales IA y pagos.
