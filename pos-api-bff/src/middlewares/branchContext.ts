import { FastifyReply, FastifyRequest } from 'fastify';
import config from '../config/index.js';
import { isPublicProxyPath, isPlatformProxyPath } from '../constants/proxyPrefix.js';
export const branchContextMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  const path = request.url.split('?')[0];
  if (isPublicProxyPath(path, config.apiPrefix) || isPlatformProxyPath(path, config.apiPrefix)) {
    return;
  }

  // Endpoints de contexto (sucursales/territorio) deben funcionar sin sucursal activa aún.
  const apiPath = path.startsWith(config.apiPrefix) ? path.slice(config.apiPrefix.length) : path;
  if (apiPath.startsWith('/branch') || apiPath.startsWith('/territory')) {
    return;
  }

  const branchId = String(request.headers[config.branchHeader] ?? '').trim();

  if (!branchId) {
    return reply.status(400).send({ error: 'X-Branch-ID header is required' });
  }

  request.branchContext = { branchId };
};
