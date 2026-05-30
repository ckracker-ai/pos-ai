import { FastifyInstance } from 'fastify';
import healthRoutes from './health.js';
import authRoutes from './auth.js';
import inventoryRoutes from './inventory.js';
import catalogRoutes from './catalog.js';
import branchRoutes from './branch.js';
import salesRoutes from './sales.js';
import shrinkageRoutes from './shrinkage.js';
import reportsRoutes from './reports.js';
import empresaRoutes from './empresa.js';

const apiRoutes = async (app: FastifyInstance) => {
  app.register(healthRoutes, { prefix: '/health' });
  app.register(authRoutes, { prefix: '/auth' });
  app.register(inventoryRoutes, { prefix: '/inventory' });
  app.register(catalogRoutes, { prefix: '/catalog' });
  app.register(branchRoutes, { prefix: '/branch' });
  app.register(salesRoutes, { prefix: '/sales' });
  app.register(shrinkageRoutes, { prefix: '/shrinkage' });
  app.register(reportsRoutes, { prefix: '/reports' });
  app.register(empresaRoutes, { prefix: '/empresas' });
};

export default apiRoutes;




