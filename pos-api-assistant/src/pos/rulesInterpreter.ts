import type {
  PosAiProductOption,
  PosAiResult,
  PosCartItem,
  PosInterpretInput,
  PosStockItem,
} from './types.js';
import { sanitizePosAiResult } from './sanitizeResult.js';

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
  'sin',
  'extra',
  'doble',
  'simple',
]);

function stripPreparationNotes(raw: string): string {
  return normalize(raw).replace(/\bsin\s+\w+/g, ' ').replace(/\s+/g, ' ').trim();
}

const SEARCH_VERBS_RE = /^(?:buscar|busca|stock)\s+/i;

const VARIANT_WORDS = new Set([
  'pollo',
  'carne',
  'vacuno',
  'cerdo',
  'pescado',
  'vegetariana',
  'veggie',
  'familiar',
  'personal',
  'individual',
  'grande',
  'mediana',
  'pequena',
  'mini',
  'xl',
]);

const SIZE_LARGE_HINTS = new Set(['familiar', 'grande', 'xl', 'familia']);
const SIZE_SMALL_HINTS = new Set(['personal', 'individual', 'mini', 'pequena', 'mediana']);

/** Palabras genéricas que matchean muchos productos (p. ej. todas las pizzas). */
const GENERIC_PRODUCT_WORDS = new Set([
  'pizza',
  'hamburguesa',
  'hamburger',
  'empanada',
  'bebida',
  'cafe',
  'cerveza',
  'jugo',
  'combo',
  'menu',
  'sandwich',
  'plato',
  'roll',
  'torta',
  'postre',
  'ensalada',
]);

const ADD_VERBS_RE =
  /^(?:agrega|agregar|anade|anadir|suma|sumar|pon|poner|mete|meter|dame|dar|quiero|necesito)\s+/i;
const REMOVE_VERBS_RE =
  /^(?:quita|quitar|saca|sacar|elimina|eliminar|remover|borra|borrar)\s+/i;
const UPDATE_VERBS_RE =
  /^(?:deja|dejar|poner|cambia|cambiar|actualiza|actualizar)\s+/i;

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
  return stripPreparationNotes(text)
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

function stripLeadingVerbsRaw(raw: string): string {
  return raw
    .trim()
    .replace(SEARCH_VERBS_RE, '')
    .replace(ADD_VERBS_RE, '')
    .replace(REMOVE_VERBS_RE, '')
    .replace(UPDATE_VERBS_RE, '')
    .trim();
}

function isSearchOnlyQuery(raw: string): boolean {
  return SEARCH_VERBS_RE.test(raw.trim());
}

function productSearchText(raw: string): string {
  return meaningfulTokens(stripLeadingVerbsRaw(raw)).join(' ');
}

function splitProductSegments(raw: string): string[] {
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

function tokensRoughMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (b.startsWith(a) || a.startsWith(b)) return true;
  if (a.length >= 4 && b.length >= 4) {
    if (b.startsWith('h') && (b.slice(1) === a || b.slice(1).startsWith(a) || a.startsWith(b.slice(1)))) {
      return true;
    }
    if (a.startsWith('h') && (a.slice(1) === b || a.slice(1).startsWith(b) || b.startsWith(a.slice(1)))) {
      return true;
    }
  }
  return false;
}

function tokenSpellingVariants(token: string): string[] {
  const t = singularize(token);
  const variants = new Set<string>([t]);
  if (t.endsWith('nn')) variants.add(t.slice(0, -1));
  if (t.endsWith('oni')) variants.add(`${t}n`);
  if (t.endsWith('onni')) variants.add(t.slice(0, -1));
  return [...variants];
}

function tokenMatchesName(token: string, name: string, sku: string): boolean {
  const nameParts = name.split(' ').map(singularize);
  for (const variant of tokenSpellingVariants(token)) {
    if (name.includes(variant) || sku.includes(variant)) return true;
    if (nameParts.some((part) => tokensRoughMatch(variant, part))) return true;
  }
  return false;
}

type ScoredProduct = { p: PosStockItem; score: number };

function scoreProduct(text: string, p: PosStockItem): ScoredProduct | null {
  const cleaned = productSearchText(text);
  if (!cleaned) return null;

  const tokens = meaningfulTokens(text);
  if (tokens.length === 0) return null;

  const name = normalize(p.nombre);
  const sku = normalize(p.sku);
  const category = normalize(p.categoria ?? '');

  let matched = 0;
  let categoryMatched = 0;
  for (const t of tokens) {
    if (tokenMatchesName(t, name, sku)) matched++;
    if (category && tokenMatchesName(t, category, '')) categoryMatched++;
  }
  if (matched === 0) return null;

  let score = matched * 100;
  if (categoryMatched > 0) score += categoryMatched * 200;
  if (name.includes(cleaned)) score += 500;
  if (tokens.length >= 2 && matched >= tokens.length) score += 200;
  if (sku && cleaned.includes(sku)) score += 150;
  const lastToken = tokens[tokens.length - 1];
  if (lastToken && name.endsWith(lastToken)) score += 80;

  return { p, score };
}

function rankProducts(text: string, stocks: PosStockItem[]): ScoredProduct[] {
  return stocks
    .map((p) => scoreProduct(text, p))
    .filter((x): x is ScoredProduct => x !== null)
    .sort((a, b) => b.score - a.score);
}

function specificTokens(text: string): string[] {
  return meaningfulTokens(text).filter(
    (t) => !GENERIC_PRODUCT_WORDS.has(t) && !VARIANT_WORDS.has(t)
  );
}

/** Si el usuario dice «pizza pepperonni», no elegir otra pizza solo por el token «pizza». */
function categoryTokenMatches(categoria: string, variant: string): boolean {
  const cat = normalize(categoria);
  const v = singularize(normalize(variant));
  if (!cat || !v) return false;
  if (cat.includes(v)) return true;
  const parts = cat.split(/\s+/).filter(Boolean);
  return parts.some((part) => part === v || part.endsWith(v));
}

function variantTokensInText(text: string): string[] {
  return meaningfulTokens(text).filter((t) => VARIANT_WORDS.has(t));
}

function narrowRankedBySpecificTokens(text: string, ranked: ScoredProduct[]): ScoredProduct[] {
  const specific = specificTokens(text);
  if (specific.length === 0) return ranked;

  const narrowed = ranked.filter(({ p }) => {
    const name = normalize(p.nombre);
    const cat = normalize(p.categoria ?? '');
    const sku = normalize(p.sku);
    return specific.every(
      (t) => tokenMatchesName(t, name, sku) || (cat.length > 0 && tokenMatchesName(t, cat, ''))
    );
  });
  return narrowed.length > 0 ? narrowed : ranked;
}

/** Filtra por subcategoría (carne, pollo, familiar…) aunque el nombre del producto sea igual. */
function narrowRankedByVariantTokens(text: string, ranked: ScoredProduct[]): ScoredProduct[] {
  const variants = variantTokensInText(text);
  if (variants.length === 0) return ranked;

  const narrowed = ranked.filter(({ p }) => {
    const name = normalize(p.nombre);
    return variants.every(
      (v) => categoryTokenMatches(p.categoria ?? '', v) || name.includes(v)
    );
  });
  return narrowed.length > 0 ? narrowed : ranked;
}

function pickAmongSameVariant(text: string, items: PosStockItem[]): PosStockItem {
  const tokens = meaningfulTokens(text);
  const wantsLarge = tokens.some((t) => SIZE_LARGE_HINTS.has(t));
  const wantsSmall = tokens.some((t) => SIZE_SMALL_HINTS.has(t));
  const sorted = [...items].sort((a, b) => a.precio - b.precio);
  if (wantsLarge) return sorted[sorted.length - 1];
  if (wantsSmall) return sorted[0];
  return sorted[0];
}

function filterAmbiguousOptions(text: string, options: PosStockItem[]): PosStockItem[] {
  const variants = variantTokensInText(text);
  if (variants.length === 0) return options;
  const filtered = options.filter((p) =>
    variants.some((v) => categoryTokenMatches(p.categoria ?? '', v))
  );
  return filtered.length > 0 ? filtered : options;
}

function resolvePrimaryProductName(text: string, ranked: ScoredProduct[]): string {
  const specific = specificTokens(text);
  if (specific.length > 0) {
    const topScore = ranked[0]?.score ?? 0;
    const tier = ranked.filter((r) => topScore - r.score <= 80);
    for (const { p } of tier) {
      const name = normalize(p.nombre);
      const sku = normalize(p.sku);
      if (specific.every((t) => tokenMatchesName(t, name, sku))) return name;
    }
  }
  return normalize(ranked[0]?.p.nombre ?? '');
}

type ProductPickResult =
  | { ok: true; product: PosStockItem }
  | { ok: false; reason: 'none' }
  | { ok: false; reason: 'ambiguous'; options: PosStockItem[] };

function pickByVariantTokens(text: string, ranked: ScoredProduct[]): PosStockItem | null {
  const variants = variantTokensInText(text);
  if (variants.length === 0) return null;

  const hits = ranked.filter(({ p }) => {
    const name = normalize(p.nombre);
    return variants.some((v) => categoryTokenMatches(p.categoria ?? '', v) || name.includes(v));
  });
  if (hits.length === 0) return null;
  if (hits.length === 1) return hits[0].p;

  const exact = hits.filter(({ p }) =>
    variants.some((v) => categoryTokenMatches(p.categoria ?? '', v))
  );
  if (exact.length === 1) return exact[0].p;
  if (exact.length > 1) {
    return pickAmongSameVariant(text, exact.map((e) => e.p));
  }

  if (hits[0].score - (hits[1]?.score ?? 0) >= 50) return hits[0].p;
  return null;
}

/** Mismo nombre y distinto precio: «familiar» → mayor precio; «personal» → menor. */
function pickBySizePriceHint(text: string, ranked: ScoredProduct[]): PosStockItem | null {
  const tokens = meaningfulTokens(text);
  const wantsLarge = tokens.some((t) => SIZE_LARGE_HINTS.has(t));
  const wantsSmall = tokens.some((t) => SIZE_SMALL_HINTS.has(t));
  if (!wantsLarge && !wantsSmall) return null;

  const topName = resolvePrimaryProductName(text, ranked);
  const sameName = ranked.filter((r) => normalize(r.p.nombre) === topName);
  if (sameName.length < 2) return null;

  const byPrice = [...sameName].sort((a, b) => a.p.precio - b.p.precio);
  if (wantsLarge) return byPrice[byPrice.length - 1].p;
  return byPrice[0].p;
}

function pickProduct(text: string, stocks: PosStockItem[]): ProductPickResult {
  let ranked = rankProducts(text, stocks);
  ranked = narrowRankedBySpecificTokens(text, ranked);
  ranked = narrowRankedByVariantTokens(text, ranked);
  if (ranked.length === 0) return { ok: false, reason: 'none' };

  const variantProduct = pickByVariantTokens(text, ranked);
  if (variantProduct) return { ok: true, product: variantProduct };

  const sizeProduct = pickBySizePriceHint(text, ranked);
  if (sizeProduct) return { ok: true, product: sizeProduct };

  const top = ranked[0];
  const second = ranked[1];
  if (!second || top.score - second.score >= 80) {
    return { ok: true, product: top.p };
  }

  const close = ranked.filter((r) => top.score - r.score <= 80);
  if (close.length >= 2) {
    return {
      ok: false,
      reason: 'ambiguous',
      options: filterAmbiguousOptions(text, close.map((c) => c.p)),
    };
  }

  if (top.score > second.score) return { ok: true, product: top.p };
  return {
    ok: false,
    reason: 'ambiguous',
    options: filterAmbiguousOptions(text, ranked.slice(0, 8).map((t) => t.p)),
  };
}

function findProductByText(text: string, stocks: PosStockItem[]): PosStockItem | null {
  const pick = pickProduct(text, stocks);
  return pick.ok ? pick.product : null;
}

function formatProductOption(p: PosStockItem): string {
  const cat = p.categoria?.trim();
  return cat ? `${p.nombre} (${cat})` : p.nombre;
}

function toProductOptions(items: PosStockItem[], limit = 8): PosAiProductOption[] {
  const seen = new Set<string>();
  const out: PosAiProductOption[] = [];
  for (const p of items) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      sku: p.sku,
      precio: p.precio,
      stock_actual: p.stock_actual,
    });
    if (out.length >= limit) break;
  }
  return out;
}

function listPickResponse(input: {
  message: string;
  options: PosStockItem[];
  quantity?: number;
}): PosAiResult {
  return {
    intent: 'UNKNOWN',
    actions: [],
    response_message: input.message,
    trigger_invoice: false,
    product_options: toProductOptions(input.options),
    pending_quantity: input.quantity,
  };
}

function formatPosHelpMessage(sampleProductName?: string): string {
  const sample = sampleProductName?.trim() || 'producto';
  return (
    `Comandos POS IA: ` +
    `buscar ${sample} (ver opciones) · ` +
    `agrega ${sample} (sumar al carrito) · ` +
    `quitar (último ítem) · ` +
    `deja N ${sample} (cambiar cantidad) · ` +
    `vaciar carrito · ` +
    `finalizar venta. ` +
    `Si hay variantes con el mismo nombre, indica cuál (ej. de pollo o de carne).`
  );
}

function searchListMessage(options: PosStockItem[], query: string): string {
  if (options.length === 0) {
    return `No encontré «${query}» con stock en esta sucursal.`;
  }
  return 'Elige un producto de la lista o di «agrega …» con la variante (ej. de pollo).';
}

function stocksInCart(stocks: PosStockItem[], cart: PosCartItem[]): PosStockItem[] {
  const ids = new Set(cart.map((c) => c.id_producto));
  return stocks.filter((s) => ids.has(s.id));
}

function lastCartProduct(stocks: PosStockItem[], cart: PosCartItem[]): PosStockItem | null {
  for (let i = cart.length - 1; i >= 0; i--) {
    const found = stocks.find((s) => s.id === cart[i].id_producto);
    if (found) return found;
  }
  return null;
}

function resolveProduct(
  text: string,
  stocks: PosStockItem[],
  cart: PosCartItem[],
  preferCart: boolean
): ProductPickResult {
  if (preferCart) {
    const inCart = pickProduct(text, stocksInCart(stocks, cart));
    if (inCart.ok || inCart.reason === 'ambiguous') return inCart;
  }
  return pickProduct(text, stocks);
}

function buildAddActions(
  payload: string,
  stocks: PosStockItem[],
  cart: PosCartItem[]
): {
  actions: PosAiResult['actions'];
  messages: string[];
  missing: string[];
  ambiguous: PosStockItem[][];
} {
  const segments = splitProductSegments(payload);
  const actions: PosAiResult['actions'] = [];
  const messages: string[] = [];
  const missing: string[] = [];
  const ambiguous: PosStockItem[][] = [];

  for (const segment of segments) {
    const pick = resolveProduct(segment, stocks, cart, false);
    if (pick.ok) {
      const qty = parseQuantity(segment);
      actions.push({
        action: 'ADD',
        product_id: pick.product.id,
        quantity: qty,
        reason: `Agregar ${pick.product.nombre}`,
      });
      messages.push(`${qty} × ${formatProductOption(pick.product)}`);
      continue;
    }
    if (pick.reason === 'ambiguous') {
      ambiguous.push(pick.options);
      continue;
    }
    missing.push(productSearchText(segment) || segment);
  }

  return { actions, messages, missing, ambiguous };
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

export function interpretPosCartRules(input: PosInterpretInput): PosAiResult {
  const text = input.userText.trim();
  const n = normalize(text);
  const sampleName = input.stocks.find((s) => s.stock_actual > 0)?.nombre;

  if (/^(ayuda|help|menu|comandos)$/.test(n)) {
    return {
      intent: 'UNKNOWN',
      actions: [],
      response_message: formatPosHelpMessage(sampleName),
      trigger_invoice: false,
    };
  }

  if (/^(vaciar|limpiar|borrar)\s+(el\s+)?carrito/.test(n) || n === 'vaciar carrito') {
    return sanitizePosAiResult(
      {
        intent: 'CLEAR_CART',
        actions: [],
        response_message: 'Carrito vaciado.',
        trigger_invoice: false,
      },
      input.stocks,
      input.cart
    );
  }

  if (
    /^(finalizar|cerrar|confirmar|emitir|pagar|cobrar)(?:\s+(?:la\s+)?(?:venta|boleta|comanda|compra))?$/.test(n) ||
    /(finalizar|cerrar|confirmar|emitir|pagar|cobrar).*(venta|boleta|comanda|compra)/.test(n)
  ) {
    return sanitizePosAiResult(
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
    return sanitizePosAiResult(
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
    const pick = resolveProduct(cambiaMatch[1], input.stocks, input.cart, true);
    if (!pick.ok) {
      if (pick.reason === 'ambiguous') {
        return listPickResponse({
          message: 'Elige el producto correcto en la lista.',
          options: pick.options,
          quantity: parseQuantity(cambiaMatch[2]),
        });
      }
      return {
        intent: 'UNKNOWN',
        actions: [],
        response_message: `No encontré "${productSearchText(cambiaMatch[1])}" en el carrito.`,
        trigger_invoice: false,
      };
    }
    const qty = parseQuantity(cambiaMatch[2]);
    return sanitizePosAiResult(
      {
        intent: 'ADD_TO_CART',
        actions: [{ action: 'UPDATE', product_id: pick.product.id, quantity: qty, reason: '' }],
        response_message: `${formatProductOption(pick.product)} → ${qty} u.`,
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
    const pick = resolveProduct(updateMatch[2], input.stocks, input.cart, true);
    if (!pick.ok) {
      if (pick.reason === 'ambiguous') {
        return listPickResponse({
          message: 'Elige el producto correcto en la lista.',
          options: pick.options,
          quantity: parseQuantity(updateMatch[1]),
        });
      }
      return {
        intent: 'UNKNOWN',
        actions: [],
        response_message: `No encontré "${productSearchText(updateMatch[2])}" en el carrito.`,
        trigger_invoice: false,
      };
    }
    const qty = parseQuantity(updateMatch[1]);
    return sanitizePosAiResult(
      {
        intent: 'ADD_TO_CART',
        actions: [{ action: 'UPDATE', product_id: pick.product.id, quantity: qty, reason: '' }],
        response_message: `${formatProductOption(pick.product)} → ${qty} u.`,
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
    const pick = resolveProduct(tail, input.stocks, input.cart, true);
    if (!pick.ok) {
      if (pick.reason === 'ambiguous') {
        return listPickResponse({
          message: 'Elige el producto correcto en la lista.',
          options: pick.options,
          quantity: parseQuantity(tail),
        });
      }
      return {
        intent: 'UNKNOWN',
        actions: [],
        response_message: 'No encontré ese producto en el carrito. Di el nombre o "quitar" para el último.',
        trigger_invoice: false,
      };
    }
    const qty = parseQuantity(tail);
    return sanitizePosAiResult(
      {
        intent: 'REMOVE_FROM_CART',
        actions: [{ action: 'REMOVE', product_id: pick.product.id, quantity: qty, reason: '' }],
        response_message: `Quité ${qty} de ${formatProductOption(pick.product)}.`,
        trigger_invoice: false,
      },
      input.stocks,
      input.cart
    );
  }

  if (isSearchOnlyQuery(text)) {
    const query = stripLeadingVerbsRaw(text);
    const ranked = rankProducts(query, input.stocks).map((r) => r.p);
    return listPickResponse({
      message: searchListMessage(ranked, productSearchText(query) || query),
      options: ranked,
    });
  }

  const addPayload = extractAddPayload(text);
  if (addPayload) {
    const built = buildAddActions(addPayload, input.stocks, input.cart);
    if (built.actions.length === 0) {
      if (built.ambiguous.length > 0) {
        return listPickResponse({
          message: 'Elige el producto correcto en la lista.',
          options: built.ambiguous[0],
          quantity: parseQuantity(addPayload),
        });
      }
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
    return sanitizePosAiResult(
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
    if (built.actions.length === 0 && built.ambiguous.length > 0) {
      return listPickResponse({
        message: 'Elige el producto correcto en la lista.',
        options: built.ambiguous[0],
        quantity: parseQuantity(text),
      });
    }
    if (built.actions.length > 0) {
      const partial =
        built.missing.length > 0 ? ` No encontré: ${built.missing.join(', ')}.` : '';
      return sanitizePosAiResult(
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

  const directPick = pickProduct(text, input.stocks);
  if (directPick.ok && n.length >= 4) {
    const qty = parseQuantity(text);
    return sanitizePosAiResult(
      {
        intent: 'ADD_TO_CART',
        actions: [{ action: 'ADD', product_id: directPick.product.id, quantity: qty, reason: '' }],
        response_message: `Agregado ${qty} × ${formatProductOption(directPick.product)}.`,
        trigger_invoice: false,
      },
      input.stocks,
      input.cart
    );
  }
  if (!directPick.ok && directPick.reason === 'ambiguous' && n.length >= 4) {
    return listPickResponse({
      message: 'Elige el producto correcto en la lista.',
      options: directPick.options,
      quantity: parseQuantity(text),
    });
  }

  return {
    intent: 'UNKNOWN',
    actions: [],
    response_message: `No entendí el pedido. Escribe «ayuda» o prueba «buscar ${sampleName ?? 'producto'}».`,
    trigger_invoice: false,
  };
}

