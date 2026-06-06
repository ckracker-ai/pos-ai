import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatTransferPaymentMessage,
  isTransferProfileComplete,
  type TransferProfile,
} from '../src/modules/tenant/utils/transferProfile';

const completeProfile: TransferProfile = {
  bankName: 'BancoEstado',
  accountType: 'Cuenta vista',
  accountNumber: '12345678',
  holderName: 'Empanadas Costa Azul SpA',
  holderRut: '76.123.456-7',
};

describe('transfer payment message', () => {
  it('isTransferProfileComplete requires all five fields', () => {
    assert.equal(isTransferProfileComplete(completeProfile), true);
    assert.equal(isTransferProfileComplete({ ...completeProfile, bankName: '' }), false);
    assert.equal(isTransferProfileComplete(null), false);
  });

  it('formatTransferPaymentMessage matches WSP copy contract', () => {
    const msg = formatTransferPaymentMessage('a1b2c3d4-e5f6-7890', 12500, completeProfile);
    assert.match(msg, /Pedido #a1b2c3d4/);
    assert.match(msg, /Total: \$12\.500/);
    assert.match(msg, /BancoEstado · Cuenta vista/);
    assert.match(msg, /N° 12345678/);
    assert.match(msg, /Titular: Empanadas Costa Azul SpA/);
    assert.match(msg, /RUT 76\.123\.456-7/);
    assert.match(msg, /foto del comprobante/);
    assert.doesNotMatch(msg, /Banco demo/);
  });
});
