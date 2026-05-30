import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireSeller } from '../middlewares/requireSeller.js';
import { requireCoreRequestContext } from '../utils/coreRequestContext.js';
import { extractCoreError } from '../utils/extractCoreError.js';
import { sendFail, sendOk } from '../utils/response.js';

const updateEmpresaSchema = z.object({
  razonSocial: z.string().min(1).optional(),
  nombreFantasia: z.string().nullable().optional(),
  giroSii: z.string().nullable().optional(),
  direccionComercial: z.string().nullable().optional(),
  correoFacturacion: z.string().nullable().optional(),
  urlLogo: z.string().nullable().optional(),
  slug: z.string().min(1).optional(),
});

const empresaRoutes = async (app: FastifyInstance) => {
  const empresaCore = new (await import('../services/apiCoreServiceEmpresa.js')).ApiCoreServiceEmpresa();

  app.get('/me', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await empresaCore.getMe(ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      const statusCode = err.response?.status ?? 500;
      return sendFail(reply, extractCoreError(e, 'Failed to fetch empresa profile'), statusCode);
    }
  });

  app.get('/', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await empresaCore.list(ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      const statusCode = err.response?.status ?? 500;
      return sendFail(reply, extractCoreError(e, 'Failed to list empresas'), statusCode);
    }
  });

  app.get('/:id', { preHandler: [requireSeller] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await empresaCore.getById(id, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      const statusCode = err.response?.status ?? 404;
      return sendFail(reply, extractCoreError(e, 'Failed to fetch empresa'), statusCode);
    }
  });

  app.patch('/:id', { preHandler: [requireSeller] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const body = updateEmpresaSchema.parse(request.body);

    try {
      const data = await empresaCore.updateForTenant(id, body, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      const statusCode = err.response?.status ?? 400;
      return sendFail(reply, extractCoreError(e, 'Failed to update empresa'), statusCode);
    }
  });
};

export default empresaRoutes;
