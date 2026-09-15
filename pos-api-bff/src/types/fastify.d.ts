import type { FastifyReply } from 'fastify';

import type { StoredSession } from '../lib/sessionStore.js';

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
    authSession?: StoredSession;
    authSessionId?: string;
  }

  interface FastifyReply {
    success: <T = unknown>(payload: T) => FastifyReply;
    failure: (message: string, statusCode?: number) => FastifyReply;
  }
}
