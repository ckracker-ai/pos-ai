import assert from 'node:assert/strict';
import test from 'node:test';
import { computeExpiryTransition } from '../src/modules/saas/utils/subscriptionExpiry.js';

const vence = new Date('2026-06-01T12:00:00.000Z');

test('computeExpiryTransition — PILOTO vencido entra en gracia', () => {
  const now = new Date('2026-06-08T12:00:00.000Z');
  const result = computeExpiryTransition({
    now,
    venceEn: vence,
    estado: 'PILOTO',
    graceHasta: null,
    graceDays: 7,
  });
  assert.equal(result.transition, 'grace');
  assert.equal(result.nextEstado, 'GRACIA');
  assert.ok(result.nextGraceHasta);
});

test('computeExpiryTransition — GRACIA vigente no cambia', () => {
  const now = new Date('2026-06-05T12:00:00.000Z');
  const graceHasta = new Date('2026-06-10T12:00:00.000Z');
  const result = computeExpiryTransition({
    now,
    venceEn: vence,
    estado: 'GRACIA',
    graceHasta,
    graceDays: 7,
  });
  assert.equal(result.transition, 'none');
});

test('computeExpiryTransition — gracia expirada pasa a VENCIDA', () => {
  const now = new Date('2026-06-15T12:00:00.000Z');
  const graceHasta = new Date('2026-06-10T12:00:00.000Z');
  const result = computeExpiryTransition({
    now,
    venceEn: vence,
    estado: 'GRACIA',
    graceHasta,
    graceDays: 7,
  });
  assert.equal(result.transition, 'vencida');
  assert.equal(result.nextEstado, 'VENCIDA');
});

test('computeExpiryTransition — vigente no hace nada', () => {
  const now = new Date('2026-05-15T12:00:00.000Z');
  const result = computeExpiryTransition({
    now,
    venceEn: vence,
    estado: 'PILOTO',
    graceHasta: null,
    graceDays: 7,
  });
  assert.equal(result.transition, 'none');
});
