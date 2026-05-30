import { FastifyReply, FastifyRequest } from 'fastify';
import { JwtPayload } from '../types/jwtPayload.js';

import config from '../config/index.js';
import { isPublicProxyPath } from '../constants/proxyPrefix.js';

export const jwtAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  const path = request.url.split('?')[0];
  if (isPublicProxyPath(path, config.apiPrefix)) {
    return;
  }

  try {
    const authorization = request.headers.authorization;
    if (!authorization) {
      return reply.status(401).send({ error: 'Missing Authorization header' });
    }

    // fastify-jwt normalmente espera Authorization: Bearer <token>
    // En algunos casos falla si el header llega con Bearer incluido, así que limpiamos el formato.
    const token = authorization.toString().replace(/^Bearer\s+/i, '');
    if (!token) {
      return reply.status(401).send({ error: 'Missing Authorization token' });
    }

    // Restauramos header para que jwtVerify use el formato esperado
    // fastify-jwt tomará el token desde Authorization: Bearer <token>
    const payload = await request.jwtVerify<JwtPayload>();




    request.user = {
      id: payload.userId,
      roles: payload.roles,
      branchId: payload.branchId,
    };
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
};
