import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireSeller } from '../middlewares/requireSeller.js';
import { requireCoreRequestContext } from '../utils/coreRequestContext.js';
import { sendFail, sendOk } from '../utils/response.js';
import { extractCoreError } from '../utils/extractCoreError.js';
import { ApiCoreServiceSales } from '../services/apiCoreServiceSales.js';

const saleDetailSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().nonnegative().optional(),
  subtotal: z.coerce.number().nonnegative().optional(),
});

const saleCreateSchema = z.object({
  total: z.coerce.number(),
  discount: z.coerce.number().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  details: z.array(saleDetailSchema).min(1),
});

const salePatchSchema = z.object({
  total: z.number().optional(),
  discount: z.number().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

const salesRoutes = async (app: FastifyInstance) => {
  const salesCore = new ApiCoreServiceSales();

  app.get('/sales', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await salesCore.listSales(ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      const statusCode = err.response?.status ?? 500;
      return sendFail(reply, extractCoreError(e, 'Failed to list sales'), statusCode);
    }
  });

  app.get('/sales/:id', { preHandler: [requireSeller] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await salesCore.getSaleById(id, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 404;
      const error = e?.response?.data?.error ?? 'Failed to get sale';
      return sendFail(reply, error, statusCode);
    }
  });

  app.get(
    '/sales/user/:userId/branch/:branchId',
    { preHandler: [requireSeller] },
    async (request, reply) => {
      const { userId, branchId: routeBranchId } = request.params as { userId: string; branchId: string };
      const ctx = requireCoreRequestContext(reply, request, { requireBranchId: false });
      if (!ctx) return;

      try {
        const data = await salesCore.listSalesByUserAndBranch(userId, routeBranchId, ctx.token, ctx.internalKey);
        return sendOk(reply, data);
      } catch (e: any) {
        const statusCode = e?.response?.status ?? 404;
        const error = e?.response?.data?.error ?? 'Failed to list sales';
        return sendFail(reply, error, statusCode);
      }
    }
  );

  app.get(
    '/sales/:id/user/:userId/branch/:branchId',
    { preHandler: [requireSeller] },
    async (request, reply) => {
      const { id, userId, branchId: routeBranchId } = request.params as {
        id: string;
        userId: string;
        branchId: string;
      };
      const ctx = requireCoreRequestContext(reply, request, { requireBranchId: false });
      if (!ctx) return;

      try {
        const data = await salesCore.getSaleByIdUserBranch(id, userId, routeBranchId, ctx.token, ctx.internalKey);
        return sendOk(reply, data);
      } catch (e: any) {
        const statusCode = e?.response?.status ?? 404;
        const error = e?.response?.data?.error ?? 'Failed to get sale';
        return sendFail(reply, error, statusCode);
      }
    }
  );

  app.post('/sales', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const body = saleCreateSchema.parse(request.body);

    try {
      const data = await salesCore.createSale(body as Record<string, unknown>, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data, 201);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      const statusCode = err.response?.status ?? 400;
      return sendFail(reply, extractCoreError(e, 'No se pudo registrar la venta.'), statusCode);
    }
  });

  app.post('/salesAction', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const body = saleCreateSchema.parse(request.body);

    try {
      const data = await salesCore.createSaleAction(body as Record<string, unknown>, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data, 201);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      const statusCode = err.response?.status ?? 400;
      return sendFail(reply, extractCoreError(e, 'No se pudo registrar la venta.'), statusCode);
    }
  });

  app.patch('/sales/:id', { preHandler: [requireSeller] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const body = salePatchSchema.parse(request.body);

    try {
      const data = await salesCore.patchSale(id, body as Record<string, unknown>, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to update sale';
      return sendFail(reply, error, statusCode);
    }
  });

  app.delete('/sales/:id', { preHandler: [requireSeller] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await salesCore.deleteSale(id, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to delete sale';
      return sendFail(reply, error, statusCode);
    }
  });
};

export default salesRoutes;
