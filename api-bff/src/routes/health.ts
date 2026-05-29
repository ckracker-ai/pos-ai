import { FastifyInstance } from 'fastify';
import { sendOk } from '../utils/response.js';

const healthRoutes = async (app: FastifyInstance) => {
  app.get('/', async (_request, reply) => {
    // Mirror api-core health contract
    return sendOk(reply, { status: 'ok', ts: new Date().toISOString() });
  });
};

export default healthRoutes;

