import assert from 'node:assert/strict';
import test from 'node:test';
import { canTransitionDelivery } from '../src/modules/delivery/deliveryTransitions.js';

test('delivery transitions válidas', () => {
  assert.equal(canTransitionDelivery('CREATED', 'ASSIGNED'), true);
  assert.equal(canTransitionDelivery('ASSIGNED', 'ON_ROUTE'), true);
  assert.equal(canTransitionDelivery('ON_ROUTE', 'DELIVERED'), true);
  assert.equal(canTransitionDelivery('CREATED', 'DELIVERED'), false);
  assert.equal(canTransitionDelivery('DELIVERED', 'ON_ROUTE'), false);
});
