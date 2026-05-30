/** Prefijo de rutas API vía BFF (mismo path en browser y en pos-api-bff). */
export const POS_PROXY_PREFIX = '/pos/proxy';

export const posProxyPath = (segment: string) => {
  const clean = segment.replace(/^\//, '');
  return `${POS_PROXY_PREFIX}/${clean}`;
};
