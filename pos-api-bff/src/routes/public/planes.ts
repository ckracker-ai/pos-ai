import type { FastifyInstance } from 'fastify';
import { apiCoreServicePlatformPlan } from '../../services/apiCoreServicePlatformPlan.js';
import { extractCoreError } from '../../utils/extractCoreError.js';
import { sendFail, sendOk } from '../../utils/response.js';

/** Catálogo de planes activos — sin auth (landing / marketing). */
const publicPlanesRoutes = async (app: FastifyInstance) => {
  app.get('/planes', async (_request, reply) => {
    try {
      const data = await apiCoreServicePlatformPlan.list();
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to load public plan catalog'),
        err.response?.status ?? 500
      );
    }
  });
};

export default publicPlanesRoutes;
