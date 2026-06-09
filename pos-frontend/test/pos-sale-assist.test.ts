import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPosQuickActions,
  buildPosSuggestions,
  cartQuantityForProduct,
  enrichPosAiResult,
  formatPosProductOptionLabel,
  formatProductCartLabel,
  normalizePosVoiceCommand,
  posAiInputPlaceholder,
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

test('formatPosProductOptionLabel muestra variante carne o familiar', () => {
  assert.match(
    formatPosProductOptionLabel(
      { name: 'Hamburguesa Italiana', category: 'Hamburguesa Carne', price: 3500 },
      [{ nombre: 'Hamburguesa Italiana', precio: 3500 }, { nombre: 'Hamburguesa Italiana', precio: 3500 }]
    ),
    /Carne/
  );
  assert.match(
    formatPosProductOptionLabel(
      { name: 'Pizza Española', price: 13500 },
      [{ nombre: 'Pizza Española', precio: 7000 }, { nombre: 'Pizza Española', precio: 13500 }]
    ),
    /Familiar/
  );
  assert.match(
    formatPosProductOptionLabel(
      { name: 'Hamburguesa Italiana', category: 'Hamburguesas › Carne', price: 3500 },
      [{ nombre: 'Hamburguesa Italiana', precio: 3500 }, { nombre: 'Hamburguesa Italiana', precio: 3500 }]
    ),
    /Carne/
  );
});

test('formatProductCartLabel incluye categoria en carrito', () => {
  assert.equal(
    formatProductCartLabel({ name: 'Hamburguesa Italiana', category: 'Hamburguesa Pollo' }),
    'Hamburguesa Italiana — Hamburguesa Pollo'
  );
});

test('buildPosQuickActions usa productos del tenant en sesion', () => {
  const fusionCatalog = [
    { id: 'hb', name: 'Hamburguesa Italiana', price: 3500, stock: 10, category: 'Hamburguesa Carne' },
    { id: 'beb', name: 'Coca Cola 1L', price: 1700, stock: 5, category: 'Bebidas' },
  ];
  const actions = buildPosQuickActions(fusionCatalog);
  assert.equal(actions.length, 5);
  assert.deepEqual(
    actions.map((a) => a.label),
    ['buscar', 'agregar', 'quitar', 'ayuda', 'vaciar carrito']
  );
  assert.match(actions[0].command, /buscar Hamburguesa Italiana/);
  assert.match(actions[1].command, /agrega Hamburguesa Italiana/);
  assert.match(posAiInputPlaceholder(fusionCatalog), /buscar Hamburguesa Italiana/);
});

test('enrichPosAiResult completa categoria desde catalogo local', () => {
  const result = enrichPosAiResult(
    {
      intent: 'UNKNOWN',
      actions: [],
      response_message: 'Elige',
      trigger_invoice: false,
      product_options: [
        {
          id: 'hb-p',
          nombre: 'Hamburguesa Italiana',
          precio: 3500,
          stock_actual: 20,
        },
      ],
    },
    [{ id: 'hb-p', category: 'Hamburguesas › Pollo', sku: 'HB-P' }]
  );
  assert.equal(result.product_options?.[0]?.categoria, 'Hamburguesas › Pollo');
  assert.equal(result.product_options?.[0]?.sku, 'HB-P');
});

test('normalizePosVoiceCommand corrige STT y agrega verbo', () => {
  assert.equal(
    normalizePosVoiceCommand('pizza pepperoni familiar'),
    'agrega pizza pepperonni familiar'
  );
  assert.equal(
    normalizePosVoiceCommand('agrega pizza pepperoni familiar'),
    'agrega pizza pepperonni familiar'
  );
});
