const WEAK_JWT_SECRETS = new Set([
  '',
  'default_secret',
  'replace-with-strong-secret',
]);

const WEAK_INTERNAL_KEYS = new Set(['', 'supersecretkey']);

export function readInternalApiKey(): string {
  const key = String(process.env.INTERNAL_API_KEY ?? '').trim();
  if (WEAK_INTERNAL_KEYS.has(key) || key.length < 32) {
    throw new Error(
      'INTERNAL_API_KEY must be set to a unique value of at least 32 characters (not supersecretkey).'
    );
  }
  return key;
}

export function assertInternalApiKey(): void {
  readInternalApiKey();
}

export function readJwtSecret(): string {
  const secret = String(process.env.JWT_SECRET ?? '').trim();
  if (WEAK_JWT_SECRETS.has(secret) || secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be set to a unique value of at least 32 characters (not a framework default).'
    );
  }
  return secret;
}

export function assertJwtSecret(): void {
  readJwtSecret();
}
