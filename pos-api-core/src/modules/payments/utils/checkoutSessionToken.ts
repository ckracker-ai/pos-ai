import crypto from 'crypto';
import type { PaymentKind } from '../types.js';

export type CheckoutSessionTokenPayload = {
  v: 1;
  empresaId: string;
  kind: PaymentKind;
  provider: string;
  externalId: string;
  amount: number;
  currency: string;
  exp: number;
};

function b64urlEncode(buf: Buffer): string {
  return buf.toString('base64url');
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s, 'base64url');
}

export function issueCheckoutSessionToken(
  secret: string,
  payload: Omit<CheckoutSessionTokenPayload, 'v' | 'exp'> & { ttlSec?: number }
): string {
  const body: CheckoutSessionTokenPayload = {
    v: 1,
    empresaId: payload.empresaId,
    kind: payload.kind,
    provider: payload.provider,
    externalId: payload.externalId,
    amount: payload.amount,
    currency: payload.currency,
    exp: Math.floor(Date.now() / 1000) + (payload.ttlSec ?? 3600),
  };
  const json = JSON.stringify(body);
  const sig = crypto.createHmac('sha256', secret).update(json, 'utf8').digest('base64url');
  return `${b64urlEncode(Buffer.from(json, 'utf8'))}.${sig}`;
}

export function verifyCheckoutSessionToken(
  secret: string,
  token: string
): { ok: true; value: CheckoutSessionTokenPayload } | { ok: false; error: string } {
  const parts = String(token).split('.');
  if (parts.length !== 2) return { ok: false, error: 'INVALID_TOKEN' };
  const [payloadB64, sig] = parts;
  let json: string;
  try {
    json = b64urlDecode(payloadB64).toString('utf8');
  } catch {
    return { ok: false, error: 'INVALID_TOKEN' };
  }
  const expectedSig = crypto.createHmac('sha256', secret).update(json, 'utf8').digest('base64url');
  const a = Buffer.from(expectedSig);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: 'INVALID_TOKEN_SIGNATURE' };
  }
  let parsed: CheckoutSessionTokenPayload;
  try {
    parsed = JSON.parse(json) as CheckoutSessionTokenPayload;
  } catch {
    return { ok: false, error: 'INVALID_TOKEN' };
  }
  if (parsed.v !== 1 || !parsed.empresaId || !parsed.externalId) {
    return { ok: false, error: 'INVALID_TOKEN' };
  }
  if (parsed.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: 'TOKEN_EXPIRED' };
  }
  return { ok: true, value: parsed };
}
