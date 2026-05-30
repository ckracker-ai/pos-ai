import { FastifyInstance } from 'fastify';
import { sendOk } from '../utils/response.js';
import { APP_NAME, APP_VERSION } from '../version.js';

const healthRoutes = async (app: FastifyInstance) => {
  app.get('/', async (_request, reply) => {
    return sendOk(reply, {
      status: 'ok',
      service: APP_NAME,
      version: APP_VERSION,
      ts: new Date().toISOString(),
    });
  });
};

export default healthRoutes;

