import { getRedis } from './redis';

export type CachedAuthUser = {
  userId: string;
  roleId: string;
  roleName: string;
  empresaId: string;
  branchId: string;
  isActive: boolean;
};

const DEFAULT_TTL_SEC = Math.max(
  60,
  Number.parseInt(process.env.AUTH_USER_CACHE_TTL_SEC ?? '600', 10) || 600
);

function cacheKey(userId: string): string {
  return `auth:user:${userId}`;
}

export async function getCachedAuthUser(userId: string): Promise<CachedAuthUser | null> {
  const redis = await getRedis();
  if (!redis) return null;

  const raw = await redis.get(cacheKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CachedAuthUser;
    if (!parsed?.userId || parsed.userId !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setCachedAuthUser(user: CachedAuthUser): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;

  await redis.set(cacheKey(user.userId), JSON.stringify(user), { EX: DEFAULT_TTL_SEC });
}

export async function invalidateAuthUserCache(userId: string): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;

  await redis.del(cacheKey(userId));
}
