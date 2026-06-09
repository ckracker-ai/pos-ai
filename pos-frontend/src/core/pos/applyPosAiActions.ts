import { formatProductCartLabel, validateAddToCart, type PosAssistCartLine } from './posSaleAssist';
import type { PosAiCartLine, PosAiProduct, PosAiResult } from './posAiTypes';

export type ApplyPosAiOutcome = {
  cart: PosAiCartLine[];
  message: string;
  shouldSubmitSale: boolean;
  cleared: boolean;
};

function lineFromProduct(product: PosAiProduct, quantity: number): PosAiCartLine {
  return {
    id: product.id,
    name: formatProductCartLabel({
      name: product.name,
      category: product.category,
      price: product.price,
      sku: product.sku,
    }),
    quantity,
    unitPrice: product.price,
    total: product.price * quantity,
  };
}

export function applyPosAiActions(input: {
  result: PosAiResult;
  cart: PosAiCartLine[];
  products: PosAiProduct[];
}): ApplyPosAiOutcome {
  const productById = new Map(input.products.map((p) => [p.id, p]));

  if (input.result.intent === 'CLEAR_CART') {
    return {
      cart: [],
      message: input.result.response_message || 'Carrito vaciado.',
      shouldSubmitSale: false,
      cleared: true,
    };
  }

  if (input.result.intent === 'SUBMIT_SALE') {
    return {
      cart: input.cart,
      message: input.result.response_message || 'Finalizando venta…',
      shouldSubmitSale: input.result.trigger_invoice && input.cart.length > 0,
      cleared: false,
    };
  }

  let cart = [...input.cart];
  const notes: string[] = [];

  for (const act of input.result.actions) {
    const product = productById.get(act.product_id);
    if (!product) {
      notes.push('Producto no disponible en catálogo.');
      continue;
    }

    const assistCart: PosAssistCartLine[] = cart.map((l) => ({
      id: l.id,
      quantity: l.quantity,
    }));

    if (act.action === 'REMOVE') {
      const existing = cart.find((l) => l.id === act.product_id);
      if (!existing) {
        notes.push(`"${product.name}" no está en el carrito.`);
        continue;
      }
      const removeQty = Math.max(1, Math.floor(act.quantity) || 1);
      if (existing.quantity <= removeQty) {
        cart = cart.filter((l) => l.id !== act.product_id);
      } else {
        cart = cart.map((l) =>
          l.id === act.product_id
            ? lineFromProduct(product, l.quantity - removeQty)
            : l
        );
      }
      continue;
    }

    if (act.action === 'UPDATE') {
      const target = Math.max(1, Math.floor(act.quantity) || 1);
      const check = validateAddToCart({
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          stock: product.stock,
        },
        quantity: target,
        cart: assistCart.filter((l) => l.id !== act.product_id),
      });
      if (!check.ok) {
        notes.push(check.message);
        continue;
      }
      const idx = cart.findIndex((l) => l.id === act.product_id);
      const line = lineFromProduct(product, target);
      if (idx >= 0) cart[idx] = line;
      else cart.push(line);
      continue;
    }

    // ADD
    const addQty = Math.max(1, Math.floor(act.quantity) || 1);
    const check = validateAddToCart({
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        stock: product.stock,
      },
      quantity: addQty,
      cart: assistCart,
    });
    if (!check.ok) {
      notes.push(check.message);
      continue;
    }
    const existing = cart.find((l) => l.id === act.product_id);
    if (existing) {
      cart = cart.map((l) =>
        l.id === act.product_id
          ? lineFromProduct(product, l.quantity + addQty)
          : l
      );
    } else {
      cart.push(lineFromProduct(product, addQty));
    }
  }

  const message = [input.result.response_message, ...notes].filter(Boolean).join(' ');

  return {
    cart,
    message: message || 'Listo.',
    shouldSubmitSale: false,
    cleared: false,
  };
}
