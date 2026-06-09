import type { PosAiAction, PosAiResult, PosCartItem, PosStockItem } from './types.js';

function cartQtyMap(cart: PosCartItem[]): Map<string, number> {
  return new Map(cart.map((c) => [c.id_producto, c.cantidad]));
}

export function sanitizePosAiResult(
  raw: PosAiResult,
  stocks: PosStockItem[],
  cart: PosCartItem[]
): PosAiResult {
  const stockById = new Map(stocks.map((s) => [s.id, s]));
  const inCart = cartQtyMap(cart);
  const notes: string[] = [];

  if (raw.intent === 'CLEAR_CART') {
    return {
      intent: 'CLEAR_CART',
      actions: [],
      response_message: raw.response_message?.trim() || 'Carrito vaciado.',
      trigger_invoice: false,
    };
  }

  if (raw.intent === 'SUBMIT_SALE') {
    const hasItems = cart.length > 0;
    return {
      intent: 'SUBMIT_SALE',
      actions: [],
      response_message:
        raw.response_message?.trim() ||
        (hasItems ? 'Listo para finalizar la venta.' : 'El carrito está vacío.'),
      trigger_invoice: hasItems && raw.trigger_invoice === true,
    };
  }

  const sanitized: PosAiAction[] = [];

  for (const act of raw.actions) {
    const productId = String(act.product_id ?? '').trim();
    const stock = stockById.get(productId);
    if (!stock) {
      notes.push(`No encontramos el producto solicitado (id ${productId || '—'}).`);
      continue;
    }
    if (stock.stock_actual <= 0) {
      notes.push(`"${stock.nombre}" no tiene stock disponible.`);
      continue;
    }

    const qty = Math.max(0, Math.floor(Number(act.quantity) || 0));
    const already = inCart.get(productId) ?? 0;

    if (act.action === 'REMOVE') {
      sanitized.push({
        action: 'REMOVE',
        product_id: productId,
        quantity: qty > 0 ? qty : already || 1,
        reason: act.reason || `Quitar ${stock.nombre}`,
      });
      const next = Math.max(0, already - (qty > 0 ? qty : already || 1));
      inCart.set(productId, next);
      continue;
    }

    if (act.action === 'UPDATE') {
      const target = qty > 0 ? qty : 1;
      const capped = Math.min(target, stock.stock_actual);
      if (capped < target) {
        notes.push(`Solo hay ${stock.stock_actual} u. de "${stock.nombre}"; ajustamos a ${capped}.`);
      }
      sanitized.push({
        action: 'UPDATE',
        product_id: productId,
        quantity: capped,
        reason: act.reason || `Cantidad ${stock.nombre} → ${capped}`,
      });
      inCart.set(productId, capped);
      continue;
    }

    // ADD
    const addQty = qty > 0 ? qty : 1;
    const maxAdd = Math.max(0, stock.stock_actual - already);
    const applied = Math.min(addQty, maxAdd);
    if (applied <= 0) {
      notes.push(`Ya tienes todo el stock de "${stock.nombre}" en el carrito.`);
      continue;
    }
    if (applied < addQty) {
      notes.push(`Agregamos ${applied} de "${stock.nombre}" (stock máximo ${stock.stock_actual}).`);
    }
    sanitized.push({
      action: 'ADD',
      product_id: productId,
      quantity: applied,
      reason: act.reason || `Agregar ${applied} × ${stock.nombre}`,
    });
    inCart.set(productId, already + applied);
  }

  let response = raw.response_message?.trim() || '';
  if (notes.length > 0) {
    response = [response, ...notes].filter(Boolean).join(' ');
  }
  if (!response) {
    if (sanitized.length === 0) {
      return {
        intent: 'UNKNOWN',
        actions: [],
        response_message: 'No pude interpretar el pedido. Intenta con el nombre del producto.',
        trigger_invoice: false,
      };
    }
    response = 'Acciones aplicadas al carrito.';
  }

  const hasUpdate = sanitized.some((a) => a.action === 'UPDATE');
  const hasRemove = sanitized.some((a) => a.action === 'REMOVE');
  const intent =
    sanitized.length > 0
      ? raw.intent === 'REMOVE_FROM_CART' || (hasRemove && !hasUpdate && sanitized.every((a) => a.action === 'REMOVE'))
        ? 'REMOVE_FROM_CART'
        : 'ADD_TO_CART'
      : 'UNKNOWN';

  return {
    intent: sanitized.length > 0 ? intent : 'UNKNOWN',
    actions: sanitized,
    response_message: response,
    trigger_invoice: false,
  };
}
