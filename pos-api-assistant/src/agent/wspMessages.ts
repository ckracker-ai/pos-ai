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
    `• *categorias* — ver familias del menú\n` +
    `• *menu* — carta digital con precios (link web)`
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

// --- Flujo pedido / catálogo / sucursales (P2) ---

export function wspBranchList(empresaNombre: string, numberedLines: string[]): string {
  return (
    `*Sucursales de ${empresaNombre}*\n\n` +
    `${numberedLines.join('\n')}\n\n` +
    'Responde con el *número* (ej. *1*).'
  );
}

export function wspPickBranchPrompt(): string {
  return '¿En qué sucursal compras? Escribe *sucursales* y responde con el número.';
}

export function wspBranchSelected(branchName: string): string {
  return (
    `Listo ✅ Atendemos en *${branchName}*.\n\n` +
    '¿Qué buscas? Ej: *buscar empanada* · *buscar bebida*\n' +
    '📋 *menu* — carta digital con precios'
  );
}

export function wspNoCategories(): string {
  return 'Aún no hay categorías configuradas en el catálogo.';
}

export function wspCategoryMenu(resumen: string): string {
  return (
    `*Familias del menú:*\n\n${resumen}\n\n` +
    'Busca con *buscar …* (ej. *buscar empanada* o el nombre de una familia).\n' +
    'O escribe *menu* para la carta web con precios.'
  );
}

export function wspVirtualMenuLink(options: {
  title: string;
  branchName: string;
  url: string;
}): string {
  const { title, branchName, url } = options;
  return (
    `*${title}* · ${branchName}\n\n` +
    `Abre la carta digital aquí 👇\n${url}\n\n` +
    'Cuando elijas, vuelve por aquí: *buscar …* → *pedido 1x2* → *confirmar*.'
  );
}

export function wspVirtualMenuNotEnabled(branchName: string): string {
  return (
    `La carta digital de *${branchName}* aún no está publicada.\n\n` +
    'Puedes pedir por aquí con *buscar …* y *pedido …*, o vuelve a intentar más tarde.'
  );
}

export function wspVirtualMenuEmpty(options: { branchName: string; url: string }): string {
  const { branchName, url } = options;
  return (
    `*${branchName}* está actualizando su carta.\n\n` +
    `Puedes ver el menú aquí (aún sin platos):\n${url}\n\n` +
    'Mientras tanto: *buscar …* para pedir por WhatsApp.'
  );
}

export function wspVirtualMenuUnavailable(): string {
  return (
    'No pude cargar la carta digital ahora.\n' +
    'Usa *buscar …* para ver productos y armar tu pedido.'
  );
}

export function wspSearchNotFound(query: string): string {
  return `No encontré "*${query}*". Prueba otro nombre o *categorias*.`;
}

export function wspSearchResultsHeader(): string {
  return 'En tu sucursal:\n\n';
}

export function wspSearchResultsFooter(hasOpenCart: boolean): string {
  if (!hasOpenCart) {
    return (
      '\n\n📋 *Cómo pedir*\n' +
      'Escribe el *número* × cantidad → *pedido 1x2*\n' +
      'Puedes *buscar* otro producto y seguir sumando.'
    );
  }
  return (
    '\n\n🛒 *Carrito abierto*\n' +
    '• *pedido 2x1* o *agregar 1 x1*\n' +
    '• Otro producto: *buscar …* y elige número\n' +
    '• *mi pedido* · *confirmar* cuando termines'
  );
}

export function wspPedidoHelpEmpty(): string {
  return (
    'Indica qué quieres pedir:\n' +
    '• *pedido 2x2* — ítem 2 del listado, cantidad 2\n' +
    '• *pedido 5x2, 2x1* — varios ítems (coma)\n' +
    '• *pedido empanada 2* — por nombre\n\n' +
    'Primero *buscar empanada* para ver el listado numerado.'
  );
}

export function wspPedidoNeedSearchFirst(): string {
  return 'Primero escribe *buscar …* para ver el listado numerado y luego *pedido 2x2*.';
}

export function wspInvalidQtyLineItem(index: number): string {
  return `Cantidad inválida en ítem ${index}. Ejemplo: *pedido 2x2*`;
}

export function wspInvalidQty(example: string): string {
  return `Cantidad inválida. Ejemplo: *${example}*`;
}

export function wspInvalidCatalogIndex(index: number): string {
  return `No hay ítem *${index}* en tu última búsqueda. Escribe *buscar …* de nuevo.`;
}

export function wspProductNotFound(): string {
  return 'Producto no encontrado.';
}

export function wspProductNameNotFound(nameQuery: string, searchHint: string): string {
  return `No encontré "*${nameQuery}". Prueba *buscar ${searchHint}*.`;
}

export function wspStockLowHere(options: {
  productName: string;
  available: number;
  otherBranchName: string;
  otherQty: number;
}): string {
  const { productName, available, otherBranchName, otherQty } = options;
  return (
    `Solo hay ${available} u. de *${productName}* aquí.\n` +
    `En *${otherBranchName}* hay ${otherQty} u.\n\n` +
    '¿Cambiamos sucursal (*sucursales*) o apartamos lo disponible?'
  );
}

export function wspStockInsufficient(productName: string, available: number, requested: number): string {
  return `No hay stock suficiente de *${productName}* (hay ${available} u., pediste ${requested}).`;
}

export function wspOrderConfirmed(coreMessage: string): string {
  return `Pedido confirmado ✅\n\n${coreMessage}`;
}

export function wspOnlineOrderRegistered(options: {
  detailLines: string[];
  payMessage: string;
  appended: boolean;
}): string {
  const verb = options.appended ? 'Agregado' : 'Pedido registrado';
  return `${verb} ✅\n${options.detailLines.join('\n')}\n\n${options.payMessage}`;
}

export function wspFormatAddedLinesReply(options: {
  pedidoId: string;
  total: number;
  addedLines: Array<{ nombre: string; quantity: number; subtotal: number }>;
  appended: boolean;
  formatPrice: (n: number) => string;
}): string {
  const { pedidoId, total, addedLines, appended, formatPrice } = options;
  const shortId = pedidoId.slice(0, 8);
  const lines = addedLines.map((l) => `• ${l.quantity} × ${l.nombre} — ${formatPrice(l.subtotal)}`);
  const verb = appended ? 'Agregado al pedido' : 'Pedido registrado';
  return (
    `${verb} ✅\n` +
    `${lines.join('\n')}\n` +
    `Total carrito: ${formatPrice(total)}\n` +
    `Ref. #${shortId}\n\n` +
    'Puedes *buscar* otro producto y sumar más con *pedido …* o *agregar …*.\n' +
    '*mi pedido* para ver todo · *confirmar* cuando esté listo.\n' +
    '*cancelar pedido* si te equivocaste'
  );
}

export function wspGenericError(detail: string): string {
  return `Disculpa, hubo un error: ${detail}`;
}

export function wspOpenAiFallback(): string {
  return 'No pude procesar tu mensaje. Escribe *ayuda*.';
}

// --- Territorio / comuna ---

export type ComunaOption = {
  codigoCut: string;
  nombre: string;
  regionNombre?: string | null;
};

export function wspComunaNotFound(): string {
  return 'No encontré esa comuna. Prueba *comuna estacion central* o el código CUT (ej. *13106*).';
}

export function wspComunaSearchResults(options: ComunaOption[]): string {
  if (options.length === 0) return wspComunaNotFound();
  const lines = options.map(
    (c, i) =>
      `*${i + 1}.* ${c.nombre}${c.regionNombre ? ` (${c.regionNombre})` : ''} — \`${c.codigoCut}\``
  );
  return (
    `*Comunas encontradas:*\n\n${lines.join('\n')}\n\n` +
    'Responde con el *número* para ver sucursales en esa comuna.\n' +
    'También: *sucursales* para listar locales sin comuna.'
  );
}

export function wspTerritoryResolveReply(options: {
  comunaNombre: string;
  branches: Array<{ name: string; address: string | null }>;
  empresaNombre: string;
}): string {
  const { comunaNombre, branches, empresaNombre } = options;
  if (branches.length === 0) {
    return (
      `En *${comunaNombre}* no hay sucursal activa de ${empresaNombre}.\n` +
      'Prueba *sucursales* o otra comuna.'
    );
  }
  if (branches.length === 1) {
    const b = branches[0]!;
    return (
      `Sucursal en *${comunaNombre}*: *${b.name}*.\n` +
      `${b.address ? `${b.address}\n\n` : ''}` +
      'Ya puedes *buscar* productos. Ej: *buscar empanada*'
    );
  }
  const lines = branches.map((b, i) => `${i + 1}. ${b.name}${b.address ? ` — ${b.address}` : ''}`);
  return (
    `Sucursales en *${comunaNombre}*:\n\n${lines.join('\n')}\n\n` +
    'Responde con el *número* para elegir sucursal (igual que *sucursales*).'
  );
}
