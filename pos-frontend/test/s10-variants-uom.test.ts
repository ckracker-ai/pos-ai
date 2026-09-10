import assert from 'node:assert/strict';
import test from 'node:test';
import {
  packUnitsForSaleQty,
  parseLengthQueryMm,
  productMatchesEquivalenceSearch,
} from '../src/core/pos/unit-equivalence.ts';
import { buildVariantMatrix, canSellVariantCell } from '../src/core/pos/product-variants.ts';

test('2 pulgadas equivale a 50.8 mm', () => {
  const mm = parseLengthQueryMm('clavo 2 pulgadas');
  assert.ok(mm != null);
  assert.ok(Math.abs(mm - 50.8) < 0.01);
});

test('busca clavo por pulgada o mm del mismo tamaño', () => {
  const clavo = { name: 'Clavo', sku: 'CL-50', sizeMm: 50.8, packQty: 1 };
  assert.equal(productMatchesEquivalenceSearch(clavo, '2"'), true);
  assert.equal(productMatchesEquivalenceSearch(clavo, '50.8mm'), true);
  assert.equal(productMatchesEquivalenceSearch(clavo, '3 pulgadas'), false);
});

test('caja multiplica a unidades de stock', () => {
  assert.equal(packUnitsForSaleQty(2, 12, true), 24);
  assert.equal(packUnitsForSaleQty(2, 12, false), 2);
});

test('matriz talla/color no vende celda en 0', () => {
  const catalog = [
    { id: 'p', name: 'Polera' },
    { id: 'm-neg', parentProductId: 'p', variantSize: 'M', variantColor: 'Negro', stock: 4 },
    { id: 's-neg', parentProductId: 'p', variantSize: 'S', variantColor: 'Negro', stock: 0 },
  ];
  const matrix = buildVariantMatrix(catalog, catalog[0]);
  assert.ok(matrix);
  const mNegro = matrix.cell('M', 'Negro');
  const sNegro = matrix.cell('S', 'Negro');
  assert.equal(canSellVariantCell(mNegro?.stock), true);
  assert.equal(canSellVariantCell(sNegro?.stock), false);
});
