import { createClient } from 'redis';

export type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let connectPromise: Promise<RedisClient | null> | null = null;

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

export async function getRedis(): Promise<RedisClient | null> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  if (client?.isOpen) return client;

  if (!connectPromise) {
    connectPromise = (async () => {
      try {
        const next = createClient({ url });
        next.on('error', (err) => {
          console.warn('[redis] bff client error:', err.message);
        });
        await next.connect();
        client = next;
        console.info('[redis] bff connected');
        return client;
      } catch (err) {
        console.warn('[redis] bff connect failed:', err);
        client = null;
        return null;
      } finally {
        connectPromise = null;
      }
    })();
  }

  return connectPromise;
}
