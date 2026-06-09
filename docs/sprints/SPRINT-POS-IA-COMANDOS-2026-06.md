# Sprint — POS IA comandos naturales (jun 2026)

**Pantalla:** `/pos`  
**Estado:** ✅ MVP + v1.1 + v1.2 (prompt reestructurado, reglas locales primero, variantes y UX)

---

## Objetivo

Intérprete en tiempo real entre lenguaje natural del cajero y el carrito POS, con salida JSON estricta (ADD / UPDATE / REMOVE / CLEAR / SUBMIT_SALE / desambiguación).

---

## Arquitectura

| Capa | Ruta / módulo |
|------|----------------|
| UI | `PosAiCommandPanel`, `PosActionAlert` en `/pos` |
| Frontend | `posAiRulesClient.ts` (cliente primero), `applyPosAiActions.ts`, `POST /pos/proxy/pos/interpret` |
| BFF | `pos-api-bff/src/routes/pos.ts` |
| Assistant | `POST /internal/pos/interpret` — **reglas locales primero**, LLM como fallback acotado |
| Prompt | `pos-api-assistant/src/pos/systemPrompt.ts` + `buildPosUserMessage()` |

---

## Flujo

1. Cajero escribe o dicta: *"agrega hamburguesa italiana de pollo"*
2. **Frontend** intenta `interpretPosCartRules` local (mismo motor que assistant)
3. Si hay API key, BFF envía stocks + carrito al assistant; si el resultado local es mejor, se conserva
4. Comandos de producto **no pasan por LLM** en assistant (`isPosProductCommand` → reglas)
5. LLM (si aplica) recibe `[INVENTARIO_DISPONIBLE]` y `[CARRITO_ACTUAL]` vía `buildPosUserMessage`
6. `normalizeLlmResult` mapea `PROMPT_CLARIFICATION` → `UNKNOWN` y `UPDATE_CART` → `ADD_TO_CART`
7. `sanitizePosAiResult` valida stock e IDs
8. Frontend aplica acciones con `validateAddToCart`; feedback en `PosActionAlert` (flotante abajo)
9. `finalizar venta` → `SUBMIT_SALE` + `trigger_invoice` → `handleConfirmSale`

---

## Tests

```powershell
cd pos-api-assistant; npm run test:pos-ai
cd pos-frontend; npm run test:pos-ai
```

---

## Despliegue

```powershell
docker compose build pos-api-assistant pos-api-bff pos-frontend
docker compose up -d --force-recreate pos-api-assistant pos-api-bff pos-frontend
```

Requiere `OPENAI_API_KEY` en `.env` para LLM; sin key usa intérprete por reglas (español básico).

---

## v1.1 (continuación)

| Ítem | Detalle |
|------|---------|
| Voz | Botón 🎤 — Web Speech API (`es-CL`), Chrome/Edge |
| Atajo | `F2` enfoca comando POS IA |
| UPDATE | Reglas: *deja 3 empanadas*, *cambia a 5 coca* |
| Fix | `finalizar venta` por IA usa carrito actualizado al confirmar |
| UX | Resumen último intent/acciones bajo el panel |

---

## v1.2 — Prompt, variantes y catálogo

### System prompt (`systemPrompt.ts`)

Reestructurado con **roleplay**, **contextualización** y **one-shot**, agnóstico al rubro:

- Placeholders: `[INVENTARIO_DISPONIBLE]`, `[CARRITO_ACTUAL]`
- Reglas cognitivas: multi-ítem, cero alucinaciones, stock, carrito sensible
- Intents LLM: `ADD_TO_CART`, `UPDATE_CART`, `REMOVE_FROM_CART`, `CLEAR_CART`, `SUBMIT_SALE`, `PROMPT_CLARIFICATION`, `UNKNOWN`
- Salida JSON estricta (sin markdown); campos `reason` y `trigger_invoice`

### Matcher de reglas (assistant + frontend alineados)

| Función | Uso |
|---------|-----|
| `narrowRankedBySpecificTokens` | Evita que "pizza" matchee todas las pizzas |
| `narrowRankedByVariantTokens` | Filtra por carne/pollo/familiar/personal |
| `pickAmongSameVariant` | Misma variante → menor precio por defecto |
| `filterAmbiguousOptions` | Lista de desambiguación acotada a variante pedida |
| Typos voz | `pepperoni`→`pepperonni`, `hambueguesa`→`hamburguesa` |

### UX POS

| Ítem | Detalle |
|------|---------|
| Sin sugerencias | Panel sin chips de ejemplo |
| Desambiguación | Etiquetas con ruta categoría (`Hamburguesas › Pollo`) |
| Alert | `PosActionAlert` flotante abajo, auto-cierre |
| Voz | Feedback "Escuché: …" antes de interpretar |

### Catálogo y productos (soporte variantes)

- Migración **v1.17**: nombre de categoría único por padre (`scripts/migrate-v1.17-category-parent-name.ps1`)
- `CategoryDelegate`: slug con prefijo padre; permite Carne/Pollo bajo distintos padres
- `/products`: paginación (`TablePagination`), subcategoría editable al modificar producto
- Productos deben vivir en **hojas** de categoría (ej. `Hamburguesas › Pollo`) para etiquetas y matcher correctos

---

## Contrato JSON (referencia)

```json
{
  "intent": "ADD_TO_CART",
  "actions": [{ "action": "ADD", "product_id": "uuid", "quantity": 1, "reason": "opcional" }],
  "response_message": "Mensaje al cajero",
  "trigger_invoice": false
}
```

Desambiguación: `intent: "UNKNOWN"`, `actions: []`, mensaje pidiendo variante.
