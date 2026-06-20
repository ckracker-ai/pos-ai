/**
 * TDD — Carrito WSP con varias búsquedas (flujo real de compra).
 *
 * Escenario (usuario):
 * 1. El bot pregunta qué buscar tras elegir sucursal
 * 2. buscar cafe → agregar café al carrito
 * 3. buscar empanada → agregar empanada al mismo carrito
 * 4. opcional: otro producto
 * 5. confirmar → pago / comprobante
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  branchSelectedSearchPrompt,
  canAppendToOpenCart,
  formatAddedLinesReply,
  searchResultsFooter,
} from '../src/agent/cartFlow.js';

test('tras elegir sucursal invita a buscar (no pedir UUID)', () => {
  const msg = branchSelectedSearchPrompt('Sucursal Central');
  assert.match(msg, /qué buscas/i);
  assert.match(msg, /buscar empanada/i);
});

test('carrito abierto permite agregar más ítems antes de confirmar', () => {
  assert.equal(canAppendToOpenCart(true), true);
  assert.equal(canAppendToOpenCart(false), false);
});

test('segunda búsqueda con carrito abierto muestra hint de agregar', () => {
  const footer = searchResultsFooter(true);
  assert.match(footer, /carrito abierto/i);
  assert.match(footer, /buscar/i);
  assert.match(footer, /confirmar/i);
});

test('primera búsqueda sin carrito explica flujo multi-producto', () => {
  const footer = searchResultsFooter(false);
  assert.match(footer, /buscar.*otro producto/i);
});

test('respuesta al agregar café luego empanada mantiene mismo pedido y total acumulado', () => {
  const formatPrice = (n: number) => `$${n}`;
  const afterCafe = formatAddedLinesReply({
    pedidoId: 'abc-12345-678',
    total: 2500,
    addedLines: [{ nombre: 'Café americano', quantity: 1, subtotal: 2500 }],
    appended: false,
    formatPrice,
  });
  assert.match(afterCafe, /Pedido registrado/);
  assert.match(afterCafe, /Café americano/);
  assert.match(afterCafe, /buscar.*otro producto/i);

  const afterEmpanada = formatAddedLinesReply({
    pedidoId: 'abc-12345-678',
    total: 5500,
    addedLines: [{ nombre: 'Empanada de pino', quantity: 2, subtotal: 3000 }],
    appended: true,
    formatPrice,
  });
  assert.match(afterEmpanada, /Agregado al pedido/);
  assert.match(afterEmpanada, /Empanada de pino/);
  assert.match(afterEmpanada, /Total carrito: \$5500/);
  assert.doesNotMatch(afterEmpanada, /cancelar pedido y pedir de nuevo/i);
});

test('flujo completo en pasos (contrato de mensajes)', () => {
  const steps: string[] = [];
  steps.push(branchSelectedSearchPrompt('Central'));
  steps.push('buscar cafe');
  steps.push(searchResultsFooter(false));
  steps.push('pedido 1x1');
  steps.push('buscar empanada');
  steps.push(searchResultsFooter(true));
  steps.push('pedido 1x2');
  steps.push('mi pedido');
  steps.push('confirmar');
  assert.equal(steps.length, 9);
  assert.ok(steps[0].includes('buscar'));
  assert.ok(steps[5].includes('Carrito abierto'));
});
