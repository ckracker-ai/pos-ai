import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRubroCodigo } from '../src/core/config/rubro-packs.ts';
import {
  applySynonyms,
  mergeGlossary,
  packSimulatorSoldZero,
  runRubroPackSimulator,
  suggestRubroFromBusinessText,
} from '../src/core/pos/rubro-ai.ts';

test('café, pub y bar caen en gastronomía; mueblería en ferretería', () => {
  assert.equal(suggestRubroFromBusinessText('tengo un cafe de barrio'), 'GASTRONOMIA');
  assert.equal(normalizeRubroCodigo('pub'), 'GASTRONOMIA');
  assert.equal(normalizeRubroCodigo('bar restaurante'), 'GASTRONOMIA');
  assert.equal(suggestRubroFromBusinessText('muebleria con living'), 'FERRETERIA');
});

test('sinónimo tenant pisa al pack', () => {
  const text = applySynonyms(
    'agrega cortado',
    mergeGlossary('GASTRONOMIA', {
      businessDescription: 'cafe',
      synonyms: [{ from: 'cortado', to: 'cafe tradicional' }],
    })
  );
  assert.match(text.toLowerCase(), /cafe tradicional/);
});

test('IA-2 simulador 10 frases por pack no vende stock 0', () => {
  for (const codigo of ['GASTRONOMIA', 'MINIMARKET', 'FERRETERIA', 'ROPA', 'MAYORISTA'] as const) {
    const rows = runRubroPackSimulator(codigo);
    assert.equal(rows.length, 10, codigo);
    assert.equal(packSimulatorSoldZero(codigo), false, codigo);
  }
});
