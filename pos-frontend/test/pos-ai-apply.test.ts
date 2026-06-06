import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyPosAiActions } from '../src/core/pos/applyPosAiActions';

const products = [
  { id: 'p1', name: 'Empanada de queso', sku: 'EMP-Q', price: 1500, stock: 10 },
  { id: 'p2', name: 'Coca Cola', sku: 'BEB-C', price: 1200, stock: 5 },
];

describe('applyPosAiActions', () => {
  it('ADD agrega línea al carrito', () => {
    const out = applyPosAiActions({
      result: {
        intent: 'ADD_TO_CART',
        actions: [{ action: 'ADD', product_id: 'p1', quantity: 2 }],
        response_message: 'Ok',
        trigger_invoice: false,
      },
      cart: [],
      products,
    });
    assert.equal(out.cart.length, 1);
    assert.equal(out.cart[0].quantity, 2);
    assert.equal(out.cart[0].total, 3000);
  });

  it('CLEAR_CART vacía el carrito', () => {
    const out = applyPosAiActions({
      result: {
        intent: 'CLEAR_CART',
        actions: [],
        response_message: 'Vaciado',
        trigger_invoice: false,
      },
      cart: [{ id: 'p1', name: 'X', quantity: 1, unitPrice: 100, total: 100 }],
      products,
    });
    assert.equal(out.cart.length, 0);
    assert.equal(out.cleared, true);
  });

  it('SUBMIT_SALE con trigger_invoice', () => {
    const out = applyPosAiActions({
      result: {
        intent: 'SUBMIT_SALE',
        actions: [],
        response_message: 'Cerrar',
        trigger_invoice: true,
      },
      cart: [{ id: 'p1', name: 'X', quantity: 1, unitPrice: 100, total: 100 }],
      products,
    });
    assert.equal(out.shouldSubmitSale, true);
  });

  it('UPDATE fija cantidad en carrito', () => {
    const out = applyPosAiActions({
      result: {
        intent: 'ADD_TO_CART',
        actions: [{ action: 'UPDATE', product_id: 'p1', quantity: 3 }],
        response_message: 'Ok',
        trigger_invoice: false,
      },
      cart: [{ id: 'p1', name: 'Empanada de queso', quantity: 1, unitPrice: 1500, total: 1500 }],
      products,
    });
    assert.equal(out.cart[0]?.quantity, 3);
    assert.equal(out.cart[0]?.total, 4500);
  });

  it('rechaza ADD que excede stock', () => {
    const out = applyPosAiActions({
      result: {
        intent: 'ADD_TO_CART',
        actions: [{ action: 'ADD', product_id: 'p2', quantity: 99 }],
        response_message: '',
        trigger_invoice: false,
      },
      cart: [],
      products,
    });
    assert.equal(out.cart.length, 0);
    assert.match(out.message, /stock/i);
  });
});
