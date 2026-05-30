/** Prefijo público del BFF POS-AI (proxy hacia core). */
export const POS_PROXY_PREFIX = '/pos/proxy';

export function isPublicProxyPath(path: string, prefix = POS_PROXY_PREFIX): boolean {
  const normalized = path.split('?')[0].replace(/\/$/, '') || '/';
  return (
    normalized === '/' ||
    normalized === prefix ||
    normalized === `${prefix}/health` ||
    normalized.startsWith(`${prefix}/auth`)
  );
}
