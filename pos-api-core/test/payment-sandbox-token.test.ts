import assert from 'node:assert/strict';
import test from 'node:test';
import {
  issueCheckoutSessionToken,
  verifyCheckoutSessionToken,
} from '../src/modules/payments/utils/checkoutSessionToken.js';
import {
  signPaymentPayload,
  verifyPaymentSignature,
} from '../src/modules/payments/utils/paymentSignature.js';

const SECRET = 'test-secret-s5';

test('checkout session token roundtrip', () => {
  const token = issueCheckoutSessionToken(SECRET, {
    empresaId: '11111111-1111-1111-1111-111111111111',
    kind: 'SAAS_SUB',
    provider: 'SANDBOX',
    externalId: 'sb-abc',
    amount: 50000,
    currency: 'CLP',
    ttlSec: 600,
  });
  const v = verifyCheckoutSessionToken(SECRET, token);
  assert.equal(v.ok, true);
  if (!v.ok) return;
  assert.equal(v.value.externalId, 'sb-abc');
  assert.equal(v.value.amount, 50000);
});

test('HMAC webhook signature', () => {
  const canonical = JSON.stringify({
    provider: 'SANDBOX',
    externalId: 'x-1',
    status: 'APPROVED',
    amount: 100,
    currency: 'CLP',
    metadata: { kind: 'SAAS_SUB', empresaId: '11111111-1111-1111-1111-111111111111' },
  });
  const sig = signPaymentPayload(SECRET, canonical);
  assert.equal(verifyPaymentSignature(SECRET, canonical, sig), true);
  assert.equal(verifyPaymentSignature(SECRET, canonical, 'bad'), false);
});
