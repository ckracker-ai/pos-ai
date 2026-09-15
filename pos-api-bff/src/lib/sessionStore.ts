import { randomBytes } from 'crypto';
import { getRedis } from './redis.js';

export type SessionKind = 'tenant' | 'platform';

export type StoredSession = {
  kind: SessionKind;
  accessToken: string;
  user: Record<string, unknown>;
  branchId?: string;
  supportSession?: boolean;
  supportExpiresAt?: string;
};

const KEY_PREFIX = 'sess:';

function key(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

export function newSessionId(): string {
  return randomBytes(32).toString('base64url');
}

export async function saveSession(
  id: string,
  session: StoredSession,
  ttlSec: number
): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return false;
  const ttl = Math.max(60, Math.floor(ttlSec));
  await redis.set(key(id), JSON.stringify(session), { EX: ttl });
  return true;
}

export async function readSession(id: string): Promise<StoredSession | null> {
  if (!id) return null;
  const redis = await getRedis();
  if (!redis) return null;
  const raw = await redis.get(key(id));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.accessToken || (parsed.kind !== 'tenant' && parsed.kind !== 'platform')) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function destroySession(id: string): Promise<void> {
  if (!id) return;
  const redis = await getRedis();
  if (!redis) return;
  await redis.del(key(id));
}
