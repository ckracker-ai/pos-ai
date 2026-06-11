/** Prefijo público del BFF POS-AI (proxy hacia core). */
export const POS_PROXY_PREFIX = '/pos/proxy';

export function isPublicProxyPath(path: string, prefix = POS_PROXY_PREFIX): boolean {
  const normalized = path.split('?')[0].replace(/\/$/, '') || '/';
  const candidates = [normalized];
  if (normalized.startsWith(prefix)) {
    candidates.push(normalized.slice(prefix.length) || '/');
  }
  return candidates.some((p) => matchesPublicRules(p, prefix));
}

function matchesPublicRules(normalized: string, prefix: string): boolean {
  return (
    normalized === '/' ||
    normalized === prefix ||
    normalized === `${prefix}/health` ||
    normalized.startsWith(`${prefix}/auth`) ||
    normalized === `${prefix}/platform/auth/login` ||
    normalized === `${prefix}/public/planes` ||
    normalized === `${prefix}/public/registro` ||
    normalized.startsWith(`${prefix}/public/legal`) ||
    normalized.startsWith(`${prefix}/public/checkout`) ||
    normalized === `${prefix}/public/webhooks/subscription-payment` ||
    normalized === `${prefix}/public/webhooks/payment-gateway` ||
    normalized === '/public/planes' ||
    normalized === '/public/registro' ||
    normalized.startsWith('/public/legal') ||
    normalized.startsWith('/public/checkout')
  );
}

/** Rutas super-admin plataforma: sin x-branch-id ni JWT tenant. */
export function isPlatformProxyPath(path: string, prefix = POS_PROXY_PREFIX): boolean {
  const normalized = path.split('?')[0].replace(/\/$/, '') || '/';
  return normalized.startsWith(`${prefix}/platform/`) || normalized.startsWith('/platform/');
}
