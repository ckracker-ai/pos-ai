import type { FastifyReply, FastifyRequest } from 'fastify';
import config from '../config/index.js';
import {
  destroySession,
  newSessionId,
  saveSession,
  type SessionKind,
  type StoredSession,
} from './sessionStore.js';

export const TENANT_COOKIE = 'pos_sid';
export const PLATFORM_COOKIE = 'pos_platform_sid';

export function cookieNameForKind(kind: SessionKind): string {
  return kind === 'platform' ? PLATFORM_COOKIE : TENANT_COOKIE;
}

function cookieOptions() {
  return {
    path: '/',
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax' as const,
    maxAge: config.sessionTtlSec,
  };
}

export function readSessionId(request: FastifyRequest, kind: SessionKind): string {
  const name = cookieNameForKind(kind);
  const value = request.cookies?.[name];
  return typeof value === 'string' ? value : '';
}

export async function establishSession(
  reply: FastifyReply,
  session: StoredSession,
  ttlSec: number
): Promise<boolean> {
  const id = newSessionId();
  const saved = await saveSession(id, session, ttlSec);
  if (!saved) return false;
  reply.setCookie(cookieNameForKind(session.kind), id, {
    ...cookieOptions(),
    maxAge: ttlSec,
  });
  return true;
}

export async function clearSession(request: FastifyRequest, reply: FastifyReply, kind: SessionKind) {
  const id = readSessionId(request, kind);
  await destroySession(id);
  reply.clearCookie(cookieNameForKind(kind), { path: '/' });
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function ttlFromJwt(token: string, fallbackSec: number): number {
  const payload = decodeJwtPayload(token);
  const exp = Number(payload?.exp);
  if (!Number.isFinite(exp) || exp <= 0) return fallbackSec;
  const remaining = Math.floor(exp - Date.now() / 1000);
  if (remaining < 60) return 60;
  return Math.min(fallbackSec, remaining);
}
