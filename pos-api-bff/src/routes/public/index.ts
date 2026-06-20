import type { FastifyInstance } from 'fastify';
import publicPlanesRoutes from './planes.js';
import publicRegistroRoutes from './registro.js';
import publicCheckoutRoutes from './checkout.js';
import publicLegalRoutes from './legal.js';
import publicVirtualMenuRoutes from './virtualMenu.js';
import paymentGatewayRoutes from './paymentGateway.js';

const publicRoutes = async (app: FastifyInstance) => {
  app.register(publicPlanesRoutes);
  app.register(publicRegistroRoutes);
  app.register(publicCheckoutRoutes);
  app.register(publicLegalRoutes);
  app.register(publicVirtualMenuRoutes);
  app.register(paymentGatewayRoutes);
};

export default publicRoutes;
