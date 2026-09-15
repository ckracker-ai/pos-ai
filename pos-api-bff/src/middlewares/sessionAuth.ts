import { FastifyReply, FastifyRequest } from 'fastify';
import config from '../config/index.js';
import { isPlatformProxyPath } from '../constants/proxyPrefix.js';
import { readSession, type StoredSession } from '../lib/sessionStore.js';
import { PLATFORM_COOKIE, TENANT_COOKIE } from '../lib/sessionCookie.js';

function cookieValue(request: FastifyRequest, name: string): string {
  const value = request.cookies?.[name];
  return typeof value === 'string' ? value : '';
}

export const attachSession = async (request: FastifyRequest, _reply: FastifyReply) => {
  const path = request.url.split('?')[0];
  const platform = isPlatformProxyPath(path, config.apiPrefix);
  const cookieName = platform ? PLATFORM_COOKIE : TENANT_COOKIE;
  const sessionId = cookieValue(request, cookieName);
  if (!sessionId) return;

  const session = await readSession(sessionId);
  if (!session) return;
  if (platform && session.kind !== 'platform') return;
  if (!platform && session.kind !== 'tenant') return;

  request.authSession = session;
  request.authSessionId = sessionId;

  if (!request.headers.authorization) {
    request.headers.authorization = `Bearer ${session.accessToken}`;
  }
  if (session.branchId && !request.headers[config.branchHeader]) {
    request.headers[config.branchHeader] = session.branchId;
  }
};

export function sessionOrBearerToken(request: FastifyRequest): string {
  if (request.authSession?.accessToken) return request.authSession.accessToken;
  return (request.headers.authorization ?? '').toString().replace(/^Bearer\s+/i, '');
}

export function publicSessionView(session: StoredSession) {
  return {
    user: session.user,
    branchId: session.branchId ?? null,
    supportSession: Boolean(session.supportSession),
    supportExpiresAt: session.supportExpiresAt ?? null,
    session: true,
  };
}
