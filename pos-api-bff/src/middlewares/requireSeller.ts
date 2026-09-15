import { FastifyReply, FastifyRequest } from 'fastify';
import { sessionOrBearerToken } from './sessionAuth.js';

export const requireSeller = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const token = sessionOrBearerToken(request);
    if (!token) {
      return reply.status(401).send({ error: 'Missing session' });
    }
    return;
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
};
