import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isRubroModuleEnabled,
  isWeightUnit,
  normalizeRubroCodigo,
  resolveRubroCapabilities,
} from '../src/core/config/rubro-packs.ts';

test('texto vacío o Costa Azul cae en gastronomía (cocina on)', () => {
  assert.equal(resolveRubroCapabilities(null).kitchen, true);
  assert.equal(resolveRubroCapabilities('').kitchen, true);
  assert.equal(normalizeRubroCodigo('Empanadas Costa Azul'), 'GASTRONOMIA');
  assert.equal(isRubroModuleEnabled('comandas', null), true);
});

test('minimarket apaga cocina y enciende barcode/granel', () => {
  const caps = resolveRubroCapabilities('MINIMARKET');
  assert.equal(caps.kitchen, false);
  assert.equal(caps.barcode, true);
  assert.equal(caps.bulkWeight, true);
  assert.equal(isRubroModuleEnabled('comandas', 'MINIMARKET'), false);
  assert.equal(isRubroModuleEnabled('delivery', 'MINIMARKET'), true);
});

test('café, pub y bar son gastronomía; mueblería usa ferretería', () => {
  assert.equal(normalizeRubroCodigo('cafe'), 'GASTRONOMIA');
  assert.equal(normalizeRubroCodigo('pub'), 'GASTRONOMIA');
  assert.equal(normalizeRubroCodigo('muebleria'), 'FERRETERIA');
});

test('isWeightUnit reconoce kg y litros', () => {
  assert.equal(isWeightUnit('kg'), true);
  assert.equal(isWeightUnit('LT'), true);
  assert.equal(isWeightUnit('unit'), false);
});
