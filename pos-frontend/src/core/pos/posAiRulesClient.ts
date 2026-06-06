/**
 * Intérprete POS en cliente — fallback si BFF/assistant no está desplegado (404).
 * Mantener alineado con pos-api-assistant/src/pos/rulesInterpreter.ts
 */

import type { PosAiResult } from './posAiTypes';

export type PosAiStockItem = {
  id: string;
  nombre: string;
  sku: string;
  precio: number;
  stock_actual: number;
};

export type PosAiCartItem = {
  id_producto: string;
  cantidad: number;
  precio_unitario: number;
};

const WORD_QTY: Record<string, number> = {
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
};

const STOP_WORDS = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'un',
  'una',
  'con',
  'para',
  'al',
  'en',
  'y',
  'e',
  'lo',
  'le',
  'mi',
  'tu',
]);

const ADD_VERBS_RE =
  /^(?:agrega|agregar|anade|anadir|suma|sumar|pon|poner|mete|meter|dame|dar|quiero|necesito)\s+/i;
const REMOVE_VERBS_RE =
  /^(?:quita|quitar|saca|sacar|elimina|eliminar|remover|borra|borrar)\s+/i;
const UPDATE_VERBS_RE =
  /^(?:deja|dejar|poner|cambia|cambiar|actualiza|actualizar)\s+/i;

/** Normaliza para matching; elimina puntuación (no usar antes de split por comas). */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function singularize(token: string): string {
  if (token.endsWith('iones') && token.length > 6) return token.slice(0, -2);
  if (token.endsWith('es') && token.length > 4) return token.slice(0, -2);
  if (token.endsWith('s') && token.length > 3) return token.slice(0, -1);
  return token;
}

function meaningfulTokens(text: string): string[] {
  return normalize(text)
    .split(' ')
    .map((t) => singularize(t))
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function parseQuantity(text: string): number {
  const n = normalize(text);
  const digit = n.match(/\b(\d{1,3})\b/);
  if (digit) return Math.max(1, Number(digit[1]));
  for (const [word, qty] of Object.entries(WORD_QTY)) {
    if (new RegExp(`\\b${word}\\b`).test(n)) return qty;
  }
  return 1;
}

/** Quita verbos al inicio sin destruir comas (listas multi-producto). */
function stripLeadingVerbsRaw(raw: string): string {
  return raw
    .trim()
    .replace(ADD_VERBS_RE, '')
    .replace(REMOVE_VERBS_RE, '')
    .replace(UPDATE_VERBS_RE, '')
    .trim();
}

export function productSearchText(raw: string): string {
  return meaningfulTokens(stripLeadingVerbsRaw(raw)).join(' ');
}

/** Divide pedidos compuestos preservando comas: "pino, cafe, 2 queso". */
export function splitProductSegments(raw: string): string[] {
  const text = stripLeadingVerbsRaw(raw).trim();
  if (!text) return [];

  const byJoiner = text
    .split(/\s*,\s*|\s+y\s+|\s+e\s+|\s+ademas\s+|\s+tambien\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  if (byJoiner.length > 1) return byJoiner;

  const byQty = text.match(
    /(?:^|\s)(\d{1,3}|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+[^,\d]+?(?=\s+(?:\d{1,3}|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+|$)/gi
  );
  if (byQty && byQty.length > 1) {
    return byQty.map((s) => s.trim()).filter(Boolean);
  }

  return [text];
}

function tokenMatchesName(token: string, name: string, sku: string): boolean {
  const t = singularize(token);
  if (name.includes(t) || sku.includes(t)) return true;
  const nameParts = name.split(' ').map(singularize);
  return nameParts.some((part) => part === t || part.startsWith(t) || t.startsWith(part));
}

export function findProductByTextClient(text: string, stocks: PosAiStockItem[]): PosAiStockItem | null {
  const cleaned = productSearchText(text);
  if (!cleaned) return null;

  const tokens = meaningfulTokens(text);
  if (tokens.length === 0) return null;

  let best: { p: PosAiStockItem; score: number } | null = null;

  for (const p of stocks) {
    const name = normalize(p.nombre);
    const sku = normalize(p.sku);
    let matched = 0;
    for (const t of tokens) {
      if (tokenMatchesName(t, name, sku)) matched++;
    }
    if (matched === 0) continue;

    let score = matched * 100;
    if (name.includes(cleaned)) score += 500;
    if (tokens.length >= 2 && matched >= tokens.length) score += 200;
    if (sku && cleaned.includes(sku)) score += 150;
    const lastToken = tokens[tokens.length - 1];
    if (lastToken && name.endsWith(lastToken)) score += 80;

    if (!best || score > best.score) best = { p, score };
  }

  return best?.p ?? null;
}

function stocksInCart(stocks: PosAiStockItem[], cart: PosAiCartItem[]): PosAiStockItem[] {
  const ids = new Set(cart.map((c) => c.id_producto));
  return stocks.filter((s) => ids.has(s.id));
}

function lastCartProduct(stocks: PosAiStockItem[], cart: PosAiCartItem[]): PosAiStockItem | null {
  for (let i = cart.length - 1; i >= 0; i--) {
    const found = stocks.find((s) => s.id === cart[i].id_producto);
    if (found) return found;
  }
  return null;
}

function resolveProduct(
  text: string,
  stocks: PosAiStockItem[],
  cart: PosAiCartItem[],
  preferCart: boolean
): PosAiStockItem | null {
  if (preferCart) {
    const inCart = findProductByTextClient(text, stocksInCart(stocks, cart));
    if (inCart) return inCart;
  }
  return findProductByTextClient(text, stocks);
}

function sanitize(
  raw: PosAiResult,
  stocks: PosAiStockItem[],
  cart: PosAiCartItem[]
): PosAiResult {
  const stockById = new Map(stocks.map((s) => [s.id, s]));
  const inCart = new Map(cart.map((c) => [c.id_producto, c.cantidad]));
  const notes: string[] = [];
  const actions = [];

  for (const act of raw.actions) {
    const stock = stockById.get(act.product_id);
    if (!stock || stock.stock_actual <= 0) {
      notes.push(`"${act.product_id}" no está en inventario.`);
      continue;
    }
    const qty = Math.max(1, Math.floor(act.quantity) || 1);
    const already = inCart.get(act.product_id) ?? 0;

    if (act.action === 'REMOVE') {
      actions.push({ ...act, quantity: qty });
      inCart.set(act.product_id, Math.max(0, already - qty));
      continue;
    }
    if (act.action === 'UPDATE') {
      const capped = Math.min(qty, stock.stock_actual);
      actions.push({ ...act, quantity: capped });
      inCart.set(act.product_id, capped);
      continue;
    }
    const maxAdd = Math.max(0, stock.stock_actual - already);
    const applied = Math.min(qty, maxAdd);
    if (applied <= 0) {
      notes.push(`Sin stock extra de "${stock.nombre}".`);
      continue;
    }
    if (applied < qty) notes.push(`Agregamos ${applied} de "${stock.nombre}" (máx. ${stock.stock_actual}).`);
    actions.push({ ...act, action: 'ADD' as const, quantity: applied });
    inCart.set(act.product_id, already + applied);
  }

  const response = [raw.response_message, ...notes].filter(Boolean).join(' ');
  return {
    ...raw,
    actions,
    response_message: response || raw.response_message,
    intent: actions.length > 0 ? raw.intent : 'UNKNOWN',
  };
}

function buildAddActions(
  payload: string,
  stocks: PosAiStockItem[],
  cart: PosAiCartItem[]
): { actions: PosAiResult['actions']; messages: string[]; missing: string[] } {
  const segments = splitProductSegments(payload);
  const actions: PosAiResult['actions'] = [];
  const messages: string[] = [];
  const missing: string[] = [];

  for (const segment of segments) {
    const product = resolveProduct(segment, stocks, cart, false);
    if (!product) {
      missing.push(productSearchText(segment) || segment);
      continue;
    }
    const qty = parseQuantity(segment);
    actions.push({
      action: 'ADD',
      product_id: product.id,
      quantity: qty,
      reason: `Agregar ${product.nombre}`,
    });
    messages.push(`${qty} × ${product.nombre}`);
  }

  return { actions, messages, missing };
}

function extractAddPayload(rawText: string): string | null {
  const m = rawText.trim().match(ADD_VERBS_RE);
  if (!m) return null;
  return rawText.trim().slice(m[0].length).trim();
}

function isMultiItemOrder(rawText: string): boolean {
  const payload = stripLeadingVerbsRaw(rawText);
  if (!payload) return false;
  return splitProductSegments(payload).length > 1 || /,/.test(payload);
}

export function interpretPosCartClient(input: {
  userText: string;
  stocks: PosAiStockItem[];
  cart: PosAiCartItem[];
}): PosAiResult {
  const text = input.userText.trim();
  const n = normalize(text);

  if (/^(vaciar|limpiar|borrar)\s+(el\s+)?carrito/.test(n) || n === 'vaciar carrito') {
    return sanitize(
      { intent: 'CLEAR_CART', actions: [], response_message: 'Carrito vaciado.', trigger_invoice: false },
      input.stocks,
      input.cart
    );
  }

  if (
    /^(finalizar|cerrar|confirmar|emitir|pagar|cobrar)(?:\s+(?:la\s+)?(?:venta|boleta|comanda|compra))?$/.test(n) ||
    /(finalizar|cerrar|confirmar|emitir|pagar|cobrar).*(venta|boleta|comanda|compra)/.test(n)
  ) {
    return sanitize(
      {
        intent: 'SUBMIT_SALE',
        actions: [],
        response_message: 'Procesando cierre de venta…',
        trigger_invoice: input.cart.length > 0,
      },
      input.stocks,
      input.cart
    );
  }

  if (
    /^(quita|quitar|saca|sacar|elimina|eliminar|remover|borra|borrar)(?:\s+(?:el|la|lo|ultim[oa]|eso|producto))?$/i.test(
      text
    )
  ) {
    const last = lastCartProduct(input.stocks, input.cart);
    if (!last) {
      return {
        intent: 'UNKNOWN',
        actions: [],
        response_message: 'El carrito está vacío; no hay nada que quitar.',
        trigger_invoice: false,
      };
    }
    return sanitize(
      {
        intent: 'REMOVE_FROM_CART',
        actions: [{ action: 'REMOVE', product_id: last.id, quantity: 1, reason: 'Quitar último' }],
        response_message: `Quité 1 de ${last.nombre} (último del carrito).`,
        trigger_invoice: false,
      },
      input.stocks,
      input.cart
    );
  }

  const cambiaMatch = n.match(
    /^(?:cambia|cambiar)\s+(.+?)\s+a\s+(\d{1,3}|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)/
  );
  if (cambiaMatch) {
    const product = resolveProduct(cambiaMatch[1], input.stocks, input.cart, true);
    if (!product) {
      return {
        intent: 'UNKNOWN',
        actions: [],
        response_message: `No encontré "${productSearchText(cambiaMatch[1])}" en el carrito.`,
        trigger_invoice: false,
      };
    }
    const qty = parseQuantity(cambiaMatch[2]);
    return sanitize(
      {
        intent: 'ADD_TO_CART',
        actions: [{ action: 'UPDATE', product_id: product.id, quantity: qty, reason: '' }],
        response_message: `${product.nombre} → ${qty} u.`,
        trigger_invoice: false,
      },
      input.stocks,
      input.cart
    );
  }

  const updateMatch = n.match(
    /^(?:deja|dejar|poner|cambia|cambiar|actualiza|actualizar)\s+(?:a\s+)?(\d{1,3}|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(.+)/
  );
  if (updateMatch) {
    const product = resolveProduct(updateMatch[2], input.stocks, input.cart, true);
    if (!product) {
      return {
        intent: 'UNKNOWN',
        actions: [],
        response_message: `No encontré "${productSearchText(updateMatch[2])}" en el carrito.`,
        trigger_invoice: false,
      };
    }
    const qty = parseQuantity(updateMatch[1]);
    return sanitize(
      {
        intent: 'ADD_TO_CART',
        actions: [{ action: 'UPDATE', product_id: product.id, quantity: qty, reason: '' }],
        response_message: `${product.nombre} → ${qty} u.`,
        trigger_invoice: false,
      },
      input.stocks,
      input.cart
    );
  }

  const removeMatch = text.match(
    /^(?:quita|quitar|saca|sacar|elimina|eliminar|remover|borra|borrar)\s+(.+)/i
  );
  if (removeMatch) {
    const tail = removeMatch[1].trim();
    const product = resolveProduct(tail, input.stocks, input.cart, true);
    if (!product) {
      return {
        intent: 'UNKNOWN',
        actions: [],
        response_message: 'No encontré ese producto en el carrito. Di el nombre o "quitar" para el último.',
        trigger_invoice: false,
      };
    }
    const qty = parseQuantity(tail);
    return sanitize(
      {
        intent: 'REMOVE_FROM_CART',
        actions: [{ action: 'REMOVE', product_id: product.id, quantity: qty, reason: '' }],
        response_message: `Quité ${qty} de ${product.nombre}.`,
        trigger_invoice: false,
      },
      input.stocks,
      input.cart
    );
  }

  const addPayload = extractAddPayload(text);
  if (addPayload) {
    const built = buildAddActions(addPayload, input.stocks, input.cart);
    if (built.actions.length === 0) {
      const hint = built.missing.join(', ') || productSearchText(addPayload);
      return {
        intent: 'UNKNOWN',
        actions: [],
        response_message: `No encontré "${hint}" con stock en esta sucursal.`,
        trigger_invoice: false,
      };
    }
    const partial =
      built.missing.length > 0 ? ` No encontré: ${built.missing.join(', ')}.` : '';
    return sanitize(
      {
        intent: 'ADD_TO_CART',
        actions: built.actions,
        response_message: `Agregado: ${built.messages.join(', ')}.${partial}`,
        trigger_invoice: false,
      },
      input.stocks,
      input.cart
    );
  }

  if (isMultiItemOrder(text)) {
    const built = buildAddActions(text, input.stocks, input.cart);
    if (built.actions.length > 0) {
      const partial =
        built.missing.length > 0 ? ` No encontré: ${built.missing.join(', ')}.` : '';
      return sanitize(
        {
          intent: 'ADD_TO_CART',
          actions: built.actions,
          response_message: `Agregado: ${built.messages.join(', ')}.${partial}`,
          trigger_invoice: false,
        },
        input.stocks,
        input.cart
      );
    }
  }

  const direct = findProductByTextClient(text, input.stocks);
  if (direct && n.length >= 4) {
    const qty = parseQuantity(text);
    return sanitize(
      {
        intent: 'ADD_TO_CART',
        actions: [{ action: 'ADD', product_id: direct.id, quantity: qty, reason: '' }],
        response_message: `Agregado ${qty} × ${direct.nombre}.`,
        trigger_invoice: false,
      },
      input.stocks,
      input.cart
    );
  }

  return {
    intent: 'UNKNOWN',
    actions: [],
    response_message:
      'No entendí el pedido. Prueba: "pino, cafe tradicional y 2 queso", "quitar" o "deja 3 cafe tradicional".',
    trigger_invoice: false,
  };
}
