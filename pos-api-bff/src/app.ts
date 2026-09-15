import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import config from './config/index.js';
import { resolveCorsOrigins } from './lib/corsOrigins.js';
import {
  GLOBAL_RATE_MAX,
  RATE_WINDOW,
  isRateLimitExempt,
} from './lib/rateLimit.js';
import { branchContextMiddleware } from './middlewares/branchContext.js';
import { attachSession } from './middlewares/sessionAuth.js';

import { errorHandler } from './middlewares/errorHandler.js';
import apiRoutes from './routes/index.js';

const allowedOrigins = resolveCorsOrigins();

const createApp = () => {
  const app = fastify({
    logger: true,
    bodyLimit: 6 * 1024 * 1024,
    trustProxy: true,
  });

  app.register(cookie);

  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.has(origin)) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
    credentials: true,
    allowedHeaders: ['content-type', 'authorization', 'x-branch-id'],
  });

  app.register(helmet);

  app.register(rateLimit, {
    global: true,
    max: GLOBAL_RATE_MAX,
    timeWindow: RATE_WINDOW,
    skipOnError: true,
    allowList: isRateLimitExempt,
    errorResponseBuilder: () => ({
      success: false,
      data: null,
      error: 'TOO_MANY_REQUESTS',
      code: 429,
    }),
  });

  app.register(jwt, {
    secret: config.jwtSecret,
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });

  app.addHook('onRequest', async (request) => {
    request.headers['x-internal-key'] = config.internalApiKey;
  });
  app.addHook('onRequest', attachSession);
  app.addHook('preHandler', branchContextMiddleware);

  app.setErrorHandler(errorHandler);

  app.register(apiRoutes, { prefix: config.apiPrefix });

  app.get('/', async () => ({
    status: 'ok',
    service: 'pos-api-bff',
  }));

  return app;
};

export default createApp;
