import type { FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    branchContext: {
      branchId: string;
    };
    user: {
      id: string;
      roles: string[];
      branchId?: string;
    };
  }

  interface FastifyReply {
    success: <T = unknown>(payload: T) => FastifyReply;
    failure: (message: string, statusCode?: number) => FastifyReply;
  }
}
