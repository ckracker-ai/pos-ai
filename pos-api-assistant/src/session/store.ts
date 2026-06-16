import type { Session } from '../agent/runAgent.js';
import { getRedis } from '../lib/redis.js';

const memory = new Map<string, Session>();

const SESSION_TTL_SEC = Math.max(
  300,
  Number.parseInt(process.env.ASSISTANT_SESSION_TTL_SEC ?? '1800', 10) || 1800
);

function sessionKey(channel: string, externalId: string): string {
  const id = externalId.replace(/\D/g, '');
  return `assistant:session:${channel}:${id}`;
}

export async function getAssistantSession(
  channel: string,
  externalId: string
): Promise<Session | null> {
  const key = sessionKey(channel, externalId);
  const redis = await getRedis();

  if (redis) {
    const raw = await redis.get(key);
    if (!raw) return memory.get(key) ?? null;
    try {
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  }

  return memory.get(key) ?? null;
}

export async function setAssistantSession(
  channel: string,
  externalId: string,
  session: Session
): Promise<void> {
  const key = sessionKey(channel, externalId);
  memory.set(key, session);

  const redis = await getRedis();
  if (!redis) return;

  await redis.set(key, JSON.stringify(session), { EX: SESSION_TTL_SEC });
}

export async function deleteAssistantSession(channel: string, externalId: string): Promise<void> {
  const key = sessionKey(channel, externalId);
  memory.delete(key);

  const redis = await getRedis();
  if (!redis) return;

  await redis.del(key);
}
