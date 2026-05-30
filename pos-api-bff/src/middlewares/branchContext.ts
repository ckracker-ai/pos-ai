import { FastifyReply, FastifyRequest } from 'fastify';
import config from '../config/index.js';

export const branchContextMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  const path = request.url.split('?')[0];
  if (path === '/' || path === '/api/health' || path.startsWith('/api/auth')) {
    return;
  }

  const branchId = String(request.headers[config.branchHeader] ?? '').trim();

  if (!branchId) {
    return reply.status(400).send({ error: 'X-Branch-ID header is required' });
  }

  request.branchContext = { branchId };
};
