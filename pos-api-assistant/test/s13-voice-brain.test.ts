import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatVoiceReply } from '../src/agent/voiceFormat.js';
import {
  isVoicePlaceOrderIntent,
  looksLikeCardPan,
  voiceNeedBranchMessage,
  voiceNoCardMessage,
} from '../src/agent/voiceGuards.js';
import { applySynonyms, mergeRubroSynonyms } from '../src/agent/rubroGlossary.js';

test('IA-V1 voz rechaza PAN de tarjeta', () => {
  assert.equal(looksLikeCardPan('4111111111111111'), true);
  assert.equal(looksLikeCardPan('mi visa 4111 1111 1111 1111'), true);
  assert.equal(looksLikeCardPan('sucursales'), false);
  assert.equal(looksLikeCardPan('56900000003'), false);
  assert.match(voiceNoCardMessage().toLowerCase(), /whatsapp/);
  assert.ok(!voiceNoCardMessage().includes('*'));
});

test('IA-V1 pedido de voz exige sucursal', () => {
  assert.equal(isVoicePlaceOrderIntent('quiero dos empanadas'), true);
  assert.equal(isVoicePlaceOrderIntent('pedido 1x2'), true);
  assert.equal(isVoicePlaceOrderIntent('sucursales'), false);
  const msg = formatVoiceReply(voiceNeedBranchMessage());
  assert.match(msg.toLowerCase(), /sucursal/);
  assert.ok(msg.split(/\s+/).length <= 26);
});

test('voz usa el mismo diccionario de rubro que caja', () => {
  const out = applySynonyms('agrega cortado', mergeRubroSynonyms('GASTRONOMIA', null));
  assert.match(out.toLowerCase(), /cafe/);
});
