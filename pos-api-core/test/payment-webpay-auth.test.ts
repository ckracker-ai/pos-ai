import assert from 'node:assert/strict';
import test from 'node:test';
import { isWebpayAuthorized } from '../src/modules/payments/providers/webpay/webpayClient.js';

test('isWebpayAuthorized solo AUTHORIZED + response_code 0', () => {
  assert.equal(
    isWebpayAuthorized({
      status: 'AUTHORIZED',
      buyOrder: 'WP1',
      sessionId: 'e1',
      amount: 1000,
      authorizationCode: '1213',
      responseCode: 0,
    }),
    true
  );
  assert.equal(
    isWebpayAuthorized({
      status: 'FAILED',
      buyOrder: 'WP1',
      sessionId: 'e1',
      amount: 1000,
      authorizationCode: null,
      responseCode: -1,
    }),
    false
  );
});
