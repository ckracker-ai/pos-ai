import assert from 'node:assert/strict';
import test from 'node:test';
import { sessionStatusFromCommit } from '../src/modules/payments/delegates/PaymentSessionDelegate.js';
import {
  PAYMENT_SESSION_TTL_MINUTES,
  addMinutes,
  paymentSessionExpiresAt,
} from '../src/modules/payments/utils/paymentSessionTime.js';

test('sessionStatusFromCommit — AUTHORIZED vs rechazo', () => {
  assert.equal(
    sessionStatusFromCommit({
      status: 'AUTHORIZED',
      buyOrder: 'WP1',
      sessionId: 'e1',
      amount: 1000,
      authorizationCode: '1213',
      responseCode: 0,
    }),
    'APPROVED'
  );
  assert.equal(
    sessionStatusFromCommit({
      status: 'FAILED',
      buyOrder: 'WP2',
      sessionId: 'e1',
      amount: 1000,
      authorizationCode: null,
      responseCode: -1,
    }),
    'REJECTED'
  );
});

test('paymentSessionExpiresAt — TTL 15 min por defecto', () => {
  const base = new Date('2026-06-08T12:00:00.000Z');
  const exp = paymentSessionExpiresAt(base);
  assert.equal(PAYMENT_SESSION_TTL_MINUTES, 15);
  assert.equal(exp.getTime(), addMinutes(base, 15).getTime());
});
