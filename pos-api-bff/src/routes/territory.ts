import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireSeller } from '../middlewares/requireSeller.js';
import { getCoreRequestContext } from '../utils/coreRequestContext.js';
import { sendFail, sendOk } from '../utils/response.js';

const resolveSchema = z.object({
  comunaText: z.string().max(120).optional(),
  codigoPostal: z.string().max(7).optional(),
});

const territoryRoutes = async (app: FastifyInstance) => {
  const territoryCore = new (
    await import('../services/apiCoreServiceTerritory.js')
  ).ApiCoreServiceTerritory();

  app.get('/regions', { preHandler: [requireSeller] }, async (request, reply) => {
    const { token, internalKey, branchId } = getCoreRequestContext(request);
    try {
      const data = await territoryCore.listRegions(token, internalKey, branchId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string } } };
      return sendFail(reply, err.response?.data?.error ?? 'Failed to list regions', err.response?.status ?? 500);
    }
  });

  app.get('/comunas', { preHandler: [requireSeller] }, async (request, reply) => {
    const regionId = String((request.query as { regionId?: string }).regionId ?? '').trim();
    if (!regionId) return sendFail(reply, 'regionId required', 422);
    const { token, internalKey, branchId } = getCoreRequestContext(request);
    try {
      const data = await territoryCore.listComunas(regionId, token, internalKey, branchId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string } } };
      return sendFail(reply, err.response?.data?.error ?? 'Failed to list comunas', err.response?.status ?? 500);
    }
  });

  app.get('/comunas/search', { preHandler: [requireSeller] }, async (request, reply) => {
    const q = String((request.query as { q?: string }).q ?? '');
    const { token, internalKey, branchId } = getCoreRequestContext(request);
    try {
      const data = await territoryCore.searchComunas(q, token, internalKey, branchId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string } } };
      return sendFail(reply, err.response?.data?.error ?? 'Search failed', err.response?.status ?? 500);
    }
  });

  app.post('/resolve', { preHandler: [requireSeller] }, async (request, reply) => {
    const body = resolveSchema.parse(request.body ?? {});
    const { token, internalKey, branchId } = getCoreRequestContext(request);
    try {
      const data = await territoryCore.resolve(body, token, internalKey, branchId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string } } };
      return sendFail(reply, err.response?.data?.error ?? 'Resolve failed', err.response?.status ?? 500);
    }
  });
};

export default territoryRoutes;
