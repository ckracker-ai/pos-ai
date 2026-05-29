import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApiCoreServiceShrinkage } from '../services/apiCoreServiceShrinkage.js';
import { requireSeller } from '../middlewares/requireSeller.js';
import { requireCoreRequestContext } from '../utils/coreRequestContext.js';
import { sendFail, sendOk } from '../utils/response.js';

const shrinkageDetailSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const shrinkageCreateSchema = z
  .object({
    reason: z.string().min(1),
    productId: z.string().min(1).optional(),
    quantity: z.coerce.number().int().positive().optional(),
    details: z.array(shrinkageDetailSchema).min(1).optional(),
  })
  .refine(
    (body) =>
      (body.details && body.details.length > 0) ||
      (Boolean(body.productId) && body.quantity !== undefined),
    { message: 'productId and quantity, or details[], are required' }
  );

const shrinkagePatchSchema = z.record(z.any());

const shrinkageRoutes = async (app: FastifyInstance) => {
  const shrinkageCore = new ApiCoreServiceShrinkage();

  app.get('/shrinkage', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await shrinkageCore.listShrinkage(ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 500;
      const error = e?.response?.data?.error ?? 'Failed to list shrinkage';
      return sendFail(reply, error, statusCode);
    }
  });

  app.get('/shrinkage/status/:status', { preHandler: [requireSeller] }, async (request, reply) => {
    const { status } = request.params as { status: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await shrinkageCore.listShrinkageByStatus(status, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 500;
      const error = e?.response?.data?.error ?? 'Failed to list shrinkage by status';
      return sendFail(reply, error, statusCode);
    }
  });

  app.post('/shrinkage', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const body = shrinkageCreateSchema.parse(request.body);
    const details =
      body.details ??
      (body.productId && body.quantity !== undefined
        ? [{ productId: body.productId, quantity: body.quantity }]
        : []);

    try {
      const data = await shrinkageCore.registerShrinkage(
        {
          branchId: ctx.branchId,
          reason: body.reason,
          details,
        },
        ctx.token,
        ctx.internalKey
      );
      return sendOk(reply, data, 201);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to create shrinkage';
      return sendFail(reply, error, statusCode);
    }
  });

  app.post('/shrinkage/:id/approve', { preHandler: [requireSeller] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await shrinkageCore.approveShrinkage(id, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to approve shrinkage';
      return sendFail(reply, error, statusCode);
    }
  });

  app.post('/shrinkage/:id/reject', { preHandler: [requireSeller] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const body = z
      .object({ rejectionNote: z.string().optional() })
      .parse(request.body ?? {});

    try {
      const data = await shrinkageCore.rejectShrinkage(
        id,
        body.rejectionNote,
        ctx.token,
        ctx.internalKey,
        ctx.branchId
      );
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to reject shrinkage';
      return sendFail(reply, error, statusCode);
    }
  });

  app.post('/shrinkageAction', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const body = shrinkageCreateSchema.parse(request.body);
    const details =
      body.details ??
      (body.productId && body.quantity !== undefined
        ? [{ productId: body.productId, quantity: body.quantity }]
        : []);

    try {
      const data = await shrinkageCore.registerShrinkageAction(
        {
          branchId: ctx.branchId,
          reason: body.reason,
          details,
        },
        ctx.token,
        ctx.internalKey
      );
      return sendOk(reply, data, 201);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to create shrinkage';
      return sendFail(reply, error, statusCode);
    }
  });

  app.get('/shrinkage/:id', { preHandler: [requireSeller] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await shrinkageCore.getShrinkageById(id, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 404;
      const error = e?.response?.data?.error ?? 'Failed to get shrinkage';
      return sendFail(reply, error, statusCode);
    }
  });

  app.patch('/shrinkage/:id', { preHandler: [requireSeller] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const body = shrinkagePatchSchema.parse(request.body);

    try {
      const data = await shrinkageCore.patchShrinkage(id, body, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to update shrinkage';
      return sendFail(reply, error, statusCode);
    }
  });

  app.delete('/shrinkage/:id', { preHandler: [requireSeller] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await shrinkageCore.deleteShrinkage(id, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to delete shrinkage';
      return sendFail(reply, error, statusCode);
    }
  });
};

export default shrinkageRoutes;
