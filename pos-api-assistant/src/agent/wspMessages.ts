/** Copys WSP P2 — tono claro, pasos numerados, sin jerga técnica. */

export function wspHelp(empresaNombre: string): string {
  return (
    `Hola 👋 Soy el asistente de *${empresaNombre}*.\n\n` +
    `*Pedir en 3 pasos*\n` +
    `1️⃣ *sucursales* o *comuna [nombre]* → elige local\n` +
    `2️⃣ *buscar [producto]* → elige número × cantidad (*pedido 1x2*)\n` +
    `3️⃣ *confirmar* → datos de pago y comprobante\n\n` +
    `*Útiles*\n` +
    `• *mi pedido* — ver carrito\n` +
    `• *agregar 2x1* — suma al mismo pedido\n` +
    `• *cancelar pedido* — anular y empezar de nuevo\n` +
    `• *categorias* — ver familias del menú`
  );
}

export function wspTransferProfileIncomplete(): string {
  return (
    'El local aún no tiene *datos de transferencia* configurados.\n\n' +
    'No podemos enviarte la cuenta por aquí. El administrador debe completarlos en *Empresa → Transferencia*.\n' +
    'Intenta de nuevo más tarde o contacta al local.'
  );
}

export function wspNoPendingToConfirm(): string {
  return (
    'No hay pedido listo para confirmar.\n\n' +
    'Primero: *buscar …* → *pedido 1 x2* → luego *confirmar*.'
  );
}

export function wspNoPendingOrder(): string {
  return 'No tienes pedidos abiertos. Usa *buscar …* y *pedido 1 x2* para armar uno.';
}

export function wspNoPendingToCancel(): string {
  return 'No hay pedido pendiente que cancelar.';
}

export function wspPendingPaymentBlock(pedidoId: string, totalLabel: string): string {
  return (
    `Tienes un pedido en *pago* #${pedidoId} (${totalLabel}).\n\n` +
    '• Envía *foto del comprobante*\n' +
    '• O escribe *vale [monto]* y luego la foto\n' +
    '• *mi pedido* — ver detalle'
  );
}

export function wspShowPendingHeader(pedidoId: string, branchName: string, totalLabel: string): string {
  return `*Tu pedido* #${pedidoId}\n📍 ${branchName}\n💰 Total: ${totalLabel}\n`;
}

export function wspShowPendingConfirmStep(): string {
  return (
    '¿Todo correcto?\n' +
    'Escribe *confirmar* para recibir datos de transferencia.\n' +
    '¿Te equivocaste? *cancelar pedido* y vuelve a pedir.'
  );
}

export function wspShowPendingProofStep(): string {
  return (
    'Pedido confirmado ✅\n\n' +
    'Envía el *comprobante* (foto) o escribe *vale [monto]* antes de la foto.'
  );
}

export function wspOrderCancelled(pedidoId: string, totalLabel: string): string {
  return (
    `Pedido #${pedidoId} *cancelado* ✅\n` +
    `(Total era ${totalLabel})\n\n` +
    'Stock liberado. Para pedir de nuevo:\n' +
    '*buscar empanada* → *pedido 1 x2*'
  );
}

export function wspProofReceived(): string {
  return (
    'Recibimos tu comprobante 📎\n' +
    'Lo revisamos y te avisamos por aquí en breve.'
  );
}

export function wspProofDuplicate(): string {
  return (
    'Ya teníamos registrado un comprobante para este pedido.\n' +
    'Si enviaste uno nuevo, un asesor lo revisará.'
  );
}

export function wspProofWrongAccount(): string {
  return (
    '⚠️ El destinatario no coincide con la cuenta de transferencia del comercio.\n\n' +
    'Verifica banco, RUT y cuenta que te enviamos al *confirmar*.\n' +
    'Si pagaste bien, reenvía la foto o contacta al local.'
  );
}

export function wspProofOnlinePlan(): string {
  return 'Tu plan usa *pago en línea*. Usa el link que te enviamos al *confirmar*.';
}

export function wspProofNeedConfirmFirst(): string {
  return (
    'Primero confirma tu pedido:\n' +
    '*buscar …* → *pedido …* → *confirmar*\n\n' +
    'Luego envía el comprobante o el link de pago.'
  );
}

export function wspPaymentApproved(clientMessage?: string): string {
  const extra = clientMessage?.trim();
  if (extra) return `Pago confirmado ✅\n\n${extra}`;
  return 'Pago confirmado ✅\n\nTu pedido quedó registrado. ¡Gracias!';
}

export function wspProofNotPaymentImage(): string {
  return (
    'La imagen no parece un comprobante de transferencia.\n' +
    'Envía una *captura* de tu app bancaria (BancoEstado, BCI, Santander, Mach, etc.) ' +
    'donde se vea monto y destinatario.'
  );
}

export function wspProofPdfUnsupported(): string {
  return (
    'Recibimos un PDF. Por ahora envía una *captura* (JPG/PNG) del comprobante desde tu app bancaria.'
  );
}

export function wspProofFormatUnsupported(): string {
  return 'Formato no soportado. Envía una *foto* o captura del comprobante (JPG/PNG).';
}

export function wspProofOnlinePlanWithTransferNote(): string {
  return (
    'Tu plan incluye *pago en línea*. Usa el link que te enviamos al *confirmar*.\n' +
    'Si ya pagaste en línea, no necesitas enviar comprobante por transferencia.'
  );
}

export function wspProofAwaitingConfirmForText(): string {
  return (
    'Tu pedido aún no está confirmado.\n' +
    'Escribe *mi pedido* para revisar y *confirmar* cuando esté bien.\n' +
    'Después podrás enviar el comprobante.'
  );
}

export function wspProofAwaitingConfirmForImage(): string {
  return (
    'Tu pedido aún no está confirmado.\n' +
    'Escribe *confirmar* para recibir datos de transferencia y luego envía la foto del comprobante.'
  );
}

export function wspProofTextClaimHint(options: {
  pedidoId: string;
  totalLabel: string;
  amountLine?: string;
}): string {
  const { pedidoId, totalLabel, amountLine = '' } = options;
  const shortId = pedidoId.slice(0, 8);
  return (
    `Pedido pendiente #${shortId} · Total ${totalLabel}${amountLine}\n\n` +
    'Ahora envía la *foto del comprobante* (botón 📷 Imagen).\n' +
    'El monto que escribiste se usará aunque la IA no lea la imagen.'
  );
}

export function wspProofNoPendingForProof(): string {
  return 'No encontré un pedido pendiente. Primero arma un pedido con *buscar* y *pedido*.';
}

type ProofVariantReplyOpts = {
  shortId: string;
  variantLabel: string;
  expectedLabel: string;
  detectedLabel: string | null;
  notified: boolean;
  proofUpdated?: boolean;
};

export function wspProofUnclearReply(opts: ProofVariantReplyOpts): string {
  const { shortId, notified, proofUpdated } = opts;
  if (notified) {
    const head = `Recibimos tu comprobante 📎 (pedido #${shortId})\n`;
    const body = proofUpdated
      ? 'Actualizamos la imagen. El local ya fue avisado; revisará manualmente.\n\n'
      : 'La lectura automática no fue concluyente; el *local revisará la imagen*.\n\n';
    return head + body + 'Tip: antes de la foto escribe *vale 5000* o pon el monto en el caption al enviar la imagen.';
  }
  return (
    'No logramos leer bien el comprobante 📷\n' +
    'Reenvía una captura completa o escribe *vale 5000* justo antes de la foto.'
  );
}

export function wspProofNoAmountReply(opts: ProofVariantReplyOpts): string {
  const { shortId, notified, proofUpdated } = opts;
  if (notified) {
    const head = `Recibimos tu comprobante 📎 (pedido #${shortId})\n`;
    const body = proofUpdated
      ? 'Actualizamos la imagen. El local ya fue avisado y validará el pago.\n\n'
      : 'Guardamos la imagen para que el *local valide el pago*.\n\n';
    return (
      head +
      body +
      'Para la próxima: escribe *vale 5000* (o el total) *antes* de enviar la foto, ' +
      'o escríbelo en el caption junto a 📷 Imagen.'
    );
  }
  return (
    `Recibimos tu imagen (pedido #${shortId}) pero no vimos el monto.\n` +
    'Escribe *vale 5000* y luego envía la foto, o indica el monto en el caption de la imagen.'
  );
}

export function wspProofPartialReply(opts: ProofVariantReplyOpts): string {
  const { shortId, variantLabel, expectedLabel, detectedLabel, notified } = opts;
  const detectedPart =
    detectedLabel != null ? ` · Detectado: ${detectedLabel}` : '';
  return (
    `Recibimos tu comprobante 📎 (pedido #${shortId})\n` +
    `${variantLabel}\n` +
    `Total pedido: ${expectedLabel}${detectedPart}\n\n` +
    'Si el monto del pedido está mal, escribe *cancelar pedido* y pide de nuevo con la cantidad correcta.' +
    (notified ? '\n\nNotificamos al local para revisión.' : '')
  );
}

export function wspProofOverpayReply(opts: ProofVariantReplyOpts): string {
  const { shortId, variantLabel, expectedLabel, detectedLabel } = opts;
  const amountLine =
    detectedLabel != null
      ? `Detectado: ${detectedLabel} · Esperado: ${expectedLabel}\n\n`
      : '';
  return (
    `Recibimos tu comprobante 📎\n` +
    `Pedido #${shortId}\n` +
    `${variantLabel}\n` +
    amountLine +
    'Si te equivocaste al pedir, escribe *cancelar pedido* y arma uno nuevo.\n' +
    'El equipo del local también puede revisar el pago.'
  );
}

export function wspProofWrongRecipientReply(shortId: string, variantLabel: string): string {
  return (
    `Recibimos tu comprobante 📎 (pedido #${shortId})\n` +
    `${variantLabel}\n\n` +
    'Verifica que transferiste a la *cuenta y RUT* que te enviamos al *confirmar*.\n' +
    'Si fue a otra cuenta, contacta al local antes de reenviar.'
  );
}

export function wspProofRecipientUnclearReply(opts: ProofVariantReplyOpts): string {
  const { shortId, variantLabel, notified } = opts;
  return (
    `Recibimos tu comprobante 📎\n` +
    `Pedido #${shortId}\n` +
    `${variantLabel}\n\n` +
    (notified
      ? 'Notificamos al local para validar destinatario y monto.'
      : 'El comercio validará manualmente.')
  );
}

export function wspProofDefaultReply(opts: ProofVariantReplyOpts): string {
  const { shortId, variantLabel, notified, proofUpdated } = opts;
  const footer = notified
    ? proofUpdated
      ? 'Actualizamos tu comprobante. El administrador ya fue avisado; validará en el POS.'
      : 'Notificamos al administrador del local para validación. Te avisamos cuando confirmen el pago.'
    : 'Aún no hay teléfono admin WSP configurado; el comercio validará manualmente en el POS.';
  return (
    `Recibimos tu comprobante 📎\n` +
    `Pedido #${shortId}\n` +
    `${variantLabel}\n\n` +
    footer
  );
}
