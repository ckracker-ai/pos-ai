import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAssistantHelpCommands,
  buscarExample,
  catalogSearchTerm,
} from '../src/core/assistant/helpCommands.ts';

test('ayuda ferretería no menciona empanada', () => {
  const cmds = buildAssistantHelpCommands('FERRETERIA');
  assert.equal(buscarExample('FERRETERIA'), 'buscar tornillo');
  assert.ok(cmds.includes('buscar tornillo'));
  assert.ok(cmds.every((c) => !/empanada/i.test(c)));
  assert.ok(cmds.includes('ayuda'));
  assert.ok(cmds.includes('sucursales'));
  assert.ok(!cmds.some((c) => /tarjeta|4111/i.test(c)));
});

test('ayuda gastronomía usa café, no un SKU de otro rubro', () => {
  assert.equal(catalogSearchTerm('GASTRONOMIA'), 'cafe');
  assert.ok(!buildAssistantHelpCommands('GASTRONOMIA').some((c) => /tornillo/i.test(c)));
});

test('sin rubro el ejemplo es genérico', () => {
  assert.equal(catalogSearchTerm(null), 'producto');
  assert.equal(buscarExample(''), 'buscar producto');
});
