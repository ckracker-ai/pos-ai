import { decryptField } from '../../../utils/cryptoField';

export type TransferProfile = {
  bankName: string | null;
  accountType: string | null;
  accountNumber: string | null;
  holderName: string | null;
  holderRut: string | null;
};

type EmpresaLike = {
  getDataValue(key: string): unknown;
};

function readDecryptedField(raw: unknown): string | null {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;
  return decryptField(trimmed) || null;
}

export function buildTransferProfileFromEmpresa(empresa: EmpresaLike): TransferProfile | null {
  const bankName = readDecryptedField(empresa.getDataValue('transferBankName'));
  const accountType = readDecryptedField(empresa.getDataValue('transferAccountType'));
  const accountNumber = readDecryptedField(empresa.getDataValue('transferAccount'));
  const holderName = readDecryptedField(empresa.getDataValue('transferHolderName'));
  const holderRut = readDecryptedField(empresa.getDataValue('transferRut'));
  if (!bankName && !accountNumber && !holderRut && !holderName && !accountType) return null;
  return { bankName, accountType, accountNumber, holderName, holderRut };
}

export function isTransferProfileComplete(profile: TransferProfile | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.bankName?.trim() &&
      profile.accountType?.trim() &&
      profile.accountNumber?.trim() &&
      profile.holderName?.trim() &&
      profile.holderRut?.trim()
  );
}

/** Mensaje WSP al *confirmar* — debe coincidir con vista previa en tenant/plataforma. */
export function formatTransferPaymentMessage(
  pedidoId: string,
  total: number,
  profile: TransferProfile
): string {
  const shortId = pedidoId.slice(0, 8);
  const totalFmt = Math.round(total).toLocaleString('es-CL');
  return (
    `Pedido #${shortId}\n` +
    `Total: $${totalFmt}\n\n` +
    `Transferencia (sin comisión):\n` +
    `${profile.bankName} · ${profile.accountType}\n` +
    `N° ${profile.accountNumber}\n` +
    `Titular: ${profile.holderName}\n` +
    `RUT ${profile.holderRut}\n\n` +
    `Envía *foto del comprobante* donde se vea monto y destinatario.`
  );
}
