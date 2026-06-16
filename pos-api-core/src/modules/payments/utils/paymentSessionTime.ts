/** Minutos de vigencia de una sesión Webpay en PENDING (Transbank ~15 min). */
export const PAYMENT_SESSION_TTL_MINUTES = 15;

export function addMinutes(base: Date, minutes: number): Date {
  const d = new Date(base);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

export function paymentSessionExpiresAt(from = new Date(), minutes = PAYMENT_SESSION_TTL_MINUTES): Date {
  return addMinutes(from, minutes);
}
