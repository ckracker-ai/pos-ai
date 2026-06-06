# Sprint — POS IA comandos naturales (jun 2026)

**Pantalla:** `/pos`  
**Estado:** ✅ MVP + v1.1 (voz, F2, UPDATE cantidad, fix cierre venta IA)

---

## Objetivo

Intérprete en tiempo real entre lenguaje natural del cajero y el carrito POS, con salida JSON estricta (ADD / REMOVE / CLEAR / SUBMIT_SALE).

---

## Arquitectura

| Capa | Ruta / módulo |
|------|----------------|
| UI | `PosAiCommandPanel` en `/pos` |
| Frontend | `applyPosAiActions.ts`, `POST /pos/proxy/pos/interpret` |
| BFF | `pos-api-bff/src/routes/pos.ts` |
| Assistant | `POST /internal/pos/interpret` — OpenAI + fallback reglas |
| Prompt | `pos-api-assistant/src/pos/systemPrompt.ts` (contrato usuario) |

---

## Flujo

1. Cajero escribe: *"agrega 2 empanadas de queso"*
2. BFF envía stocks + carrito actual al assistant
3. OpenAI (o reglas si no hay key) devuelve JSON
4. `sanitizePosAiResult` valida stock e IDs
5. Frontend aplica acciones al carrito con `validateAddToCart`
6. `finalizar venta` → `SUBMIT_SALE` + `trigger_invoice` → `handleConfirmSale`

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
