import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import config from './config/index.js';
import { branchContextMiddleware } from './middlewares/branchContext.js';

import { errorHandler } from './middlewares/errorHandler.js';
import apiRoutes from './routes/index.js';

const createApp = () => {
  const app = fastify({ logger: true });

  app.register(cors, {
    origin: true,
    // Nota: usar el nombre en minúsculas para que el plugin lo compare con lo que envía el navegador
    allowedHeaders: [
      'content-type',
      'authorization',
      'x-branch-id',
      'x-internal-key',
    ],
    exposedHeaders: ['Authorization'],
  });

  app.register(helmet);

  app.register(jwt, {
    secret: config.jwtSecret,
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });

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
