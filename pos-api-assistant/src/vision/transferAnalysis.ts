/** Variantes de comprobante / vale que puede enviar el cliente por WSP (Chile). */
export type ReceiptVariant =
  | 'TRANSFER_OK'
  | 'TRANSFER_AMOUNT_MISMATCH'
  | 'TRANSFER_PARTIAL'
  | 'TRANSFER_OVERPAY'
  | 'WRONG_RECIPIENT'
  | 'AMOUNT_OK_RECIPIENT_UNCLEAR'
  | 'NOT_PAYMENT'
  | 'UNCLEAR'
  | 'NO_AMOUNT';

export type TransferAnalysis = {
  receiptType: string;
  variant: ReceiptVariant;
  amount: number | null;
  rut: string | null;
  bank: string | null;
  date: string | null;
  match: boolean;
  confidence: number;
  summary: string;
  warnings: string[];
  recipientScore: number | null;
  recipientIssues: string[];
};

import type { RecipientMatch } from './transferProfileMatch.js';

const TOLERANCE_CLP = 500;

/** Montos chilenos: $5.000, 5000, CLP 5.000, 5,000.50 */
export function parseChileanPesos(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.round(raw);
  }
  const s = String(raw ?? '').trim();
  if (!s) return null;

  const digitsOnly = s.replace(/[^\d]/g, '');
  if (!digitsOnly) return null;

  const hasDecimal = /[.,]\d{1,2}\s*$/.test(s);
  if (hasDecimal) {
    const normalized = s.replace(/\./g, '').replace(',', '.');
    const n = Number(normalized.replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? Math.round(n) : null;
  }

  const dotThousands = /^\d{1,3}(\.\d{3})+$/.test(s.replace(/\s/g, ''));
  if (dotThousands) {
    return Number(s.replace(/\./g, '').replace(/\s/g, ''));
  }

  const n = Number(digitsOnly);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseAmountFromCaption(caption: string): number | null {
  const trimmed = caption.trim();
  if (!trimmed) return null;
  // Import dinámico evitado: regla local para no acoplar vision → agent en runtime circular
  if (
    /^(pedido|agregar|quiero|buscar|stock|sucursales|confirmar|cancelar|mi\s+pedido)\b/i.test(
      trimmed
    ) ||
    /^\d+\s*[x×]\s*\d+$/i.test(trimmed) ||
    /^(\d+\s*[x×]\s*\d+|\d+\s+\d+)(\s*,\s*(\d+\s*[x×]\s*\d+|\d+\s+\d+))*$/i.test(trimmed)
  ) {
    return null;
  }
  const lower = trimmed.toLowerCase();
  const hasPaymentCue = /(vale|pago|transfer|comprobante|abono|deposit|clp|\$)/i.test(lower);
  if (!hasPaymentCue) {
    const digitsOnly = trimmed.replace(/\s/g, '');
    if (/^\d{4,}$/.test(digitsOnly)) {
      return parseChileanPesos(digitsOnly);
    }
    return null;
  }
  if (!/\d/.test(trimmed)) {
    return null;
  }
  const m = caption.match(/(?:\$|clp)?\s*(\d{1,3}(?:\.\d{3})+|\d{4,}|\d+)/i);
  if (!m) return null;
  return parseChileanPesos(m[1]);
}

export function classifyAmountVariant(
  expectedTotal: number,
  amount: number | null,
  receiptType: string,
  confidence: number
): ReceiptVariant | null {
  const rt = receiptType.toLowerCase();
  if (rt.includes('not_payment') || rt.includes('product') || rt.includes('chat')) {
    return 'NOT_PAYMENT';
  }
  if (amount == null || amount <= 0) {
    if (rt.includes('unclear') || confidence < 0.35) {
      return 'UNCLEAR';
    }
    return 'NO_AMOUNT';
  }
  if (amount < expectedTotal - TOLERANCE_CLP) {
    return 'TRANSFER_PARTIAL';
  }
  if (amount > expectedTotal + TOLERANCE_CLP) {
    return 'TRANSFER_OVERPAY';
  }
  if (Math.abs(amount - expectedTotal) > TOLERANCE_CLP) {
    return 'TRANSFER_AMOUNT_MISMATCH';
  }
  return null;
}

export function resolveReceiptVariant(
  expectedTotal: number,
  amount: number | null,
  receiptType: string,
  confidence: number,
  recipient: RecipientMatch
): ReceiptVariant {
  const amountVariant = classifyAmountVariant(expectedTotal, amount, receiptType, confidence);
  if (amountVariant && amountVariant !== 'TRANSFER_AMOUNT_MISMATCH') {
    return amountVariant;
  }

  const amountOk =
    amount != null &&
    amount > 0 &&
    Math.abs(amount - expectedTotal) <= TOLERANCE_CLP;

  if (recipient.configured && amountOk) {
    const wrongRecipient =
      recipient.rutOk === false ||
      recipient.accountOk === false ||
      (recipient.nameOk === false && recipient.rutOk !== true);
    if (wrongRecipient) {
      return 'WRONG_RECIPIENT';
    }
    if (recipient.score < 0.34) {
      return 'AMOUNT_OK_RECIPIENT_UNCLEAR';
    }
    return 'TRANSFER_OK';
  }

  if (amountVariant) return amountVariant;
  if (amountOk) return 'TRANSFER_OK';
  return 'TRANSFER_AMOUNT_MISMATCH';
}

/** @deprecated Usar resolveReceiptVariant */
export function classifyVariant(
  expectedTotal: number,
  amount: number | null,
  receiptType: string,
  visionMatch: boolean,
  confidence: number
): ReceiptVariant {
  void visionMatch;
  return resolveReceiptVariant(expectedTotal, amount, receiptType, confidence, {
    configured: false,
    rutOk: null,
    accountOk: null,
    nameOk: null,
    bankOk: null,
    score: 0,
    issues: [],
  });
}

export function variantLabel(variant: ReceiptVariant): string {
  const labels: Record<ReceiptVariant, string> = {
    TRANSFER_OK: '✅ Monto coincide (preliminar)',
    TRANSFER_AMOUNT_MISMATCH: '⚠️ Monto no coincide con pedido',
    TRANSFER_PARTIAL: '⚠️ Pago parcial (menor al total)',
    TRANSFER_OVERPAY: '⚠️ Monto mayor al pedido',
    WRONG_RECIPIENT: '❌ Destinatario no coincide con datos del comercio',
    AMOUNT_OK_RECIPIENT_UNCLEAR: '⚠️ Monto OK; destinatario no legible — revisión manual',
    NOT_PAYMENT: '❌ No parece comprobante de transferencia',
    UNCLEAR: '⚠️ Imagen poco legible',
    NO_AMOUNT: '⚠️ No se detectó monto',
  };
  return labels[variant];
}
