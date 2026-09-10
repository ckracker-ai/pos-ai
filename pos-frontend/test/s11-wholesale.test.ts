import assert from 'node:assert/strict';
import test from 'node:test';
import { creditAllowsSale, creditBlockMessage, priceForQty } from '../src/core/pos/wholesale.ts';

test('precio de tramo: 12 u. usa mayorista, 1 u. usa lista', () => {
  const tiers = [
    { minQty: 6, unitPrice: 900 },
    { minQty: 12, unitPrice: 800 },
  ];
  assert.equal(priceForQty(1000, 1, tiers), 1000);
  assert.equal(priceForQty(1000, 6, tiers), 900);
  assert.equal(priceForQty(1000, 12, tiers), 800);
  assert.equal(priceForQty(1000, 20, tiers), 800);
});

test('crédito bloquea mora y cupo', () => {
  const cliente = { creditLimit: 100000, creditUsed: 90000, isOverdue: false };
  assert.equal(creditAllowsSale(cliente, 5000, true).ok, true);
  assert.equal(creditAllowsSale(cliente, 20000, true).ok, false);
  assert.equal(creditAllowsSale({ ...cliente, isOverdue: true }, 1000, true).ok, false);
  assert.equal(creditAllowsSale(cliente, 5000, false).ok, true);
  const blocked = creditAllowsSale(null, 1000, true);
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(creditBlockMessage(blocked.reason).length > 10, true);
});
