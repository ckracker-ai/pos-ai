import { FastifyInstance } from 'fastify';
import { requireSeller } from '../middlewares/requireSeller.js';
import { requireCoreRequestContext } from '../utils/coreRequestContext.js';
import { sendFail, sendOk } from '../utils/response.js';
import { ApiCoreServiceReports } from '../services/apiCoreServiceReports.js';

const reportsRoutes = async (app: FastifyInstance) => {
  const reportsCore = new ApiCoreServiceReports();

  // Fastify tipa request.query como unknown; aquí lo tratamos dinámicamente.
  const parseGlobal = (request: any) =>
    String(request?.query?.global ?? '').toLowerCase() === 'true';

  app.get('/dashboard', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const global = parseGlobal(request);
    const days = Number((request.query as { days?: string }).days ?? 30);

    try {
      const data = await reportsCore.getDashboard(ctx.token, ctx.internalKey, ctx.branchId, {
        global,
        days,
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

    try {
      const data = await reportsCore.getSalesReport(ctx.token, ctx.internalKey, ctx.branchId, {
        global: parseGlobal(request),
        limit: Number((request.query as { limit?: string }).limit ?? 200),
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

    try {
      const data = await reportsCore.getInventoryReport(ctx.token, ctx.internalKey, ctx.branchId, {
        global: parseGlobal(request),
      });
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string } } };
      return sendFail(reply, err.response?.data?.error ?? 'Failed to load inventory report', err.response?.status ?? 500);
    }
  });
};

export default reportsRoutes;
