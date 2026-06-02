import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { apiCoreServicePlatformPlan } from '../../services/apiCoreServicePlatformPlan.js';
import { requirePlatformAuth } from '../../middlewares/requirePlatformAuth.js';
import { extractCoreError } from '../../utils/extractCoreError.js';
import { sendFail, sendOk } from '../../utils/response.js';

const updatePlanSchema = z.object({
  descripcion: z.string().nullable().optional(),
  valor: z.number().min(0).optional(),
  metodoPago: z.enum(['TRANSFERENCIA', 'WEBPAY', 'MERCADO_PAGO', 'FLOW', 'MIXTO']).optional(),
  activo: z.boolean().optional(),
});

const platformPlanRoutes = async (app: FastifyInstance) => {
  app.addHook('preHandler', requirePlatformAuth);

  app.get('/', async (_request, reply) => {
    try {
      const data = await apiCoreServicePlatformPlan.list();
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to list plans'), err.response?.status ?? 400);
    }
  });

  app.get('/catalog', async (_request, reply) => {
    try {
      const data = await apiCoreServicePlatformPlan.catalog();
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to load plan catalog'),
        err.response?.status ?? 400
      );
    }
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updatePlanSchema.parse(request.body);
    try {
      const data = await apiCoreServicePlatformPlan.update(id, body);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to update plan'), err.response?.status ?? 400);
    }
  });
};

export default platformPlanRoutes;
