import type { FastifyInstance } from 'fastify';
import { requireSeller } from '../middlewares/requireSeller.js';
import { requireCoreRequestContext } from '../utils/coreRequestContext.js';
import { virtualMenuService } from '../services/virtualMenuService.js';

const wspRoutes = async (app: FastifyInstance) => {
  app.get('/menu/:branchId', { preHandler: [requireSeller] }, async (request, reply) => {
    const { branchId } = request.params as { branchId: string };
    const ctx = requireCoreRequestContext(reply, request, { requireBranchId: false });
    if (!ctx) return;

    const result = await virtualMenuService.getMenuByBranch(
      branchId,
      ctx.token,
      ctx.internalKey
    );

    if (!result.ok) {
      return reply.status(result.statusCode).send({ success: false, error: result.error, data: null });
    }

    return reply.send({ success: true, data: result.data, error: null });
  });

  app.patch('/menu/:branchId', { preHandler: [requireSeller] }, async (request, reply) => {
    const { branchId } = request.params as { branchId: string };
    const ctx = requireCoreRequestContext(reply, request, { requireBranchId: false });
    if (!ctx) return;

    const body = (request.body ?? {}) as {
      title?: string;
      subtitle?: string | null;
      isEnabled?: boolean;
    };

    const result = await virtualMenuService.updateMenu(
      branchId,
      body,
      ctx.token,
      ctx.internalKey
    );

    if (!result.ok) {
      return reply.status(result.statusCode).send({ success: false, error: result.error, data: null });
    }

    return reply.send({ success: true, data: result.data, error: null });
  });

  app.post('/menu/:branchId/sync-catalog', { preHandler: [requireSeller] }, async (request, reply) => {
    const { branchId } = request.params as { branchId: string };
    const ctx = requireCoreRequestContext(reply, request, { requireBranchId: false });
    if (!ctx) return;

    const result = await virtualMenuService.syncFromCatalog(
      branchId,
      ctx.token,
      ctx.internalKey
    );

    if (!result.ok) {
      return reply.status(result.statusCode).send({ success: false, error: result.error, data: null });
    }

    return reply.send({ success: true, data: result.data, error: null });
  });

  app.get('/menu/:branchId/qr', { preHandler: [requireSeller] }, async (request, reply) => {
    const { branchId } = request.params as { branchId: string };
    const ctx = requireCoreRequestContext(reply, request, { requireBranchId: false });
    if (!ctx) return;

    const menuResult = await virtualMenuService.getMenuByBranch(
      branchId,
      ctx.token,
      ctx.internalKey
    );

    if (!menuResult.ok) {
      return reply.status(menuResult.statusCode).send({ success: false, error: menuResult.error, data: null });
    }

    const slug = menuResult.data.menu.publicSlug;
    const qrResult = await virtualMenuService.generateQrPayload(slug);
    if (!qrResult.ok) {
      return reply.status(qrResult.statusCode).send({ success: false, error: qrResult.error, data: null });
    }

    return reply.send({ success: true, data: qrResult.data, error: null });
  });
};

export default wspRoutes;
