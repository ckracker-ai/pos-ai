import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import config from '../config/index.js';
import { requireSeller } from '../middlewares/requireSeller.js';
import { requireCoreRequestContext } from '../utils/coreRequestContext.js';
import { sendFail, sendOk } from '../utils/response.js';

const interpretSchema = z.object({
  userText: z.string().min(1).max(2000),
  stocks: z.array(
    z.object({
      id: z.string().min(1),
      nombre: z.string(),
      sku: z.string(),
      precio: z.number(),
      stock_actual: z.number(),
      categoria: z.string().optional(),
    })
  ),
  cart: z.array(
    z.object({
      id_producto: z.string().min(1),
      cantidad: z.number(),
      precio_unitario: z.number(),
    })
  ),
});

const posRoutes = async (app: FastifyInstance) => {
  app.post('/interpret', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const body = interpretSchema.parse(request.body);

    try {
      const res = await fetch(`${config.assistantApiBaseUrl}/internal/pos/interpret`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': ctx.internalKey,
        },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as {
        success?: boolean;
        data?: unknown;
        error?: string;
      };

      if (!res.ok || !json.success) {
        return sendFail(reply, json.error ?? 'POS_AI_INTERPRET_FAILED', res.status || 502);
      }

      return sendOk(reply, json.data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'POS_AI_UNAVAILABLE';
      return sendFail(reply, message, 502);
    }
  });
};

export default posRoutes;
