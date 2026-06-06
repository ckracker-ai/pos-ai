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
  transferBankName: z.string().nullable().optional(),
  transferAccountType: z.string().nullable().optional(),
  transferAccount: z.string().nullable().optional(),
  transferHolderName: z.string().nullable().optional(),
  transferRut: z.string().nullable().optional(),
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

  const formalizacionSchema = z.object({
    diagnostico: z.enum(['ocasional', 'sustento']).nullable().optional(),
    pasos: z
      .object({
        sii: z.boolean().optional(),
        municipalidad: z.boolean().optional(),
        cuentaBancaria: z.boolean().optional(),
        capturaRut: z.boolean().optional(),
      })
      .optional(),
    estadoTributario: z.literal('EN_TRAMITE').optional(),
  });

  const formalizarSchema = z.object({
    rut: z.string().min(8).max(20),
    razonSocial: z.string().min(2).max(200).optional(),
    giroSii: z.string().nullable().optional(),
  });

  app.patch('/:id/formalizacion-progreso', { preHandler: [requireSeller] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const body = formalizacionSchema.parse(request.body);

    try {
      const data = await empresaCore.updateFormalizacionProgreso(id, body, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to update formalizacion'), err.response?.status ?? 400);
    }
  });

  app.post('/:id/formalizar', { preHandler: [requireSeller] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const body = formalizarSchema.parse(request.body);

    try {
      const data = await empresaCore.formalizarEmpresa(id, body, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to formalizar empresa'), err.response?.status ?? 400);
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
