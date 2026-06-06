# Sprint Master Roadmap — POS-AI (H2 2026)

Plan maestro consolidado con **sprints de 2 semanas**, carga estimada **8–12 h/día** y foco en concepto **POS + IA**.

---

## 1) Cadencia y capacidad

- **Duración sprint:** 10 días hábiles (2 semanas).
- **Carga objetivo:** 80–120 horas por sprint.
- **Estrategia de ejecución:** vertical slices (Core + BFF + Front + Docs + QA).
- **Calidad:** TDD incremental en features nuevas y regresiones críticas.

---

## 2) Memoria de prioridades (notas del usuario)

1. Mantener y fortalecer concepto **POS IA** (no solo ERP clásico).
2. Formulario de venta con IA (asistencia, autocompletado, validaciones inteligentes).
3. Venta con **delivery condicional** y tracking operativo.
4. Integración con **ERP AI (Nuevo Proyecto)**.
5. Documentación continua para no perder contexto entre sesiones.
6. Backlog vivo orientado a TDD.
7. Evaluar arquitectura **micro-frontend** para acelerar módulos nuevos.

---

## 3) Orden de sprints (reorganizado)

| Sprint | Duración | Carga | Objetivo principal | Estado |
|---|---|---:|---|---|
| **S0 — Cierre técnico base** | 2 semanas | 80–100 h | Cerrar pendientes críticos WSP + validar delivery reciente + hardening mínimo | ✅ Cerrado |
| **S1 — Catálogo IA (jerárquico)** | 2 semanas | 90–120 h | `categories` jerárquicas + árbol para assistant + UI mantenedor | ✅ Cerrado |
| **S2 — Territorio CUT + Sucursales** | 2 semanas | 90–120 h | CUT completo, comuna/CP, búsquedas STT robustas, resolve sucursal | ✅ Cerrado |
| **S3 — POS IA Venta v2** | 2 semanas | 100–120 h | Formulario venta IA + reglas de sugerencia + mejoras UX vendedor | ✅ MVP |
| **S4 — Delivery Tracking v1** | 2 semanas | 90–120 h | Tracking delivery (estados, tiempos, vista operación y reportes) | ✅ MVP — [`SPRINT-S4-DELIVERY-TRACKING-2026-06.md`](SPRINT-S4-DELIVERY-TRACKING-2026-06.md) |
| **S5 — Pasarela + conciliación segura** | 2 semanas | 100–120 h | Persistencia de transacciones, webhooks idempotentes, auditoría pagos | ✅ Cerrado — [`SPRINT-S5-PASARELA-CONCILIACION-2026-06.md`](SPRINT-S5-PASARELA-CONCILIACION-2026-06.md) |
| **S6 — ERP AI Integración (Nuevo Proyecto) — Fase 1** | 2 semanas | 100–120 h | Contrato de integración, sync inicial y observabilidad | Nuevo |
| **S7 — Infraestructura legal SaaS (ToS, SLA, privacidad, TDD)** | 2 semanas | 60–80 h | Borradores legales + tablas `legal_*` + gate aceptación registro/checkout | 📋 [`SPRINT-S7-INFRAESTRUCTURA-LEGAL-2026-06.md`](./SPRINT-S7-INFRAESTRUCTURA-LEGAL-2026-06.md) |
| **S8 — Arquitectura modular (micro-frontend decision)** | 2 semanas | 80–100 h | Decisión técnica y spike controlado (sin romper operación) | Backlog |

---

## 4) Detalle por sprint

### S0 — Cierre técnico base ✅

**Checklist operativo:** [`SPRINT-S0-CIERRE-BASE-2026-06.md`](./SPRINT-S0-CIERRE-BASE-2026-06.md) — **cerrado 2026-06-02**

- Backlog crítico WSP + comprobantes cerrado (E2E, admin sin re-spam, carrito multi-búsqueda).
- Cifrado `transfer_*` + smoke `qa-smoke.ps1 -IncludeS0` (15 OK).
- Delivery condicional validado en API y reportes.
- **D4** (CUT ~346 comunas) → **S2**.

### S1 — Catálogo IA (jerárquico)

- Ejecutar fases A/B/C/D del sprint de categorías.
- Endpoints árbol cacheables para assistant.
- Validación de categoría hoja en producto.
- Manual usuario actualizado con casos reales.

### S2 — Territorio CUT + Sucursales

- Completar dataset CUT (todas las comunas).
- Resolver desambiguación comuna STT.
- Validaciones de comuna/código postal robustas.
- Pruebas con sucursales multi-región.

### S3 — POS IA Venta v2

- Asistente IA en formulario de venta (sugerencia de productos, cantidad, cross-sell).
- Validación contextual (stock, horario, sucursal, reglas comerciales).
- Copys y UX orientados a rapidez en caja.
- TDD para cálculo, payload y reglas IA.

### S4 — Delivery Tracking v1 ✅

**Cerrado 2026-06-02** — [`SPRINT-S4-DELIVERY-TRACKING-2026-06.md`](./SPRINT-S4-DELIVERY-TRACKING-2026-06.md)

- Cola `/delivery`, estados con transiciones validadas, `sale_delivery_events`.
- Métricas tiempo promedio → backlog S4+.

### S5 — Pasarela + conciliación segura ✅

**Cerrado 2026-06-02** — [`SPRINT-S5-PASARELA-CONCILIACION-2026-06.md`](./SPRINT-S5-PASARELA-CONCILIACION-2026-06.md)

- `payment_events`, inbound unificado, Webpay simulate/integration, checkout registro.
- Postman pagos, E2E `test-s5-checkout-e2e.ps1`, política reintentos.

### S6 — ERP AI Integración (Nuevo Proyecto)

- Definir contrato (API/eventos) entre POS-AI y ERP AI.
- Tabla de mapeos y control de sincronización.
- Estrategia de fallback cuando ERP AI no responda.

### S7 — Arquitectura modular (micro-frontend)

- **No migrar por moda.** Hacer decisión por criterios:
  - velocidad de entrega por módulo,
  - independencia de despliegue,
  - complejidad operativa.
- Entregar ADR con 3 opciones:
  1) Monolito modular (actual mejorado),
  2) Micro-frontend por dominio,
  3) Híbrido (recomendado para transición).

---

## 5) TDD y documentación obligatoria por sprint

- **TDD mínimo por historia crítica:** al menos 1 test de dominio + 1 test de integración.
- **Checklist de DoD por ticket:**
  - código + tests,
  - documentación funcional/técnica,
  - evidencia de QA,
  - nota de riesgos.
- **Bitácora diaria corta:** avances, bloqueos, decisiones.

---

## 6) Recomendación de reorganización (etapa actual)

Dado el estado actual, conviene estrategia **híbrida**:

1. Mantener monorepo actual (Core/BFF/Frontend) para velocidad inmediata.
2. Modularizar por dominio (Ventas, Delivery, Catálogo IA, Territorio, Pagos).
3. Posponer micro-frontend “duro” hasta completar S3/S4 con métricas reales.
4. Si la carga de módulos crece, iniciar micro-frontend por **Plataforma** primero (menor riesgo operativo que POS).

---

## 7) Referencias de sprints activos/específicos

- `SPRINT-S0-CIERRE-BASE-2026-06.md`
- `SPRINT-WSP-AFINADO-2026-06.md`
- `SPRINT-CATALOGO-CATEGORIAS-2026-06.md`
- `SPRINT-TERRITORIO-CUT-SUCURSALES-2026-06.md`
- `SPRINT-S5-PASARELA-CONCILIACION-2026-06.md`

