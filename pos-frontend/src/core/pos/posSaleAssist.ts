/** S3 — Asistente de venta en caja (reglas puras, sin LLM en v1). */

export type PosAssistProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
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
