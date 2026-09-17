import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireSeller } from '../middlewares/requireSeller.js';
import { requireCoreRequestContext } from '../utils/coreRequestContext.js';
import { extractCoreError } from '../utils/extractCoreError.js';
import { sendFail, sendOk } from '../utils/response.js';
import { ApiCoreServiceSupport } from '../services/apiCoreServiceSupport.js';

const askSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  body: z.string().trim().min(1).max(4000),
});

const messageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

const tenantSupportRoutes = async (app: FastifyInstance) => {
  const core = new ApiCoreServiceSupport();

  app.get('/manual', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;
    try {
      const data = await core.tenantManual(ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to load manual'), err.response?.status ?? 500);
    }
  });

  app.get('/manual/search', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;
    const q = String((request.query as { q?: string }).q ?? '').trim();
    if (!q) return sendFail(reply, 'VALIDATION_ERROR', 400);
    try {
      const data = await core.tenantManualSearch(q, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to search manual'), err.response?.status ?? 500);
    }
  });

  app.get('/casos', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;
    try {
      const data = await core.tenantList(ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to list cases'), err.response?.status ?? 500);
    }
  });

  app.get('/casos/:id', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;
    const { id } = request.params as { id: string };
    try {
      const data = await core.tenantGet(id, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to load case'), err.response?.status ?? 500);
    }
  });

  app.post('/casos/ask', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;
    const body = askSchema.parse(request.body ?? {});
    try {
      const data = await core.tenantAsk(body, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data, 201);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to ask support'), err.response?.status ?? 400);
    }
  });

  app.post('/casos/:id/mensajes', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;
    const { id } = request.params as { id: string };
    const body = messageSchema.parse(request.body ?? {});
    try {
      const data = await core.tenantAddMessage(id, body, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to send message'), err.response?.status ?? 400);
    }
  });

  app.post('/casos/:id/copilot', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;
    const { id } = request.params as { id: string };
    const body = messageSchema.parse(request.body ?? {});
    try {
      const data = await core.tenantCopilot(id, body, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to copilot'), err.response?.status ?? 400);
    }
  });
};

export default tenantSupportRoutes;
