import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { withJobLock } from '../src/lib/jobLock';

describe('withJobLock without REDIS_URL', () => {
  it('ejecuta fn cuando no hay Redis configurado', async () => {
    const prev = process.env.REDIS_URL;
    delete process.env.REDIS_URL;

    const locked = await withJobLock('test-lock', 60, async () => ({ ok: true }));

    if (prev) process.env.REDIS_URL = prev;

    assert.equal(locked.acquired, true);
    if (locked.acquired) {
      assert.deepEqual(locked.value, { ok: true });
    }
  });
});
