import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { failWith } from '../src/types/result';

describe('legal login gate', () => {
  it('LEGAL_REAUTH_REQUIRED incluye bundle de versiones', () => {
    const bundle = {
      terms: { version: 'tos-1.0.0', title: 'ToS' },
      privacy: { version: 'privacy-1.0.0', title: 'Privacidad' },
    };
    const result = failWith('LEGAL_REAUTH_REQUIRED', bundle);
    assert.equal(result.success, false);
    assert.equal(result.error, 'LEGAL_REAUTH_REQUIRED');
    assert.deepEqual(result.value, bundle);
  });
});
