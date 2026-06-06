# Sprint S4 — Delivery tracking v1

**Estado:** ✅ **CERRADO (MVP)** · **2026-06-02**  
**Roadmap:** [`SPRINT-MASTER-ROADMAP-2026-H2.md`](SPRINT-MASTER-ROADMAP-2026-H2.md)

---

## Objetivo

Timeline operativo para ventas con `requires_delivery`: estados auditables y cola de trabajo por sucursal.

---

## Entregado

| # | Entrega |
|---|---------|
| S4.1 | Migración `delivery_status` + `sale_delivery_events` |
| S4.2 | Estados `CREATED` → `ASSIGNED` → `ON_ROUTE` → `DELIVERED` / `FAILED` |
| S4.3 | API Core: pending, patch status, timeline |
| S4.4 | BFF proxy + UI `/delivery` |
| S4.5 | Auto `CREATED` al crear venta con delivery en POS |
| S4.6 | TDD transiciones `npm run test:delivery` |

---

## API (BFF `/pos/proxy/sales`)

| Método | Ruta |
|--------|------|
| GET | `/deliveries/pending` |
| PATCH | `/:saleId/delivery-status` `{ status, note? }` |
| GET | `/:saleId/delivery-timeline` |

---

## Comandos

```powershell
.\scripts\migrate-v1.11-delivery.ps1
docker compose up -d --build pos-api-core pos-api-bff pos-frontend
cd pos-api-core; npm run test:delivery
.\scripts\qa-smoke.ps1 -IncludeS4
```

---

## Fuera de alcance (backlog S4+)

- Métricas tiempo promedio / dashboard KPI envíos
- Asignación repartidor (usuario/driver_id)
- Notificaciones WSP al cliente por cambio de estado
- Mapa / geolocalización

---

## Siguiente

**WSP P2** o **S6** ERP AI.
