import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { versionsMatchCurrent } from '../src/modules/legal/utils/legalVersions';

describe('legalVersions', () => {
  it('acepta versiones vigentes', () => {
    assert.equal(
      versionsMatchCurrent(
        { termsVersion: 'tos-1.0.0', privacyVersion: 'privacy-1.0.0' },
        { tosVersion: 'tos-1.0.0', privacyVersion: 'privacy-1.0.0' }
      ),
      true
    );
  });

  it('rechaza desfase de versiones', () => {
    assert.equal(
      versionsMatchCurrent(
        { termsVersion: 'tos-0.9.0', privacyVersion: 'privacy-1.0.0' },
        { tosVersion: 'tos-1.0.0', privacyVersion: 'privacy-1.0.0' }
      ),
      false
    );
  });
});
