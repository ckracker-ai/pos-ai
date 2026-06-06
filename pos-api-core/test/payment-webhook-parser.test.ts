/**
 * TDD — S5 parser webhook unificado + legacy.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePaymentWebhookBody } from '../src/modules/payments/paymentWebhookParser.js';

test('contrato unificado SAAS_SUB', () => {
  const r = parsePaymentWebhookBody({
    provider: 'WEBPAY',
    externalId: 'tbk-001',
    status: 'APPROVED',
    amount: 44990,
    currency: 'CLP',
    metadata: { kind: 'SAAS_SUB', empresaId: '11111111-1111-1111-1111-111111111111' },
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.value.kind, 'SAAS_SUB');
  assert.equal(r.value.externalId, 'tbk-001');
  assert.equal(r.value.pedidoId, null);
});

test('legacy assistant SALE_WSP con sale_id', () => {
  const r = parsePaymentWebhookBody({
    empresa_id: '22222222-2222-2222-2222-222222222222',
    sale_id: '33333333-3333-3333-3333-333333333333',
    provider: 'FLOW',
    reference: 'flow-99',
    status: 'paid',
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.value.kind, 'SALE_WSP');
  assert.equal(r.value.status, 'APPROVED');
  assert.equal(r.value.pedidoId, '33333333-3333-3333-3333-333333333333');
});

test('rechaza sin externalId', () => {
  const r = parsePaymentWebhookBody({
    empresa_id: '22222222-2222-2222-2222-222222222222',
    provider: 'X',
  });
  assert.equal(r.ok, false);
});

test('REJECTED no exige pedido en parser', () => {
  const r = parsePaymentWebhookBody({
    provider: 'WEBPAY',
    externalId: 'tbk-fail',
    status: 'REJECTED',
    metadata: { kind: 'SAAS_SUB', empresaId: '11111111-1111-1111-1111-111111111111' },
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.value.status, 'REJECTED');
});
