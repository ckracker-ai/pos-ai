# Sprint prioritario — Catálogo e inventario (categorías jerárquicas)

**Prioridad:** P0 (siguiente gran entrega tras WSP afinado)  
**Rama sugerida:** `sprint/catalogo-categorias-2026-06`  
**Estado:** ✅ **CERRADO** (2026-06-02) — migración v1.9, UI, POS/reportes, assistant, cache BFF, TDD  
**Relacionado:** Asistente WSP/IA (`pos-api-assistant`), BFF (`pos-api-bff`), Core (`pos-api-core`)

---

## Acuse de arquitectura

| Tema | Compromiso |
|------|------------|
| **Contexto** | ERP multi-sucursal gastronómico; lógica pesada en Core; BFF para UI y pipeline del agente (voz / WhatsApp). |
| **Modelo** | Entidad `Categoria` **auto-referenciada** (`parent_id` → `Categoria.id`). `parent_id = NULL` → categoría principal; con valor → subcategoría. |
| **Objetivo agente** | Clasificar, buscar y filtrar productos con **baja latencia**; árbol cacheable en BFF para el pipeline del asistente. |
| **DDD** | Dominio puro; Sequelize solo en infraestructura/repositorio. |
| **Productos** | Deben apuntar a categoría válida (preferencia: **nodo hoja** = subcategoría) para evitar modificadores cruzados (extras hamburguesa ≠ pizza). |
| **Manual usuario** | Seeds de referencia explicados en `/manual` → sección **Categorías y productos** (cómo crear categoría, subcategoría y asignar producto). |

**Implementado:** `parent_id`, `slug`, árbol BFF/core, hojas en productos, seed Costa Azul (`migrate-v1.9-categories.ps1`). Ver `Category.model.ts` y `docs/catalog/CATEGORIAS-JERARQUICAS.md`.

---

## 1. Esquema objetivo — entidad `Categoria`

| Campo | Tipo | Notas |
|-------|------|--------|
| `id` | PK (UUID) | |
| `empresa_id` | FK | Multi-tenant |
| `nombre` | VARCHAR | Ej. "Pizzas", "Rolls Tempura" |
| `parent_id` | FK nullable → `categorias.id` | `NULL` = principal |
| `slug` | VARCHAR, indexado | Búsqueda rápida / voz ("pizzas-tradicionales") |
| `activo` | BOOLEAN | |
| `created_at` / `updated_at` | | |

**Índices sugeridos:** `(empresa_id, slug)` único; `(empresa_id, parent_id)`; `(empresa_id, activo)`.

**Producto:** `category_id` → debe resolver a categoría activa del mismo `empresa_id`; validación de **hoja** (sin hijos activos) o política documentada si se permite categoría principal.

---

## 2. Árbol de referencia (rubro gastronómico — seeders)

Usar como datos demo y como **ejemplo en el manual** (no obligatorio para todos los tenants):

```
Pizzas                          (principal)
├── Pizzas Tradicionales        (sub) — Pepperoni, Mozzarella
├── Pizzas Premium              (sub) — Trufa y Champiñón
└── Acompañamientos             (sub) — Pan de ajo, Papas fritas

Sushi                           (principal)
├── Rolls Envueltos en Palta
├── Rolls Tempura / Calientes
└── Sashimi y Nigiri

Comida Rápida                   (principal)
├── Hamburguesas de Vacuno
└── Hamburguesas Chicken / Veggie

Bebidas y Líquidos              (principal)
└── Bebidas Analcohólicas       (sub) — 1.5L, Aguas
```

**Slug sugeridos (ej.):** `pizzas`, `pizzas-tradicionales`, `sushi`, `sushi-rolls-tempura`, `comida-rapida`, `bebidas-analcoholicas`.

---

## 3. Capas y entregables

### Fase A — Dominio y persistencia (Core)

| # | Tarea | Criterio |
|---|--------|----------|
| A1 | Migración `categories`: `parent_id`, `slug`; backfill slugs | BD migrada sin romper tenants |
| A2 | Entidad dominio `Categoria` + reglas (no ciclos, no borrar con hijos activos) | Tests reglas dominio |
| A3 | `CategoryRepository`: `findTreeByEmpresa`, `findChildren`, `findBySlug` | Árbol en una query o 2 queries máx. |
| A4 | Validación al crear/editar `Product`: categoría hoja o explícita | 400 si categoría inválida |
| A5 | Seed demo Costa Azul (árbol gastronómico reducido o completo) | Productos demo bajo subcategorías |

### Fase B — BFF y consumo agente

| # | Tarea | Criterio |
|---|--------|----------|
| B1 | `GET /catalog/categories/tree` (tenant) | JSON anidado `children[]` |
| B2 | Cache corto en BFF (opcional) o ETag | ✅ `categoryTreeCache.ts` TTL 5 min + invalidación en CRUD |
| B3 | Assistant: búsqueda por categoría/slug en `buscar` | ✅ Core + WSP `buscar pizzas` / `buscar empanada` |
| B4 | Export árbol compacto para prompt IA (nombres + slugs, sin UUID al cliente) | ✅ `GET /assistant/catalog/categories-summary` + comando *categorias* |

### Fase C — UI tenant

| # | Tarea | Criterio |
|---|--------|----------|
| C1 | Mantenedor categorías: árbol principal / sub | CRUD con selector padre |
| C2 | Alta producto: solo subcategorías (hojas) en dropdown | UX clara |
| C3 | Filtros POS y reportes por categoría principal | ✅ POS + inventario reportes |

### Fase D — Documentación

| # | Tarea | Criterio |
|---|--------|----------|
| D1 | Manual `/manual` — sección categorías (usuario final) | Ver `catalogo-categorias` en manual |
| D2 | Doc técnica `docs/catalog/CATEGORIAS-JERARQUICAS.md` | Diagrama + API |
| D3 | Actualizar `SPRINT-PLAN.md` al cerrar fases | ✅ |

---

## 4. Reglas de negocio (dominio)

1. **Sin ciclos:** `parent_id` no puede descender del propio `id`.
2. **Profundidad:** v1 = 2 niveles (principal + sub). Extensible a N en v2 si se requiere.
3. **Producto → hoja:** por defecto solo subcategorías; categoría principal solo si no tiene hijos.
4. **Desactivar:** desactivar padre implica ocultar hijos en POS/agente (no borrar histórico).
5. **Modificadores (futuro):** vinculados a subcategoría o familia (ej. solo "Hamburguesas").

---

## 5. Consultas eficientes (repositorio)

- **Árbol completo:** una query `WHERE empresa_id = ? AND activo` + armado en memoria O(n), o CTE recursivo si MySQL 8+.
- **Eager loading:** asociación Sequelize `parent` / `children` solo en capa infra; DTO plano para API.
- **BFF:** respuesta `{ id, nombre, slug, children: [...] }` lista para cache Redis/mem (TTL 5–15 min) o snapshot en sesión assistant.

---

## 6. Integración con sprint WSP actual

| Ítem WSP | Relación con catálogo |
|----------|------------------------|
| `buscar empanada` | Hoy búsqueda plana; con árbol → `buscar` + filtro por slug/categoría |
| Carrito multi-ítem (ítem 5 WSP) | Independiente; convive |
| Seeds Costa Azul | Reemplazar/ampliar categorías planas por árbol gastronómico |

---

## 7. Orden de ejecución recomendado

1. A1 → A3 → A4 (Core + API tree)  
2. D1 (manual usuario — puede ir en paralelo)  
3. B1 → B3 (BFF + assistant)  
4. C1 → C2 (UI)  
5. A5 + seeds documentados en manual  

---

## 8. Sprint relacionado (mismo release)

- **Territorio CUT y sucursales:** [`SPRINT-TERRITORIO-CUT-SUCURSALES-2026-06.md`](./SPRINT-TERRITORIO-CUT-SUCURSALES-2026-06.md) — comuna + código postal en sucursales para delivery y agente por ubicación.

---

## 9. Confirmación para el equipo

La arquitectura jerárquica auto-referenciada, el rol del BFF como fachada cacheable hacia el agente de voz/WhatsApp y el enfoque gastronómico están **entendidos y registrados**.  
La generación de código de este módulo debe seguir las instrucciones de la sección 3 cuando se abra la rama de implementación.

## Cierre S1

```powershell
.\scripts\migrate-v1.9-categories.ps1
cd pos-api-core; npm install; npm run test:catalog
cd ..\pos-api-assistant; npm run test:wsp-cart
.\scripts\qa-smoke.ps1 -IncludeS1
```

**Siguiente:** **S2** territorio CUT completo · o ítems P2 WSP (`SPRINT-WSP-AFINADO-2026-06.md`).
