/** S3 — Asistente de venta en caja (reglas puras, sin LLM en v1). */

import { categoryDisplayShort } from '@/core/utils/category-filter';
import type { PosAiResult } from './posAiTypes';

export type PosAssistProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku?: string;
  categoryId?: string;
  category?: string;
};

export type PosAssistCartLine = { id: string; quantity: number };

export type PosSuggestion = {
  productId: string;
  name: string;
  price: number;
  stock: number;
  reason: 'misma_familia' | 'complemento' | 'stock_alto';
};

export function cartQuantityForProduct(cart: PosAssistCartLine[], productId: string): number {
  return cart.find((l) => l.id === productId)?.quantity ?? 0;
}

export function validateAddToCart(input: {
  product: PosAssistProduct;
  quantity: number;
  cart: PosAssistCartLine[];
}): { ok: true } | { ok: false; message: string } {
  const qty = Math.floor(Number(input.quantity));
  if (!Number.isFinite(qty) || qty < 1) {
    return { ok: false, message: 'La cantidad debe ser al menos 1.' };
  }
  const stock = Number(input.product.stock ?? 0);
  if (stock <= 0) {
    return { ok: false, message: `"${input.product.name}" no tiene stock en esta sucursal.` };
  }
  const inCart = cartQuantityForProduct(input.cart, input.product.id);
  if (inCart + qty > stock) {
    const rest = Math.max(0, stock - inCart);
    return {
      ok: false,
      message:
        rest > 0
          ? `Solo puedes agregar ${rest} u. más de "${input.product.name}" (stock ${stock}).`
          : `Ya tienes todo el stock de "${input.product.name}" en el carrito.`,
    };
  }
  return { ok: true };
}

function normalizeCategoryToken(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/** Sugerencias rápidas según carrito y catálogo con stock. */
export function buildPosSuggestions(input: {
  cart: PosAssistCartLine[];
  products: PosAssistProduct[];
  max?: number;
}): PosSuggestion[] {
  const max = input.max ?? 6;
  const inCart = new Set(input.cart.map((l) => l.id));
  const available = input.products.filter((p) => Number(p.stock) > 0 && !inCart.has(p.id));
  if (available.length === 0) return [];

  const lastLine = input.cart[input.cart.length - 1];
  const lastProduct = lastLine
    ? input.products.find((p) => p.id === lastLine.id)
    : undefined;
  const lastCatId = lastProduct?.categoryId;
  const lastCatName = normalizeCategoryToken(lastProduct?.category);

  const scored = available.map((p) => {
    let score = Number(p.stock);
    let reason: PosSuggestion['reason'] = 'stock_alto';

    if (lastCatId && p.categoryId === lastCatId) {
      score += 1000;
      reason = 'misma_familia';
    } else if (lastCatName && normalizeCategoryToken(p.category) === lastCatName) {
      score += 500;
      reason = 'misma_familia';
    } else if (input.cart.length > 0) {
      score += 10;
      reason = 'complemento';
    }

    return { product: p, score, reason };
  });

  scored.sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, 'es'));

  return scored.slice(0, max).map(({ product, reason }) => ({
    productId: product.id,
    name: product.name,
    price: product.price,
    stock: product.stock,
    reason,
  }));
}

export function validateSaleForm(input: {
  cart: PosAssistCartLine[];
  saleNumber: string;
  requiresDelivery: boolean;
  deliveryCustomerName: string;
  deliveryPhone: string;
  deliveryAddress: string;
  deliveryAmount: number;
}): { ok: true } | { ok: false; messages: string[] } {
  const messages: string[] = [];
  if (input.cart.length === 0) messages.push('Agrega al menos un producto al carrito.');
  if (!input.saleNumber.trim()) {
    messages.push('Ingresa el número de venta (efectivo o POS) antes de confirmar.');
  }
  if (input.requiresDelivery) {
    if (!input.deliveryCustomerName.trim()) messages.push('Falta nombre del cliente (delivery).');
    if (!input.deliveryPhone.trim()) messages.push('Falta teléfono (delivery).');
    if (!input.deliveryAddress.trim()) messages.push('Falta dirección (delivery).');
    if (input.deliveryAmount < 0) messages.push('El monto delivery no puede ser negativo.');
  }
  if (messages.length > 0) return { ok: false, messages };
  return { ok: true };
}

export function suggestionReasonLabel(reason: PosSuggestion['reason']): string {
  switch (reason) {
    case 'misma_familia':
      return 'Misma familia';
    case 'complemento':
      return 'Sugerido';
    default:
      return 'Stock disponible';
  }
}

export type PosQuickAction = { label: string; command: string };

function sampleProductLabel(products: PosAssistProduct[]): string {
  const name = products.find((p) => p.stock > 0)?.name?.trim();
  if (!name) return 'producto';
  return name.split(/\s+/).slice(0, 3).join(' ');
}

/** Chips de búsqueda rápida — usan el catálogo con stock de la sucursal activa. */
export function buildPosQuickActions(products: PosAssistProduct[]): PosQuickAction[] {
  const sample = sampleProductLabel(products);
  return [
    { label: 'buscar', command: `buscar ${sample}` },
    { label: 'agregar', command: `agrega ${sample}` },
    { label: 'quitar', command: 'quitar' },
    { label: 'ayuda', command: 'ayuda' },
    { label: 'vaciar carrito', command: 'vaciar carrito' },
  ];
}

type ProductLabelInput = {
  name: string;
  category?: string;
  price?: number;
  sku?: string;
};

/** Etiqueta legible en carrito y listados (incluye variante: carne, familiar, etc.). */
export function formatProductCartLabel(input: ProductLabelInput): string {
  const name = input.name.trim();
  const cat = categoryDisplayShort(input.category);
  if (cat) {
    const catNorm = cat.toLowerCase();
    const nameNorm = name.toLowerCase();
    if (!nameNorm.includes(catNorm) && !catNorm.includes(nameNorm)) {
      return `${name} — ${cat}`;
    }
  }
  return name;
}

type OptionLabelPeer = { nombre: string; precio: number; categoria?: string };

/** Título en lista «Elige producto» — siempre distingue variantes (Carne, Pollo, etc.). */
export function formatPosProductOptionLabel(
  option: ProductLabelInput,
  peers: OptionLabelPeer[]
): string {
  const name = option.name.trim();
  const cat = categoryDisplayShort(option.category);
  const price = option.price ?? 0;

  if (cat) {
    const catNorm = cat.toLowerCase();
    const nameNorm = name.toLowerCase();
    if (!nameNorm.includes(catNorm)) {
      return `${name} — ${cat}`;
    }
  }

  const sameName = peers.filter((p) => p.nombre.trim().toLowerCase() === name.toLowerCase());
  if (sameName.length > 1) {
    if (sameName.length === 2) {
      const sorted = [...sameName].sort((a, b) => a.precio - b.precio);
      if (sorted[0].precio !== sorted[1].precio) {
        const isLarge = sorted[sorted.length - 1].precio === price;
        return `${name} — ${isLarge ? 'Familiar' : 'Personal'}`;
      }
    }
    if (option.sku?.trim()) return `${name} (${option.sku.trim()})`;
    return `${name} — $${price.toLocaleString('es-CL')}`;
  }

  if (option.sku?.trim()) return `${name} (${option.sku.trim()})`;
  return name;
}

/** Completa categoría/SKU en opciones devueltas por el API (a veces vienen vacías). */
export function enrichPosAiResult(
  result: PosAiResult,
  catalog: Array<{ id: string; category?: string; sku?: string }>
): PosAiResult {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  if (!result.product_options?.length) return result;
  return {
    ...result,
    product_options: result.product_options.map((opt) => {
      const local = byId.get(opt.id);
      return {
        ...opt,
        categoria: opt.categoria?.trim() || local?.category || opt.categoria,
        sku: opt.sku?.trim() || local?.sku || opt.sku,
      };
    }),
  };
}

export function formatPosHelpMessage(sampleProductName?: string): string {
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

export function posAiInputPlaceholder(products: PosAssistProduct[]): string {
  const sample = sampleProductLabel(products);
  return `Ej: "buscar ${sample}" o "agrega ${sample}"`;
}

const VOICE_ORDER_VERBS_RE =
  /^(?:agrega|agregar|anade|anadir|suma|sumar|pon|poner|mete|meter|dame|dar|quiero|necesito|buscar|busca|quita|quitar)\s+/i;

/** Corrige transcripción de voz (STT) y añade verbo si el usuario solo dice el producto. */
export function normalizePosVoiceCommand(raw: string): string {
  let t = raw.trim().replace(/\s+/g, ' ');
  if (!t) return t;

  t = t.replace(/\bpeperoni\b/gi, 'pepperonni');
  t = t.replace(/\bpepperoni\b/gi, 'pepperonni');
  t = t.replace(/\bpeperon\b/gi, 'pepperonni');
  t = t.replace(/\bamburguesa\b/gi, 'hamburguesa');
  t = t.replace(/\bhambueguesa\b/gi, 'hamburguesa');

  if (!VOICE_ORDER_VERBS_RE.test(t)) {
    const n = t.toLowerCase();
    if (
      /\b(pizza|hamburguesa|empanada|cafe|bebida|jugo|cerveza|combo|sandwich)\b/.test(n) ||
      /^\d{1,3}\s+\S/.test(n)
    ) {
      t = `agrega ${t}`;
    }
  }

  return t;
}
