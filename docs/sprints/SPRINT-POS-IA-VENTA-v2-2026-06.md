# Sprint S3 — POS IA Venta v2 (jun 2026)

**Prioridad:** tras S0–S2  
**Estado:** ✅ **MVP cerrado** (asistente reglas en caja, sin LLM remoto en v1)  
**Pantalla:** `/pos`

---

## Objetivo

Acelerar la venta en caja con sugerencias contextuales y validaciones claras (stock, delivery, número de venta), alineado al concepto POS+IA sin depender de OpenAI en cada tecla.

---

## Entregables MVP

| # | Ítem | Estado |
|---|------|--------|
| A1 | Módulo `posSaleAssist.ts` (sugerencias, validar línea, validar venta) | ✅ |
| A2 | TDD `pos-frontend/test/pos-sale-assist.test.ts` | ✅ `npm run test:pos-assist` |
| A3 | UI `PosSaleAssistPanel` — chips un clic | ✅ |
| A4 | Integración `/pos` + stock carrito acumulado | ✅ |
| A5 | Doc sprint + manual (pendiente ampliar sección POS) | ✅ doc |

---

## Reglas de sugerencias (v1)

1. Solo productos con **stock > 0** y no están en el carrito.
2. Tras agregar un ítem, prioriza **misma familia** (`categoryId` / nombre categoría).
3. Si el carrito tiene ítems, el resto como **complemento** ordenado por stock.
4. Máximo **6** sugerencias visibles.

---

## Fuera de alcance MVP (backlog S3+)

- LLM en tiempo real en caja (latencia/costo).
- Cross-sell con historial de ventas por sucursal.
- Atajos de teclado F1–F6.
- API BFF `/pos/suggest` (hoy todo cliente).

---

## Comandos

```powershell
cd pos-frontend
npm install
npm run test:pos-assist
npm run type-check
```

**Siguiente:** pulir **WSP P2** (mensajes, estilos) · luego **S4** delivery tracking.
