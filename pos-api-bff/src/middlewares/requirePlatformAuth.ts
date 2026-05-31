import { FastifyReply, FastifyRequest } from 'fastify';

export const requirePlatformAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authorization = request.headers.authorization;
    if (!authorization) {
      return reply.status(401).send({ error: 'Missing Authorization header' });
    }

    const payload = await request.jwtVerify<{ userId: string; roles?: string[] }>();
    const roles = payload.roles ?? [];
    if (!roles.includes('PLATFORM_ADMIN')) {
      return reply.status(403).send({ error: 'PLATFORM_ACCESS_DENIED' });
    }
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
};
