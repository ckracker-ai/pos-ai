/** Flujo carrito WSP: varias búsquedas y agregar ítems antes de *confirmar*. */

export type CartLineSummary = { nombre: string; quantity: number; subtotal: number };

export function canAppendToOpenCart(awaitingCustomerConfirm: boolean): boolean {
  return awaitingCustomerConfirm;
}

export function branchSelectedSearchPrompt(branchName: string): string {
  return `Listo ✅ Atendemos en *${branchName}*.\n\n¿Qué buscas? Ej: *buscar empanada* · *buscar bebida*`;
}

export function searchResultsFooter(hasOpenCart: boolean): string {
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

export function formatAddedLinesReply(options: {
  pedidoId: string;
  total: number;
  addedLines: CartLineSummary[];
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
