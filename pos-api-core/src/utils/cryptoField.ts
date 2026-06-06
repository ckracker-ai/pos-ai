import * as crypto from 'crypto';

const ENC_PREFIX = 'enc:v1:';

let warnedMissingKey = false;

function resolveKey(): Buffer | null {
  const b64 = process.env.FIELD_ENCRYPTION_KEY_B64?.trim();
  if (b64) {
    try {
      const key = Buffer.from(b64, 'base64');
      if (key.length >= 32) return key.subarray(0, 32);
    } catch {
      return null;
    }
  }

  const raw = process.env.FIELD_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  const key = Buffer.from(raw, 'utf8');
  if (key.length < 32) return null;
  return key.subarray(0, 32);
}

function requireKey(): Buffer {
  const key = resolveKey();
  if (!key) {
    throw new Error('FIELD_ENCRYPTION_KEY_MISSING_OR_TOO_SHORT');
  }
  return key;
}

export function encryptField(value: string | null | undefined): string | null {
  if (value == null) return null;
  const plain = String(value).trim();
  if (!plain) return null;
  if (plain.startsWith(ENC_PREFIX)) return plain;

  const key = requireKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptField(value: string | null | undefined): string | null {
  if (value == null) return null;
  const raw = String(value);
  if (!raw) return null;
  if (!raw.startsWith(ENC_PREFIX)) return raw;

  const key = resolveKey();
  if (!key) {
    if (!warnedMissingKey) {
      console.warn('⚠️  FIELD_ENCRYPTION_KEY missing; encrypted fields cannot be decrypted');
      warnedMissingKey = true;
    }
    return null;
  }

  const payload = raw.slice(ENC_PREFIX.length);
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) return null;

  try {
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(dataB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

