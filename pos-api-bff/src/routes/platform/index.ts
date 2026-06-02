import { FastifyInstance } from 'fastify';
import platformAuthRoutes from './auth.js';
import platformEmpresaRoutes from './empresa.js';
import platformPlanRoutes from './plan.js';
import platformAssistantRoutes from './assistant.js';
import platformDashboardRoutes from './dashboard.js';

const platformRoutes = async (app: FastifyInstance) => {
  app.register(platformAuthRoutes, { prefix: '/auth' });
  app.register(platformDashboardRoutes);
  app.register(platformEmpresaRoutes, { prefix: '/empresas' });
  app.register(platformPlanRoutes, { prefix: '/planes' });
  app.register(platformAssistantRoutes, { prefix: '/assistant' });
};

export default platformRoutes;
