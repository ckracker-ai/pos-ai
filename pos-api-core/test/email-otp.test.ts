import assert from 'node:assert/strict';
import test from 'node:test';
import { formatOtpForDisplay, generateSixDigitOtp } from '../src/lib/emailOtp.js';
import { buildEmailOtpMessage } from '../src/services/emailOtpMessage.js';

test('generateSixDigitOtp siempre tiene 6 dígitos', () => {
  for (let i = 0; i < 20; i += 1) {
    assert.match(generateSixDigitOtp(), /^\d{6}$/);
  }
});

test('formatOtpForDisplay separa dígitos', () => {
  assert.equal(formatOtpForDisplay('841086'), '8 4 1 0 8 6');
});

test('buildEmailOtpMessage incluye código y caducidad', () => {
  const msg = buildEmailOtpMessage({ greetingName: 'daniel', code: '841086', ttlMinutes: 10 });
  assert.match(msg.subject, /verificación/i);
  assert.match(msg.text, /841086/);
  assert.match(msg.text, /10 minutos/);
  assert.match(msg.html, /8 4 1 0 8 6/);
});
