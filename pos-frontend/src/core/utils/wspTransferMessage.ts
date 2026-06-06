/** Vista previa del mensaje WSP — mantener alineado con core `formatTransferPaymentMessage`. */

export type TransferPreviewFields = {
  transferBankName: string;
  transferAccountType: string;
  transferAccount: string;
  transferHolderName: string;
  transferRut: string;
};

export function isTransferFieldsComplete(fields: TransferPreviewFields): boolean {
  return Boolean(
    fields.transferBankName.trim() &&
      fields.transferAccountType.trim() &&
      fields.transferAccount.trim() &&
      fields.transferHolderName.trim() &&
      fields.transferRut.trim()
  );
}

export function formatWspTransferPreview(
  fields: TransferPreviewFields,
  totalExample = 12500
): string | null {
  if (!isTransferFieldsComplete(fields)) return null;
  const shortId = 'a1b2c3d4';
  const totalFmt = Math.round(totalExample).toLocaleString('es-CL');
  return (
    `Pedido #${shortId}\n` +
    `Total: $${totalFmt}\n\n` +
    `Transferencia (sin comisión):\n` +
    `${fields.transferBankName.trim()} · ${fields.transferAccountType.trim()}\n` +
    `N° ${fields.transferAccount.trim()}\n` +
    `Titular: ${fields.transferHolderName.trim()}\n` +
    `RUT ${fields.transferRut.trim()}\n\n` +
    `Envía *foto del comprobante* donde se vea monto y destinatario.`
  );
}
