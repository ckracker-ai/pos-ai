import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireSeller } from '../middlewares/requireSeller.js';
import { getCoreRequestContext } from '../utils/coreRequestContext.js';
import { sendFail, sendOk } from '../utils/response.js';

const createBranchSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().optional(),
  comunaId: z.string().min(4).max(8),
  codigoPostal: z.string().regex(/^\d{7}$/, 'Código postal de 7 dígitos'),
  code: z.string().optional(),
  city: z.string().optional(),
});

const updateBranchSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  comunaId: z.string().min(4).max(8).optional(),
  codigoPostal: z.string().regex(/^\d{7}$/).optional(),
  isActive: z.boolean().optional(),
});

const branchRoutes = async (app: FastifyInstance) => {
  const branchCore = new (await import('../services/apiCoreServiceBranch.js')).ApiCoreServiceBranch();

  app.get('/', { preHandler: [requireSeller] }, async (request, reply) => {
    const { token, internalKey } = getCoreRequestContext(request);
    try {
      const data = await branchCore.listBranches(token, internalKey);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 500;
      const error = e?.response?.data?.error ?? 'Failed to fetch branches';
      return sendFail(reply, error, statusCode);
    }
  });

  app.get('/:id', { preHandler: [requireSeller] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { token, internalKey } = getCoreRequestContext(request);
    try {
      const data = await branchCore.getBranchById(id, token, internalKey);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 404;
      const error = e?.response?.data?.error ?? 'Failed to fetch branch';
      return sendFail(reply, error, statusCode);
    }
  });

  app.post('/', { preHandler: [requireSeller] }, async (request, reply) => {
    const { token, internalKey, branchId } = getCoreRequestContext(request);
    const body = createBranchSchema.parse(request.body);
    try {
      const data = await branchCore.createBranch(
        {
          name: body.name,
          address: body.address,
          phone: body.phone,
          comunaId: body.comunaId,
          codigoPostal: body.codigoPostal,
        },
        token,
        internalKey,
        branchId
      );
      return sendOk(reply, data, 201);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to create branch';
      return sendFail(reply, error, statusCode);
    }
  });

  app.post('/branchAction', { preHandler: [requireSeller] }, async (request, reply) => {
    const { token, internalKey, branchId } = getCoreRequestContext(request);
    const body = createBranchSchema.parse(request.body);
    try {
      const data = await branchCore.createBranch(
        {
          name: body.name,
          address: body.address,
          phone: body.phone,
          comunaId: body.comunaId,
          codigoPostal: body.codigoPostal,
        },
        token,
        internalKey,
        branchId
      );
      return sendOk(reply, data, 201);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to create branch';
      return sendFail(reply, error, statusCode);
    }
  });

  app.patch('/:id', { preHandler: [requireSeller] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { token, internalKey, branchId } = getCoreRequestContext(request);
    const body = updateBranchSchema.parse(request.body);

    try {
      const data = await branchCore.updateBranch(id, body, token, internalKey, branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to update branch';
      return sendFail(reply, error, statusCode);
    }
  });

  app.delete('/:id', { preHandler: [requireSeller] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { token, internalKey, branchId } = getCoreRequestContext(request);

    try {
      const data = await branchCore.deleteBranch(id, token, internalKey, branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to deactivate branch';
      return sendFail(reply, error, statusCode);
    }
  });

  app.post('/:id/restore', { preHandler: [requireSeller] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { token, internalKey, branchId } = getCoreRequestContext(request);

    try {
      const data = await branchCore.restoreBranch(id, token, internalKey, branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to restore branch';
      return sendFail(reply, error, statusCode);
    }
  });
};

export default branchRoutes;
