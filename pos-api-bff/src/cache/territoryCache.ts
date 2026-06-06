/** Cache lectura CUT (S2 B4) — regiones y comunas por región, sin HTTP externo en cada request. */

const TTL_MS = Number(process.env.TERRITORY_CACHE_TTL_MS ?? 24 * 60 * 60 * 1000);

type Entry<T> = { data: T; expiresAt: number };

const regionsStore = new Map<string, Entry<unknown>>();
const comunasByRegion = new Map<string, Entry<unknown>>();

function get<T>(store: Map<string, Entry<unknown>>, key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

function set(store: Map<string, Entry<unknown>>, key: string, data: unknown): void {
  store.set(key, { data, expiresAt: Date.now() + TTL_MS });
}

export function territoryRegionsCacheKey(token: string): string {
  const fp = token.length > 24 ? token.slice(-24) : token;
  return `regions:${fp}`;
}

export function territoryComunasCacheKey(token: string, regionId: string): string {
  const fp = token.length > 24 ? token.slice(-24) : token;
  return `comunas:${fp}:${regionId}`;
}

export function getCachedRegions(key: string): unknown | null {
  return get(regionsStore, key);
}

export function setCachedRegions(key: string, data: unknown): void {
  set(regionsStore, key, data);
}

export function getCachedComunas(key: string): unknown | null {
  return get(comunasByRegion, key);
}

export function setCachedComunas(key: string, data: unknown): void {
  set(comunasByRegion, key, data);
}
