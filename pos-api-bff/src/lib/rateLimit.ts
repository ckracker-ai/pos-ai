import type { FastifyRequest } from 'fastify';

export const GLOBAL_RATE_MAX = Math.max(1, Number(process.env.RATE_LIMIT_GLOBAL_MAX ?? 100) || 100);
export const LOGIN_RATE_MAX = Math.max(1, Number(process.env.RATE_LIMIT_LOGIN_MAX ?? 5) || 5);
export const RATE_WINDOW = '1 minute';

export function isRateLimitExempt(request: FastifyRequest): boolean {
  const path = request.url.split('?')[0].replace(/\/$/, '') || '/';
  return path === '/' || path.endsWith('/health');
}

export function loginRateLimitKey(request: FastifyRequest): string {
  const body = request.body as { email?: unknown } | undefined;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  return `login:${request.ip}:${email}`;
}

export const loginRateLimitRoute = {
  config: {
    rateLimit: {
      max: LOGIN_RATE_MAX,
      timeWindow: RATE_WINDOW,
      hook: 'preValidation' as const,
      keyGenerator: loginRateLimitKey,
    },
  },
};
