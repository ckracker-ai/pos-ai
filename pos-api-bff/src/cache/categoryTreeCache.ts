/** Cache corto del árbol de categorías (S1 B2) — reduce latencia assistant/UI. */

const DEFAULT_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { data: unknown; expiresAt: number };

const store = new Map<string, CacheEntry>();

function ttlMs(): number {
  const raw = Number(process.env.CATEGORY_TREE_CACHE_TTL_MS ?? DEFAULT_TTL_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_MS;
}

export function categoryTreeCacheKey(
  token: string,
  branchId: string,
  activeOnly: boolean
): string {
  const fingerprint = token.length > 24 ? token.slice(-24) : token;
  return `${fingerprint}:${branchId}:${activeOnly ? '1' : '0'}`;
}

export function getCategoryTreeCached(key: string): unknown | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function setCategoryTreeCached(key: string, data: unknown): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs() });
}

export function invalidateCategoryTreeCache(): void {
  store.clear();
}
