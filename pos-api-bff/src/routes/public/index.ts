import type { FastifyInstance } from 'fastify';
import publicPlanesRoutes from './planes.js';
import publicRegistroRoutes from './registro.js';
import publicCheckoutRoutes from './checkout.js';

const publicRoutes = async (app: FastifyInstance) => {
  app.register(publicPlanesRoutes);
  app.register(publicRegistroRoutes);
  app.register(publicCheckoutRoutes);
};

export default publicRoutes;
