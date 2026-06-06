# Sprint prioritario — Territorio Chile (CUT) y sucursales

**Prioridad:** P0 (paralelo o inmediatamente después de catálogo; **bloqueante para delivery / voz por comuna**)  
**Rama sugerida:** `sprint/territorio-cut-sucursales-2026-06`  
**Estado:** ✅ **CERRADO** (2026-06-02) — CUT 346 comunas, cache BFF, WSP `comuna …`, TDD + smoke S2  
**Alcance UI:** extender mantenedor **Sucursales** (`/branches`) + datos para BFF / asistente WSP-voz

---

## Acuse de arquitectura

| Tema | Compromiso |
|------|------------|
| **Antipatrón rechazado** | No llamar APIs externas de regiones/comunas en tiempo real durante una llamada del agente (latencia + caídas). |
| **Fuente de verdad** | Código Único Territorial (CUT), estándar SUBDERE — datos **locales** en BD vía migraciones/seeders. |
| **Rendimiento** | Consultas locales &lt; 1 ms; dataset estático cacheable en BFF. |
| **Sucursal** | Cada `Sucursal` con `comuna_id` (FK CUT) + `codigo_postal` 7 dígitos (CorreosChile) + `direccion`. |
| **Agente voz/WSP** | STT imperfecto → búsqueda normalizada (sin tildes, `ILIKE`/collation) en BFF para resolver comuna y acercar sucursal. |
| **Multi-sucursal** | Zonificación delivery, facturación/despacho, asociar pedido a sucursal correcta por comuna/CP dictados por el cliente. |

**Implementado:** `comuna_id`, `codigo_postal`, UI cascada región→comuna, BFF search/resolve, assistant `comuna …`. Dataset: `data/cut/cut_comuna-subdere-2018.csv` → `chileCutData.ts` (346 comunas).

**Nota provincias:** El CUT oficial incluye Región → Provincia → Comuna. Este sprint modela **Región + Comuna** (PK `codigo_cut` en ambas), suficiente para voz y CorreosChile en la mayoría de flujos. Si se requiere provincia intermedia, agregar entidad `Provincia` en fase B sin romper FKs de comuna.

---

## 1. Modelo de datos objetivo

### `Region`

| Campo | Tipo | Notas |
|-------|------|--------|
| `codigo_cut` | VARCHAR, **PK** | Ej. `13` RM, `02` Antofagasta |
| `nombre` | VARCHAR | Ej. `Región Metropolitana de Santiago` |
| `sigla` | VARCHAR | Ej. `RM`, `ANTOF` |

Tabla global (no por tenant) — catálogo país.

### `Comuna`

| Campo | Tipo | Notas |
|-------|------|--------|
| `codigo_cut` | VARCHAR, **PK** | Ej. `13101` Santiago, `2101` Antofagasta |
| `nombre` | VARCHAR | Ej. `Estación Central` |
| `region_id` | FK → `Region.codigo_cut` | |

Tabla global — seed desde CUT SUBDERE.

### `Sucursal` (`branches` — extensión)

| Campo | Tipo | Notas |
|-------|------|--------|
| `id` | UUID PK | existente |
| `empresa_id` | FK | existente |
| `nombre` | VARCHAR | existente (`name`) |
| `direccion` | VARCHAR/TEXT | existente (`address`) |
| `comuna_id` | FK → `Comuna.codigo_cut` | **nuevo**, obligatorio en alta |
| `codigo_postal` | VARCHAR(7) | **nuevo**, CorreosChile |
| `activo` | BOOLEAN | existente (`isActive`) |
| `phone` | | existente, opcional |

**Validaciones dominio:**

- `codigo_postal`: exactamente 7 dígitos numéricos.
- `comuna_id`: debe existir y estar activa en catálogo CUT.
- Opcional futuro: validar coherencia CP ↔ comuna (tabla referencia Correos o heurística).

---

## 2. Árbol territorial (ejemplo seed)

```
Región 13 — RM (sigla RM)
├── Comuna 13101 — Santiago
├── Comuna 13102 — Cerrillos
├── Comuna 13106 — Estación Central
└── …

Región 02 — Antofagasta (sigla ANTOF)
├── Comuna 2101 — Antofagasta
└── …
```

Seeder: archivo(s) JSON/CSV generados desde publicación SUBDERE (versión fechada en migración). No descargar en runtime.

---

## 3. Capas y entregables

### Fase A — Persistencia local CUT (Core)

| # | Tarea | Criterio |
|---|--------|----------|
| A1 | Migración `regions`, `comunas` + índices (`region_id`, `nombre`) | Tablas pobladas |
| A2 | Seeder CUT Chile completo (script reproducible) | ✅ `build-chile-cut-data.mjs` + `seedCutChile` upsert 346 |
| A3 | Migración `branches`: `comuna_id`, `codigo_postal` | Backfill demo Costa Azul |
| A4 | Asociaciones Sequelize + repositorios territorio | Sin lógica en controllers |
| A5 | Validación create/update sucursal | 400 si CP o comuna inválidos |

### Fase B — BFF (búsqueda para agente)

| # | Tarea | Criterio |
|---|--------|----------|
| B1 | `GET /territory/regions` · `GET /territory/comunas?region=` | Lista para UI |
| B2 | `GET /territory/comunas/search?q=estacion central` | Normalización acentos, top N |
| B3 | `POST /territory/resolve` body `{ comunaText?, codigoPostal? }` | Devuelve comuna + sucursales candidatas |
| B4 | Cache en memoria del árbol región→comunas al arrancar BFF | ✅ `territoryCache.ts` |

**Normalización texto (BFF):**

```text
estacion central → estación central (match)
NFD + strip diacritics + lower + trim + collapse spaces
```

MySQL: `LIKE` con collation utf8mb4_unicode_ci o columna `nombre_normalizado` en seed.

### Fase C — UI Sucursales

| # | Tarea | Criterio |
|---|--------|----------|
| C1 | Formulario: selector región → comuna (cascada) | Reemplaza `city` libre |
| C2 | Campo código postal 7 dígitos con máscara/validación | |
| C3 | Listado muestra comuna + CP | |
| C4 | Manual `/manual` sección sucursales y territorio | Usuario sabe completar datos |

### Fase D — Asistente (WSP / voz)

| # | Tarea | Criterio |
|---|--------|----------|
| D1 | Comando o flujo: cliente indica comuna → `resolve` BFF → sucursal | ✅ `comuna …` en WSP |
| D2 | Pedido guarda `branch_id` resuelto + metadata comuna/CP | ✅ `session_branch` + sucursal con comuna |
| D3 | Doc `docs/assistant/TERRITORIO-Y-SUCURSAL.md` | ✅ |

---

## 4. Reglas de negocio

1. Catálogo CUT es **solo lectura** para tenants (solo plataforma/migración escribe).
2. No eliminar comuna con sucursales activas referenciando su `codigo_cut`.
3. Desactivar sucursal no borra historial de ventas.
4. Agente: si hay ambigüedad (“Santiago”), devolver desambiguación con opciones numeradas (misma UX que productos).
5. Código postal dictado por voz: validar 7 dígitos; si no coincide con comuna, pedir confirmación humana.

---

## 5. Integración con otros sprints

| Sprint | Relación |
|--------|----------|
| [SPRINT-CATALOGO-CATEGORIAS-2026-06.md](./SPRINT-CATALOGO-CATEGORIAS-2026-06.md) | Independiente; mismo release posible |
| [SPRINT-WSP-AFINADO-2026-06.md](./SPRINT-WSP-AFINADO-2026-06.md) | Hoy `sucursales` + número; evolución a comuna/CP |
| Delivery / facturación | Consumen `codigo_postal` de sucursal y pedido |

---

## 6. Orden de ejecución recomendado

1. A1 → A2 (tablas + seed CUT)  
2. A3 → A5 (sucursales)  
3. C1 → C3 (UI) + manual  
4. B1 → B4 (BFF search)  
5. D1 → D3 (assistant)  

---

## 7. Confirmación

Persistencia **local** CUT (SUBDERE), consultas de baja latencia, vínculo **Comuna + Código Postal 7 dígitos** en **Sucursal**, y búsqueda tolerante a errores STT en el BFF están **entendidos y registrados**.  
La implementación se hará al extender el módulo de sucursales existente, no como microservicio aparte.

## Cierre S2

```powershell
.\scripts\migrate-v1.8-territory.ps1
node scripts/build-chile-cut-data.mjs
docker compose up -d --build pos-api-core pos-api-bff pos-api-assistant
cd pos-api-core; npm run test:territory
cd ..\pos-api-assistant; npm run test:wsp-territory
.\scripts\qa-smoke.ps1 -IncludeS2
```

**Siguiente:** **S3** POS IA venta v2 · o WSP P2 (mensajes/estilos).
