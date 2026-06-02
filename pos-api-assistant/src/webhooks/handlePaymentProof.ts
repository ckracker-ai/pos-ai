import { buildSession } from '../agent/runAgent.js';
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
  notified: boolean
): string {
  const shortId = pedidoId.slice(0, 8);

  switch (variant) {
    case 'NOT_PAYMENT':
      return (
        'La imagen no parece un comprobante de transferencia bancaria.\n' +
        'Envía una *captura de pantalla* de tu app bancaria (BancoEstado, BCI, Santander, Mach, etc.) ' +
        'donde se vea el monto y la transferencia.'
      );
    case 'UNCLEAR':
      return notified
        ? `Recibimos tu comprobante 📎 (pedido #${shortId})\n` +
            'La lectura automática no fue concluyente; el *local revisará la imagen* manualmente.\n\n' +
            'Tip: antes de la foto escribe *vale 5000* o pon el monto en el caption al enviar la imagen.'
        : 'No logramos leer bien el comprobante 📷\n' +
            'Reenvía una captura completa o escribe *vale 5000* justo antes de la foto.';
    case 'NO_AMOUNT':
      return notified
        ? `Recibimos tu comprobante 📎 (pedido #${shortId})\n` +
            'Guardamos la imagen para que el *local valide el pago*.\n\n' +
            'Para la próxima: escribe *vale 5000* (o el total) *antes* de enviar la foto, ' +
            'o escríbelo en el campo caption junto a 📷 Imagen.'
        : `Recibimos tu imagen (pedido #${shortId}) pero no vimos el monto.\n` +
            'Escribe *vale 5000* y luego envía la foto, o indica el monto en el caption de la imagen.';
    case 'TRANSFER_PARTIAL':
      return (
        `Recibimos tu comprobante 📎 (pedido #${shortId})\n` +
        `${variantLabel(variant)}\n` +
        `Total pedido: ${formatClp(expected)}` +
        (detected != null ? ` · Detectado: ${formatClp(detected)}` : '') +
        '\n\nSi el monto del pedido está mal, escribe *cancelar pedido* y pide de nuevo con la cantidad correcta.' +
        (notified ? '\n\nNotificamos al local para revisión.' : '')
      );
    case 'TRANSFER_OVERPAY':
    case 'TRANSFER_AMOUNT_MISMATCH':
      return (
        `Recibimos tu comprobante 📎\n` +
        `Pedido #${shortId}\n` +
        `${variantLabel(variant)}\n` +
        (detected != null ? `Detectado: ${formatClp(detected)} · Esperado: ${formatClp(expected)}\n\n` : '') +
        'Si te equivocaste al pedir, escribe *cancelar pedido* y arma uno nuevo.\n' +
        'El equipo del local también puede revisar el pago.'
      );
    case 'WRONG_RECIPIENT':
      return (
        `Recibimos tu comprobante 📎 (pedido #${shortId})\n` +
        `${variantLabel(variant)}\n\n` +
        'Verifica que transferiste a la *cuenta y RUT* que te enviamos al confirmar el pedido.\n' +
        'Si fue a otra cuenta, contacta al local antes de reenviar.'
      );
    case 'AMOUNT_OK_RECIPIENT_UNCLEAR':
      return (
        `Recibimos tu comprobante 📎\n` +
        `Pedido #${shortId}\n` +
        `${variantLabel(variant)}\n\n` +
        (notified
          ? 'Notificamos al local para validar destinatario y monto.'
          : 'El comercio validará manualmente.')
      );
    default:
      return (
        `Recibimos tu comprobante 📎\n` +
        `Pedido #${shortId}\n` +
        `${variantLabel(variant)}\n\n` +
        (notified
          ? 'Notificamos al equipo del local para validación. Te avisamos cuando confirmen el pago.'
          : 'Aún no hay vendedor/admin con WhatsApp en esta sucursal; el comercio validará manualmente.')
      );
  }
}

async function loadImageFromIncoming(
  incoming: ProofIncoming
): Promise<{ imageBase64: string; mimeType: string; caption?: string } | { error: string }> {
  if (incoming.kind === 'document') {
    if (incoming.mimeType.includes('pdf')) {
      return {
        error:
          'Recibimos un PDF. Por ahora envía una *captura de pantalla* (JPG/PNG) del comprobante desde tu app bancaria.',
      };
    }
    const { buffer, mimeType } = await downloadMetaMedia(incoming.mediaId);
    if (!mimeType.startsWith('image/')) {
      return {
        error:
          'Formato no soportado. Envía una *foto* o captura del comprobante de transferencia (JPG/PNG).',
      };
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
    return 'Tu plan usa *pago en línea*. Usa el link que te enviamos al confirmar el pedido.';
  }

  rememberPaymentHint(from, text);
  const parsedAmount = parseAmountFromCaption(text);

  try {
    const pedido = await coreClient.findPendingOrder(context.empresaId, context.phone);
    if (pedido.awaiting_customer_confirm) {
      return (
        'Tu pedido aún no está confirmado.\n' +
        'Escribe *mi pedido* para revisar y *confirmar* cuando esté bien.\n' +
        'Después podrás enviar el comprobante.'
      );
    }
    const amountLine = parsedAmount
      ? `\n\n✓ Anoté monto *${formatClp(parsedAmount)}* para tu próxima foto.`
      : '';
    return (
      `Pedido pendiente #${pedido.pedido_id.slice(0, 8)} · Total ${formatClp(pedido.total)}` +
      amountLine +
      '\n\nAhora envía la *foto del comprobante* (botón 📷 Imagen).\n' +
      'El monto que escribiste se usará aunque la IA no lea la imagen.'
    );
  } catch {
    return 'No encontré un pedido pendiente. Primero arma un pedido con *buscar* y *pedido*.';
  }
}

export async function handlePaymentProofImage(incoming: ProofIncoming): Promise<string> {
  const session = await buildSession(incoming.from);
  const { context } = session;

  if (context.features.pagosOnline) {
    return (
      'Tu plan incluye *pago en línea*. Usa el link que te enviamos al confirmar el pedido.\n' +
      'Si ya pagaste en línea, no necesitas enviar comprobante por transferencia.'
    );
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
    return 'No encontré un pedido pendiente a tu nombre. Primero arma un pedido con *buscar* y *pedido*.';
  }

  if (pedido.awaiting_customer_confirm) {
    return (
      'Tu pedido aún no está confirmado.\n' +
      'Escribe *confirmar* para recibir datos de transferencia y luego envía la foto del comprobante.'
    );
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

  let proof: { notify_targets: Array<{ phone: string; label: string }> } = { notify_targets: [] };

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

  if (!skipNotify) {
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

  return clientReplyForVariant(
    analysis.variant,
    pedido.pedido_id,
    pedido.total,
    detected,
    proof.notify_targets.length > 0
  );
}
