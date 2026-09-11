import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeReorderDraftQty } from '../src/modules/reports/operationalLearning.js';

test('BI-2 reorden: bajo mínimo pide hasta el mínimo', () => {
  assert.equal(computeReorderDraftQty(2, 10, 0), 9);
});

test('BI-2 reorden: cubre semana de venta', () => {
  assert.equal(computeReorderDraftQty(10, 0, 28), 18);
});

test('BI-2 reorden: stock de sobra no sugiere', () => {
  assert.equal(computeReorderDraftQty(100, 5, 7), 0);
});
