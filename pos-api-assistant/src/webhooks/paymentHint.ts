import { parseAmountFromCaption } from '../vision/transferAnalysis.js';

const TTL_MS = 15 * 60 * 1000;

const hints = new Map<string, { caption: string; at: number }>();

/** Cliente escribe "vale 5000" antes de la foto — se usa al procesar la imagen. */
export function rememberPaymentHint(phone: string, text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  hints.set(phone.replace(/\D/g, ''), { caption: trimmed, at: Date.now() });
}

export function peekPaymentHint(phone: string): string | undefined {
  const key = phone.replace(/\D/g, '');
  const h = hints.get(key);
  if (!h) return undefined;
  if (Date.now() - h.at > TTL_MS) {
    hints.delete(key);
    return undefined;
  }
  return h.caption;
}

/** Caption de la imagen tiene prioridad; si no, usa hint reciente y lo consume. */
export function resolvePaymentCaption(phone: string, imageCaption?: string): string | undefined {
  const key = phone.replace(/\D/g, '');
  const direct = imageCaption?.trim();
  if (direct) {
    hints.delete(key);
    return direct;
  }
  const h = hints.get(key);
  if (!h) return undefined;
  if (Date.now() - h.at > TTL_MS) {
    hints.delete(key);
    return undefined;
  }
  hints.delete(key);
  return h.caption;
}

export function isLikelyPaymentAmountText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/^(vale|ya\s+pagu)/i.test(t)) return true;
  if (/^\$?\d{1,3}(\.\d{3})+$/.test(t)) return true;
  if (/^\d{4,}$/.test(t)) return true;
  return parseAmountFromCaption(t) != null;
}
