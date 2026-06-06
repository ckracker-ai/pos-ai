import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSearchText, isValidCodigoPostal } from '../src/modules/territory/utils/textNormalize.js';
import { CUT_COMUNA_COUNT } from '../src/db/cut/chileCutData.js';

test('normalizeSearchText quita tildes para STT', () => {
  assert.equal(normalizeSearchText('Estación Central'), 'estacion central');
});

test('codigo postal CorreosChile 7 dígitos', () => {
  assert.equal(isValidCodigoPostal('9160000'), true);
  assert.equal(isValidCodigoPostal('91600'), false);
});

test('dataset CUT completo tiene 346 comunas', () => {
  assert.equal(CUT_COMUNA_COUNT, 346);
});
