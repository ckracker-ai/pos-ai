import crypto from 'crypto';

export function signPaymentPayload(secret: string, canonicalPayload: string): string {
  return crypto.createHmac('sha256', secret).update(canonicalPayload, 'utf8').digest('hex');
}

export function verifyPaymentSignature(
  secret: string,
  canonicalPayload: string,
  signature: string | undefined | null
): boolean {
  if (!secret) return true;
  if (!signature || !String(signature).trim()) return false;
  const expected = signPaymentPayload(secret, canonicalPayload);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature).trim(), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
