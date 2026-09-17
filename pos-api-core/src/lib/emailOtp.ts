import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { getRedis } from './redis';
import { readJwtSecret } from '../config/secrets';
import { Result, fail, ok } from '../types/result';

export const EMAIL_OTP_PURPOSES = ['registro', 'password_reset'] as const;
export type EmailOtpPurpose = (typeof EMAIL_OTP_PURPOSES)[number];

const OTP_TTL_SEC = 10 * 60;
const COOLDOWN_SEC = 60;
const MAX_ATTEMPTS = 5;

type StoredOtp = { hash: string; attempts: number };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function otpKey(purpose: EmailOtpPurpose, email: string): string {
  return `otp:v1:${purpose}:${normalizeEmail(email)}`;
}

function cooldownKey(purpose: EmailOtpPurpose, email: string): string {
  return `otp:cd:${purpose}:${normalizeEmail(email)}`;
}

function hashOtp(purpose: EmailOtpPurpose, email: string, code: string): string {
  return createHash('sha256')
    .update(`${purpose}:${normalizeEmail(email)}:${code}:${readJwtSecret()}`)
    .digest('hex');
}

export function generateSixDigitOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function formatOtpForDisplay(code: string): string {
  return code.replace(/\D/g, '').slice(0, 6).split('').join(' ');
}

export async function issueEmailOtp(
  purpose: EmailOtpPurpose,
  email: string
): Promise<Result<{ code: string; ttlSec: number }>> {
  const redis = await getRedis();
  if (!redis) return fail('OTP_STORE_UNAVAILABLE');

  const cd = cooldownKey(purpose, email);
  const remaining = await redis.ttl(cd);
  if (remaining > 0) return fail('OTP_COOLDOWN');

  const code = generateSixDigitOtp();
  const stored: StoredOtp = { hash: hashOtp(purpose, email, code), attempts: 0 };
  await redis.set(otpKey(purpose, email), JSON.stringify(stored), { EX: OTP_TTL_SEC });
  await redis.set(cd, '1', { EX: COOLDOWN_SEC });
  return ok({ code, ttlSec: OTP_TTL_SEC });
}

export async function discardEmailOtp(purpose: EmailOtpPurpose, email: string): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;
  await redis.del(otpKey(purpose, email));
}

async function matchStoredOtp(
  purpose: EmailOtpPurpose,
  email: string,
  code: string,
  consume: boolean
): Promise<Result<{ consumed: boolean }>> {
  const redis = await getRedis();
  if (!redis) return fail('OTP_STORE_UNAVAILABLE');

  const digits = String(code ?? '').replace(/\D/g, '');
  if (!/^\d{6}$/.test(digits)) return fail('EMAIL_OTP_INVALID');

  const key = otpKey(purpose, email);
  const raw = await redis.get(key);
  if (!raw) return fail('EMAIL_OTP_INVALID');

  let stored: StoredOtp;
  try {
    stored = JSON.parse(raw) as StoredOtp;
  } catch {
    await redis.del(key);
    return fail('EMAIL_OTP_INVALID');
  }

  if (stored.attempts >= MAX_ATTEMPTS) {
    await redis.del(key);
    return fail('EMAIL_OTP_LOCKED');
  }

  const expected = Buffer.from(stored.hash, 'hex');
  const actual = Buffer.from(hashOtp(purpose, email, digits), 'hex');
  const match = expected.length === actual.length && timingSafeEqual(expected, actual);
  if (!match) {
    stored.attempts += 1;
    const ttl = await redis.ttl(key);
    if (ttl > 0) {
      await redis.set(key, JSON.stringify(stored), { EX: ttl });
    }
    return fail('EMAIL_OTP_INVALID');
  }

  if (consume) {
    await redis.del(key);
  }
  return ok({ consumed: consume });
}

export async function verifyEmailOtp(
  purpose: EmailOtpPurpose,
  email: string,
  code: string
): Promise<Result<{ consumed: boolean }>> {
  return matchStoredOtp(purpose, email, code, false);
}

export async function consumeEmailOtp(
  purpose: EmailOtpPurpose,
  email: string,
  code: string
): Promise<Result<{ consumed: true }>> {
  const result = await matchStoredOtp(purpose, email, code, true);
  if (!result.success) return result;
  return ok({ consumed: true });
}
