import type { PosAiIntent, PosAiResult } from './posAiTypes';

const INTENT_LABELS: Record<PosAiIntent, string> = {
  ADD_TO_CART: 'Agregar al carrito',
  REMOVE_FROM_CART: 'Quitar del carrito',
  CLEAR_CART: 'Vaciar carrito',
  SUBMIT_SALE: 'Finalizar venta',
  UNKNOWN: 'Sin interpretar',
};

export function formatPosAiSummary(result: PosAiResult): string {
  const intent = INTENT_LABELS[result.intent] ?? result.intent;
  const actions =
    result.actions.length > 0
      ? result.actions
          .map((a) => `${a.action} ×${a.quantity}`)
          .join(', ')
      : '—';
  return `${intent} · ${actions}`;
}
