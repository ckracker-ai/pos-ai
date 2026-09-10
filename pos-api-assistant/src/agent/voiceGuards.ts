/** Guardas del canal voz: mismo pedido que WSP, nunca PAN de tarjeta. */

const CARD_BRAND = /\b(tarjeta|visa|mastercard|master card|amex|american express|cvv|cvc|clave de tarjeta)\b/i;

export function looksLikeCardPan(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  const digits = t.replace(/\D/g, '');
  if (digits.length >= 13 && digits.length <= 19) return true;
  if (CARD_BRAND.test(t) && /\d{4}/.test(t)) return true;
  return false;
}

export function voiceNoCardMessage(): string {
  return 'No te pido tarjeta por teléfono. Confirma el pedido y te mando el pago por WhatsApp.';
}

export function voiceNeedBranchMessage(): string {
  return 'Para armar el pedido dime la sucursal. Di sucursales y elige el número.';
}

export function isVoicePlaceOrderIntent(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (/^(pedido|agregar|quiero|dame|necesito)\b/.test(t)) return true;
  if (/^\d+\s*[x×]\s*\d+$/i.test(t)) return true;
  return false;
}
