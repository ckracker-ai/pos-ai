import assert from 'node:assert/strict';
import test from 'node:test';
import {
  wspBranchList,
  wspHelp,
  wspPickBranchPrompt,
  wspSearchNotFound,
  wspSearchResultsFooter,
  wspComunaSearchResults,
} from '../src/agent/wspMessages.js';

test('wspHelp incluye pasos numerados y comandos clave', () => {
  const msg = wspHelp('Costa Azul');
  assert.match(msg, /Costa Azul/);
  assert.match(msg, /sucursales/);
  assert.match(msg, /confirmar/);
  assert.match(msg, /categorias/);
  assert.match(msg, /\*menu\*/);
});

test('wspBranchList formatea lista numerada', () => {
  const msg = wspBranchList('Costa Azul', ['1. Central', '2. Maipú']);
  assert.match(msg, /\*Sucursales de Costa Azul\*/);
  assert.match(msg, /1\. Central/);
  assert.match(msg, /Responde con el \*número\*/);
});

test('wspPickBranchPrompt pide sucursales', () => {
  assert.match(wspPickBranchPrompt(), /sucursales/);
});

test('wspSearchNotFound sugiere categorias', () => {
  assert.match(wspSearchNotFound('pizza'), /pizza/);
  assert.match(wspSearchNotFound('pizza'), /categorias/);
});

test('wspSearchResultsFooter diferencia carrito abierto', () => {
  assert.match(wspSearchResultsFooter(false), /Cómo pedir/);
  assert.match(wspSearchResultsFooter(true), /Carrito abierto/);
});

test('wspComunaSearchResults usa codigo monoespaciado', () => {
  const msg = wspComunaSearchResults([
    { codigoCut: '13101', nombre: 'Santiago', regionNombre: 'RM' },
  ]);
  assert.match(msg, /`13101`/);
  assert.match(msg, /Santiago/);
});

test('wspComunaSearchResults vacío da hint', () => {
  assert.match(wspComunaSearchResults([]), /comuna/i);
});
