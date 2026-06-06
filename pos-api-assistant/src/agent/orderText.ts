/** Texto que pertenece al flujo de pedido (no a comprobante / monto). */

const ORDER_VERB =
  /^(pedido|agregar|quiero|buscar|stock|sucursales|confirmar|cancelar|mi\s+pedido|ayuda|help|menu)\b/i;

const LINE_NxQ = /^(\d+)\s*[x×]\s*(\d+)$/i;
const LINE_N_SPACE_Q = /^(\d+)\s+(\d+)$/;

export type PedidoLine = { index: number; qty: number };

export function isOrderCommandText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (ORDER_VERB.test(t)) return true;
  if (LINE_NxQ.test(t)) return true;
  if (parsePedidoLines(t)) return true;
  return false;
}

/** Ej: `5x2`, `5 x 2`, `5x2, 2 x 1, 13x1` o `2 3` (una línea). */
export function parsePedidoLines(body: string): PedidoLine[] | null {
  const raw = body.trim();
  if (!raw) return null;

  const segments = raw.includes(',') ? raw.split(',').map((s) => s.trim()) : [raw];
  const lines: PedidoLine[] = [];

  for (const seg of segments) {
    if (!seg) return null;
    const mX = seg.match(LINE_NxQ);
    if (mX) {
      lines.push({ index: Number(mX[1]), qty: Number(mX[2]) });
      continue;
    }
    const mSp = seg.match(LINE_N_SPACE_Q);
    if (mSp) {
      lines.push({ index: Number(mSp[1]), qty: Number(mSp[2]) });
      continue;
    }
    if (segments.length === 1) return null;
    return null;
  }

  return lines.length > 0 ? lines : null;
}
