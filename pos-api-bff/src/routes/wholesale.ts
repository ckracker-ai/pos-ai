import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireSeller } from '../middlewares/requireSeller.js';
import { requireCoreRequestContext } from '../utils/coreRequestContext.js';
import { sendFail, sendOk } from '../utils/response.js';
import { ApiCoreServiceWholesale } from '../services/apiCoreServiceWholesale.js';

const customerSchema = z.object({
  name: z.string().min(1),
  rut: z.string().optional().nullable(),
  creditLimit: z.coerce.number().nonnegative().optional(),
  isOverdue: z.boolean().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

const wholesaleRoutes = async (app: FastifyInstance) => {
  const wholesale = new ApiCoreServiceWholesale();

  app.get('/customers', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;
    try {
      const data = await wholesale.listCustomers(ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      return sendFail(reply, e?.response?.data?.error ?? 'Failed to list customers', e?.response?.status ?? 500);
    }
  });

  app.post('/customers', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;
    const body = customerSchema.parse(request.body);
    try {
      const data = await wholesale.createCustomer(body, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data, 201);
    } catch (e: any) {
      return sendFail(reply, e?.response?.data?.error ?? 'Failed to create customer', e?.response?.status ?? 400);
    }
  });

  app.put('/customers/:id', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;
    const { id } = request.params as { id: string };
    const body = customerSchema.parse(request.body);
    try {
      const data = await wholesale.updateCustomer(id, body, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      return sendFail(reply, e?.response?.data?.error ?? 'Failed to update customer', e?.response?.status ?? 400);
    }
  });
};

export default wholesaleRoutes;
