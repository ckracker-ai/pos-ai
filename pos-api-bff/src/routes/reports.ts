import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireSeller } from '../middlewares/requireSeller.js';
import { requireCoreRequestContext } from '../utils/coreRequestContext.js';
import { sendFail, sendOk } from '../utils/response.js';
import { ApiCoreServiceReports } from '../services/apiCoreServiceReports.js';

const reportsQuerySchema = z.object({
  global: z.string().max(8).optional(),
  days: z.preprocess(
    (val) => (val === undefined || val === '' ? undefined : Number(val)),
    z.number().int().min(7).max(90).optional()
  ),
  limit: z.preprocess(
    (val) => (val === undefined || val === '' ? undefined : Number(val)),
    z.number().int().min(1).max(500).optional()
  ),
  status: z.string().max(32).optional(),
  hour: z.preprocess(
    (val) => (val === undefined || val === '' ? undefined : Number(val)),
    z.number().int().min(0).max(23).optional()
  ),
});

const reportsRoutes = async (app: FastifyInstance) => {
  const reportsCore = new ApiCoreServiceReports();

  const parseReportsQuery = (request: { query?: unknown }) =>
    reportsQuerySchema.parse(request.query ?? {});

  const parseGlobal = (query: { global?: string }) =>
    String(query.global ?? '').toLowerCase() === 'true';

  app.get('/dashboard', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;
    const query = parseReportsQuery(request);
    try {
      const data = await reportsCore.getDashboard(ctx.token, ctx.internalKey, ctx.branchId, {
        global: parseGlobal(query),
        days: query.days ?? 30,
      });
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string } } };
      return sendFail(reply, err.response?.data?.error ?? 'Failed to load reports dashboard', err.response?.status ?? 500);
    }
  });

  app.get('/sales', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;
    const query = parseReportsQuery(request);
    try {
      const data = await reportsCore.getSalesReport(ctx.token, ctx.internalKey, ctx.branchId, {
        global: parseGlobal(query),
        limit: query.limit ?? 200,
      });
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string } } };
      return sendFail(reply, err.response?.data?.error ?? 'Failed to load sales report', err.response?.status ?? 500);
    }
  });

  app.get('/inventory', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;
    const query = parseReportsQuery(request);
    try {
      const data = await reportsCore.getInventoryReport(ctx.token, ctx.internalKey, ctx.branchId, {
        global: parseGlobal(query),
      });
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string } } };
      return sendFail(reply, err.response?.data?.error ?? 'Failed to load inventory report', err.response?.status ?? 500);
    }
  });

  app.get('/shrinkage', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;
    const query = parseReportsQuery(request);
    try {
      const data = await reportsCore.getShrinkageReport(ctx.token, ctx.internalKey, ctx.branchId, {
        global: parseGlobal(query),
        status: query.status ?? 'ALL',
        limit: query.limit ?? 300,
      });
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string } } };
      return sendFail(reply, err.response?.data?.error ?? 'Failed to load shrinkage report', err.response?.status ?? 500);
    }
  });

  app.get('/hot-skus', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;
    const query = parseReportsQuery(request);
    try {
      const data = await reportsCore.getHotSkus(ctx.token, ctx.internalKey, ctx.branchId, {
        hour: query.hour,
      });
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string } } };
      return sendFail(reply, err.response?.data?.error ?? 'Failed to load hot SKUs', err.response?.status ?? 500);
    }
  });

  app.get('/reorder-draft', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;
    const query = parseReportsQuery(request);
    try {
      const data = await reportsCore.getReorderDraft(ctx.token, ctx.internalKey, ctx.branchId, {
        global: parseGlobal(query),
        limit: query.limit ?? 20,
      });
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string } } };
      return sendFail(reply, err.response?.data?.error ?? 'Failed to load reorder draft', err.response?.status ?? 500);
    }
  });
};

export default reportsRoutes;
