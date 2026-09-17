import assert from 'node:assert/strict';
import test from 'node:test';
import { draftCopilotReply } from '../src/modules/support/copilotFaq.js';
import { statusAfterMessage } from '../src/modules/support/supportStatus.js';

test('statusAfterMessage: tenant escribe y espera soporte', () => {
  assert.equal(statusAfterMessage('ABIERTO', 'USER'), 'ESPERANDO_SOPORTE');
});

test('statusAfterMessage: plataforma responde y espera al cliente', () => {
  assert.equal(statusAfterMessage('ESPERANDO_SOPORTE', 'PLATFORM'), 'ESPERANDO_CLIENTE');
});

test('statusAfterMessage: caso resuelto se reabre al escribir', () => {
  assert.equal(statusAfterMessage('RESUELTO', 'USER'), 'ABIERTO');
});

test('draftCopilotReply reconoce recuperar contraseña', () => {
  const r = draftCopilotReply('olvidé mi contraseña');
  assert.equal(r.escalate, false);
  assert.match(r.reply, /recuperar-contrasena/);
  assert.equal(r.hits[0]?.id, 'cuenta-acceso');
});

test('draftCopilotReply escala si piden humano', () => {
  const r = draftCopilotReply('quiero hablar con un humano urgente');
  assert.equal(r.escalate, true);
});

test('searchManual: foto del pago apunta a comprobantes WSP', () => {
  const r = draftCopilotReply('foto del pago del cliente');
  assert.equal(r.escalate, false);
  assert.equal(r.hits[0]?.id, 'comprobantes-wsp');
});

test('searchManual: cocina no ve el pedido apunta a comandas', () => {
  const r = draftCopilotReply('en cocina no veo el pedido');
  assert.equal(r.hits[0]?.id, 'comandas');
});

test('searchManual: vendedor no ve ficha de admin', () => {
  const r = draftCopilotReply('datos de transferencia banco', 'SELLER');
  assert.ok(!r.hits.some((h) => h.id === 'empresa-transferencia'));
});

test('searchManual: sin match no escala solo', () => {
  const r = draftCopilotReply('xyzzy foobar quux');
  assert.equal(r.escalate, false);
  assert.equal(r.hits.length, 0);
});

test('statusAfterMessage: señal SYSTEM no cambia ABIERTO', () => {
  assert.equal(statusAfterMessage('ABIERTO', 'SYSTEM'), 'ABIERTO');
});
