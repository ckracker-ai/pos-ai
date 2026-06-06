import { isOrderCommandText } from '../agent/orderText.js';
import { buildSession } from '../agent/runAgent.js';
import {
  wspProofAwaitingConfirmForImage,
  wspProofAwaitingConfirmForText,
  wspProofDefaultReply,
  wspProofFormatUnsupported,
  wspProofNoAmountReply,
  wspProofNoPendingForProof,
  wspProofNotPaymentImage,
  wspProofOnlinePlan,
  wspProofOnlinePlanWithTransferNote,
  wspProofOverpayReply,
  wspProofPartialReply,
  wspProofPdfUnsupported,
  wspProofRecipientUnclearReply,
  wspProofTextClaimHint,
  wspProofUnclearReply,
  wspProofWrongRecipientReply,
} from '../agent/wspMessages.js';
import { coreClient } from '../core/coreClient.js';
import { downloadMetaMedia } from '../meta/downloadMedia.js';
import { sendWhatsAppText } from '../meta/sendMessage.js';
import { analyzeTransferImage } from '../vision/analyzeTransfer.js';
import {
  variantLabel,
  type ReceiptVariant,
  type TransferAnalysis,
} from '../vision/transferAnalysis.js';
import type { ParsedIncoming } from './parseIncoming.js';
import {
  isLikelyPaymentAmountText,
  rememberPaymentHint,
  resolvePaymentCaption,
} from './paymentHint.js';
import { parseAmountFromCaption } from '../vision/transferAnalysis.js';

type ProofIncoming =
  | Extract<ParsedIncoming, { kind: 'image' | 'image-dev' }>
  | Extract<ParsedIncoming, { kind: 'document' }>;

const PAYMENT_CLAIM_RE =
  /^(vale|ya\s+pagu[eé]|listo(\s+el\s+pago)?|aqu[ií]\s+(va|est[aá])|comprobante|transfer[ií]|te\s+env[ií]o|adjunto)/i;

export function isPaymentClaimText(text: string): boolean {
  const t = text.trim();
  if (isOrderCommandText(t)) return false;
  if (PAYMENT_CLAIM_RE.test(t)) return true;
  if (/(vale|pago|transfer|comprobante)/i.test(t) && /\d/.test(t)) return true;
  if (isLikelyPaymentAmountText(t)) return true;
  return false;
}

function formatClp(n: number): string {
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

function buildVisionSummary(analysis: TransferAnalysis): string {
  const payload = {
    variant: analysis.variant,
    receiptType: analysis.receiptType,
    bank: analysis.bank,
    rut: analysis.rut,
    date: analysis.date,
    confidence: analysis.confidence,
    recipientScore: analysis.recipientScore,
    recipientIssues: analysis.recipientIssues,
    warnings: analysis.warnings,
    summary: analysis.summary,
  };
  return `[${analysis.variant}] ${analysis.summary}\n${JSON.stringify(payload)}`;
}

function clientReplyForVariant(
  variant: ReceiptVariant,
  pedidoId: string,
  expected: number,
  detected: number | null,
  notified: boolean,
  proofUpdated = false
): string {
  const shortId = pedidoId.slice(0, 8);
  const label = variantLabel(variant);
  const opts = {
    shortId,
    variantLabel: label,
    expectedLabel: formatClp(expected),
    detectedLabel: detected != null ? formatClp(detected) : null,
    notified,
    proofUpdated,
  };

  switch (variant) {
    case 'NOT_PAYMENT':
      return wspProofNotPaymentImage();
    case 'UNCLEAR':
      return wspProofUnclearReply(opts);
    case 'NO_AMOUNT':
      return wspProofNoAmountReply(opts);
    case 'TRANSFER_PARTIAL':
      return wspProofPartialReply(opts);
    case 'TRANSFER_OVERPAY':
    case 'TRANSFER_AMOUNT_MISMATCH':
      return wspProofOverpayReply(opts);
    case 'WRONG_RECIPIENT':
      return wspProofWrongRecipientReply(shortId, label);
    case 'AMOUNT_OK_RECIPIENT_UNCLEAR':
      return wspProofRecipientUnclearReply(opts);
    default:
      return wspProofDefaultReply(opts);
  }
}

async function loadImageFromIncoming(
  incoming: ProofIncoming
): Promise<{ imageBase64: string; mimeType: string; caption?: string } | { error: string }> {
  if (incoming.kind === 'document') {
    if (incoming.mimeType.includes('pdf')) {
      return { error: wspProofPdfUnsupported() };
    }
    const { buffer, mimeType } = await downloadMetaMedia(incoming.mediaId);
    if (!mimeType.startsWith('image/')) {
      return { error: wspProofFormatUnsupported() };
    }
    return {
      imageBase64: buffer.toString('base64'),
      mimeType,
      caption: incoming.caption,
    };
  }

  if (incoming.kind === 'image-dev') {
    return {
      imageBase64: incoming.imageBase64,
      mimeType: incoming.mimeType,
      caption: incoming.caption,
    };
  }

  const { buffer, mimeType } = await downloadMetaMedia(incoming.mediaId);
  return {
    imageBase64: buffer.toString('base64'),
    mimeType,
    caption: incoming.caption,
  };
}

export async function handlePaymentProofTextClaim(from: string, text: string): Promise<string> {
  const session = await buildSession(from);
  const { context } = session;

  if (context.features.pagosOnline) {
    return wspProofOnlinePlan();
  }

  rememberPaymentHint(from, text);
  const parsedAmount = parseAmountFromCaption(text);

  try {
    const pedido = await coreClient.findPendingOrder(context.empresaId, context.phone);
    if (pedido.awaiting_customer_confirm) {
      return wspProofAwaitingConfirmForText();
    }
    const amountLine = parsedAmount
      ? `\n\n✓ Anoté monto *${formatClp(parsedAmount)}* para tu próxima foto.`
      : '';
    return wspProofTextClaimHint({
      pedidoId: pedido.pedido_id,
      totalLabel: formatClp(pedido.total),
      amountLine,
    });
  } catch {
    return wspProofNoPendingForProof();
  }
}

export async function handlePaymentProofImage(incoming: ProofIncoming): Promise<string> {
  const session = await buildSession(incoming.from);
  const { context } = session;

  if (context.features.pagosOnline) {
    return wspProofOnlinePlanWithTransferNote();
  }

  const loaded = await loadImageFromIncoming(incoming);
  if ('error' in loaded) return loaded.error;

  let pedido: {
    pedido_id: string;
    total: number;
    branch_id: string;
    branch_name: string;
    awaiting_customer_confirm: boolean;
  };
  try {
    pedido = await coreClient.findPendingOrder(context.empresaId, context.phone);
  } catch {
    return wspProofNoPendingForProof();
  }

  if (pedido.awaiting_customer_confirm) {
    return wspProofAwaitingConfirmForImage();
  }

  const captionHint = resolvePaymentCaption(incoming.from, loaded.caption);

  const analysis = await analyzeTransferImage(
    loaded.imageBase64,
    loaded.mimeType,
    pedido.total,
    context.transferProfile,
    captionHint
  );

  const skipNotify = analysis.variant === 'NOT_PAYMENT';
  const aiMatch = analysis.variant === 'TRANSFER_OK';

  let proof: {
    notify_targets: Array<{ phone: string; label: string }>;
    is_update?: boolean;
    admin_notify_suppressed?: boolean;
  } = { notify_targets: [] };

  if (!skipNotify) {
    proof = await coreClient.registerPaymentProof(context.empresaId, {
      sale_id: pedido.pedido_id,
      branch_id: pedido.branch_id,
      client_phone: context.phone,
      expected_total: pedido.total,
      detected_amount: analysis.amount,
      ai_match: aiMatch,
      vision_summary: buildVisionSummary(analysis),
      proof_image_mime: loaded.mimeType,
      proof_image_base64: loaded.imageBase64,
    });
  }

  const matchLabel = variantLabel(analysis.variant);
  const detected = analysis.amount;

  const sentAdminNotify =
    !skipNotify && !proof.admin_notify_suppressed && proof.notify_targets.length > 0;

  if (sentAdminNotify) {
    const adminLines = [
      `POS-AI · ${context.empresaNombre}`,
      `Comprobante transferencia`,
      `Variante: ${analysis.variant}`,
      `Pedido #${pedido.pedido_id.slice(0, 8)}`,
      `Cliente: +${context.phone}`,
      `Sucursal: ${pedido.branch_name}`,
      `Esperado: ${formatClp(pedido.total)}`,
      detected != null ? `Detectado: ${formatClp(detected)}` : 'Monto: revisar imagen',
      analysis.bank ? `Banco/app: ${analysis.bank}` : null,
      analysis.rut ? `RUT detectado: ${analysis.rut}` : null,
      analysis.recipientScore != null
        ? `Coincidencia destinatario: ${Math.round(analysis.recipientScore * 100)}%`
        : null,
      analysis.recipientIssues.length ? `Destinatario: ${analysis.recipientIssues.join('; ')}` : null,
      analysis.date ? `Fecha: ${analysis.date}` : null,
      matchLabel,
      analysis.summary,
      analysis.warnings.length ? `Alertas: ${analysis.warnings.join('; ')}` : null,
      '',
      'Valida en el POS y confirma el pedido.',
    ]
      .filter(Boolean)
      .join('\n');

    for (const target of proof.notify_targets) {
      try {
        await sendWhatsAppText(target.phone, `${adminLines}\n\nDestinatario: ${target.label}`);
      } catch {
        /* continuar */
      }
    }
  }

  const adminWasNotified = sentAdminNotify || Boolean(proof.admin_notify_suppressed);

  return clientReplyForVariant(
    analysis.variant,
    pedido.pedido_id,
    pedido.total,
    detected,
    adminWasNotified,
    Boolean(proof.is_update)
  );
}
