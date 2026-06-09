import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import config from '../config/index.js';
import { interpretPosCart } from '../pos/interpretCart.js';

const bodySchema = z.object({
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

export async function posInterpretRoutes(app: FastifyInstance) {
  app.post('/internal/pos/interpret', async (req, reply) => {
    const key = req.headers['x-internal-key'];
    if (!config.internalApiKey || key !== config.internalApiKey) {
      return reply.status(403).send({ success: false, error: 'UNAUTHORIZED' });
    }

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(422).send({ success: false, error: 'VALIDATION_ERROR' });
    }

    const result = await interpretPosCart(parsed.data);
    return reply.send({ success: true, data: result });
  });
}
