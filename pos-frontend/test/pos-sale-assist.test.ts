import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPosSuggestions,
  cartQuantityForProduct,
  validateAddToCart,
  validateSaleForm,
} from '../src/core/pos/posSaleAssist.ts';

const catalog = [
  { id: 'a', name: 'Empanada pino', price: 1500, stock: 10, categoryId: 'cat-emp', category: 'Empanadas' },
  { id: 'b', name: 'Cafe', price: 2000, stock: 5, categoryId: 'cat-beb', category: 'Bebidas' },
  { id: 'c', name: 'Jugo', price: 1800, stock: 8, categoryId: 'cat-beb', category: 'Bebidas' },
  { id: 'd', name: 'Sin stock', price: 1000, stock: 0, categoryId: 'cat-x', category: 'Otros' },
];

test('validateAddToCart respeta stock incluyendo carrito', () => {
  const cart = [{ id: 'a', quantity: 9 }];
  assert.equal(validateAddToCart({ product: catalog[0], quantity: 1, cart }).ok, true);
  const bad = validateAddToCart({ product: catalog[0], quantity: 2, cart });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.match(bad.message, /Solo puedes agregar 1/);
});

test('buildPosSuggestions prioriza misma familia tras agregar empanada', () => {
  const cart = [{ id: 'a', quantity: 2 }];
  const suggestions = buildPosSuggestions({ cart, products: catalog, max: 4 });
  assert.ok(suggestions.every((s) => s.productId !== 'a'));
  assert.ok(suggestions.every((s) => s.productId !== 'd'));
  const ids = suggestions.map((s) => s.productId);
  assert.ok(ids.includes('b') || ids.includes('c'));
});

test('carrito vacío sugiere por stock', () => {
  const suggestions = buildPosSuggestions({ cart: [], products: catalog, max: 2 });
  assert.equal(suggestions.length, 2);
});

test('validateSaleForm exige carrito y número de venta', () => {
  const fail = validateSaleForm({
    cart: [],
    saleNumber: '',
    requiresDelivery: false,
    deliveryCustomerName: '',
    deliveryPhone: '',
    deliveryAddress: '',
    deliveryAmount: 0,
  });
  assert.equal(fail.ok, false);
  if (!fail.ok) assert.ok(fail.messages.length >= 2);
});

test('cartQuantityForProduct', () => {
  assert.equal(cartQuantityForProduct([{ id: 'x', quantity: 3 }], 'x'), 3);
  assert.equal(cartQuantityForProduct([], 'x'), 0);
});
