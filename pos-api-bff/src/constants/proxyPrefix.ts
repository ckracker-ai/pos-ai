/** Prefijo público del BFF POS-AI (proxy hacia core). */
export const POS_PROXY_PREFIX = '/pos/proxy';

export function isPublicProxyPath(path: string, prefix = POS_PROXY_PREFIX): boolean {
  const normalized = path.split('?')[0].replace(/\/$/, '') || '/';
  return (
    normalized === '/' ||
    normalized === prefix ||
    normalized === `${prefix}/health` ||
    normalized.startsWith(`${prefix}/auth`) ||
    normalized === `${prefix}/platform/auth/login` ||
    normalized === `${prefix}/public/planes` ||
    normalized === `${prefix}/public/registro` ||
    normalized.startsWith(`${prefix}/public/checkout`) ||
    normalized === `${prefix}/public/webhooks/subscription-payment`
  );
}

/** Rutas super-admin plataforma: sin x-branch-id ni JWT tenant. */
export function isPlatformProxyPath(path: string, prefix = POS_PROXY_PREFIX): boolean {
  const normalized = path.split('?')[0].replace(/\/$/, '') || '/';
  return normalized.startsWith(`${prefix}/platform/`);
}
