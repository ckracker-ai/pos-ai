import { FastifyInstance } from 'fastify';
import { requirePlatformAuth } from '../../middlewares/requirePlatformAuth.js';
import { registerPlatformAssistantRoutes } from './assistantHandlers.js';

const platformAssistantRoutes = async (app: FastifyInstance) => {
  app.addHook('preHandler', requirePlatformAuth);
  await registerPlatformAssistantRoutes(app);
};

export default platformAssistantRoutes;
