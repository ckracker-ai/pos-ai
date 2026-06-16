import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  TENANT_DELETION_CONFIRMATION_PHRASE,
  isDeletionConfirmationPhraseValid,
  normalizeDeletionConfirmationPhrase,
} from '../src/modules/legal/constants/dataSubject';

describe('tenant deletion confirmation phrase', () => {
  it('acepta la frase exacta sin tildes', () => {
    assert.ok(isDeletionConfirmationPhraseValid(TENANT_DELETION_CONFIRMATION_PHRASE));
  });

  it('acepta mayúsculas y espacios extra', () => {
    assert.ok(isDeletionConfirmationPhraseValid('  CONFIRMAR   ELIMINACION   EMPRESA  '));
  });

  it('acepta variante con tilde (normalizada)', () => {
    assert.ok(isDeletionConfirmationPhraseValid('confirmar eliminación empresa'));
  });

  it('rechaza frase incorrecta', () => {
    assert.equal(isDeletionConfirmationPhraseValid('eliminar empresa'), false);
    assert.equal(isDeletionConfirmationPhraseValid(''), false);
  });

  it('normaliza acentos para comparación', () => {
    const normalized = normalizeDeletionConfirmationPhrase('confirmar eliminacion empresa');
    assert.equal(normalized, 'confirmar eliminacion empresa');
  });
});
