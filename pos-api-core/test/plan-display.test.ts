import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getPlanDescription,
  getPlanDisplayName,
  isBrokenUtf8Text,
} from '../src/modules/saas/utils/planDisplay';

describe('plan display encoding', () => {
  it('isBrokenUtf8Text detecta B??sico', () => {
    assert.equal(isBrokenUtf8Text('POS-AI B??sico'), true);
    assert.equal(isBrokenUtf8Text('POS-AI Básico'), false);
  });

  it('getPlanDisplayName corrige por codigo', () => {
    assert.equal(getPlanDisplayName('BASICO', 'POS-AI B??sico'), 'POS-AI Básico');
    assert.equal(getPlanDisplayName('ESTANDAR', 'POS-AI Estándar'), 'POS-AI Estándar');
  });

  it('getPlanDescription corrige descripcion rota', () => {
    const fixed = getPlanDescription('ESTANDAR', 'B??sico + asistente IA');
    assert.match(fixed ?? '', /Básico \+ asistente IA/);
  });
});
