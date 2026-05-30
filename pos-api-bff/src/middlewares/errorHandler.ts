import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export const errorHandler = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
  request.log.error(error);

  if (error instanceof ZodError) {
    return reply.status(400).send({ error: 'Validation failed', details: error.errors });
  }

  if ('statusCode' in error && (error as any).statusCode) {
    return reply.status((error as any).statusCode).send({ error: error.message });
  }

  return reply.status(500).send({ error: 'Internal server error' });
};
