import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveDbSsl } from '../src/config/dbSsl.js';

test('resolveDbSsl desactivado por defecto (MySQL local)', () => {
  const prev = process.env.DB_SSL;
  delete process.env.DB_SSL;
  assert.equal(resolveDbSsl(), undefined);
  if (prev !== undefined) process.env.DB_SSL = prev;
});

test('resolveDbSsl activo para RDS', () => {
  const prevSsl = process.env.DB_SSL;
  const prevReject = process.env.DB_SSL_REJECT_UNAUTHORIZED;
  process.env.DB_SSL = 'true';
  delete process.env.DB_SSL_REJECT_UNAUTHORIZED;
  assert.deepEqual(resolveDbSsl(), { rejectUnauthorized: true });
  process.env.DB_SSL_REJECT_UNAUTHORIZED = 'false';
  assert.deepEqual(resolveDbSsl(), { rejectUnauthorized: false });
  if (prevSsl !== undefined) process.env.DB_SSL = prevSsl;
  else delete process.env.DB_SSL;
  if (prevReject !== undefined) process.env.DB_SSL_REJECT_UNAUTHORIZED = prevReject;
  else delete process.env.DB_SSL_REJECT_UNAUTHORIZED;
});
