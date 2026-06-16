import { getRedis } from './redis';

export type JobLockResult<T> =
  | { acquired: true; value: T }
  | { acquired: false; skipped: true; reason: 'LOCK_HELD' };

/**
 * Ejecuta `fn` solo si adquiere lock distribuido (NX).
 * Sin Redis: ejecuta siempre (comportamiento single-instance).
 */
export async function withJobLock<T>(
  lockName: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<JobLockResult<T>> {
  const redis = await getRedis();
  if (!redis) {
    return { acquired: true, value: await fn() };
  }

  const key = `job:lock:${lockName}`;
  const acquired = await redis.set(key, String(Date.now()), { NX: true, EX: ttlSeconds });
  if (acquired !== 'OK') {
    return { acquired: false, skipped: true, reason: 'LOCK_HELD' };
  }

  try {
    return { acquired: true, value: await fn() };
  } finally {
    await redis.del(key).catch(() => undefined);
  }
}
