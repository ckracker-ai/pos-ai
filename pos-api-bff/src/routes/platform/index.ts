import { FastifyInstance } from 'fastify';
import platformAuthRoutes from './auth.js';
import platformEmpresaRoutes from './empresa.js';

const platformRoutes = async (app: FastifyInstance) => {
  app.register(platformAuthRoutes, { prefix: '/auth' });
  app.register(platformEmpresaRoutes, { prefix: '/empresas' });
};

export default platformRoutes;
