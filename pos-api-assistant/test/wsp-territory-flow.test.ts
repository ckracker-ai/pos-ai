/**
 * TDD — S2 territorio WSP: comuna STT y elección de sucursal.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatComunaSearchResults,
  formatTerritoryResolveReply,
  parseComunaQuery,
} from '../src/agent/territoryFlow.js';

test('parseComunaQuery acepta buscar comuna y comuna directo', () => {
  assert.equal(parseComunaQuery('comuna estacion central'), 'estacion central');
  assert.equal(parseComunaQuery('buscar comuna maipu'), 'maipu');
  assert.equal(parseComunaQuery('hola'), null);
});

test('resultados de comuna numerados para desambiguación', () => {
  const msg = formatComunaSearchResults([
    { codigoCut: '13106', nombre: 'Estación Central', regionNombre: 'RM' },
    { codigoCut: '13101', nombre: 'Santiago', regionNombre: 'RM' },
  ]);
  assert.match(msg, /\*1\.\* Estación Central/);
  assert.match(msg, /13106/);
  assert.match(msg, /Responde con el \*número\*/i);
});

test('una sucursal en comuna invita a buscar productos', () => {
  const msg = formatTerritoryResolveReply({
    comunaNombre: 'Estación Central',
    branches: [{ name: 'Sucursal Central', address: 'Av. Ecuador 123' }],
    empresaNombre: 'Costa Azul',
  });
  assert.match(msg, /Sucursal Central/);
  assert.match(msg, /buscar/i);
});

test('varias sucursales piden número', () => {
  const msg = formatTerritoryResolveReply({
    comunaNombre: 'Maipú',
    branches: [
      { name: 'Local A', address: null },
      { name: 'Local B', address: 'Calle 1' },
    ],
    empresaNombre: 'Demo',
  });
  assert.match(msg, /1\. Local A/);
  assert.match(msg, /número/i);
});
