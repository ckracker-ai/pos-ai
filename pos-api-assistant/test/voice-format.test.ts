import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatVoiceReply, stripMarkdownForVoice } from '../src/agent/voiceFormat.js';

test('stripMarkdownForVoice quita asteriscos y saltos', () => {
  const out = stripMarkdownForVoice('*Hola*\n\nDi *sucursales*');
  assert.equal(out, 'Hola. Di sucursales');
});

test('formatVoiceReply convierte precio y trunca', () => {
  const long =
    'Tu pedido total $24.990 en *Sucursal Central* con empanada napolitana y jugo natural extra';
  const out = formatVoiceReply(long);
  assert.match(out, /pesos/);
  assert.ok(!out.includes('*'));
  assert.ok(out.split(/\s+/).length <= 26);
});
