import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requirePlatformAuth } from '../../middlewares/requirePlatformAuth.js';
import { extractCoreError } from '../../utils/extractCoreError.js';
import { sendFail, sendOk } from '../../utils/response.js';
import { ApiCoreServiceSupport } from '../../services/apiCoreServiceSupport.js';
import { sessionOrBearerToken } from '../../middlewares/sessionAuth.js';

const createSchema = z.object({
  empresaId: z.string().uuid(),
  subject: z.string().trim().min(3).max(200),
  body: z.string().trim().min(1).max(4000),
  severity: z.enum(['BAJA', 'MEDIA', 'ALTA']).optional(),
});

const messageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

const patchSchema = z.object({
  status: z.enum(['ABIERTO', 'ESPERANDO_CLIENTE', 'ESPERANDO_SOPORTE', 'RESUELTO']),
});

const platformSoporteRoutes = async (app: FastifyInstance) => {
  const core = new ApiCoreServiceSupport();
  app.addHook('preHandler', requirePlatformAuth);

  app.get('/casos', async (request, reply) => {
    const q = request.query as Record<string, string>;
    try {
      const data = await core.platformList({
        ...(q.empresaId ? { empresaId: q.empresaId } : {}),
        ...(q.status ? { status: q.status } : {}),
        ...(q.openOnly ? { openOnly: q.openOnly } : { openOnly: 'true' }),
      });
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to list support cases'), err.response?.status ?? 500);
    }
  });

  app.get('/casos/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const data = await core.platformGet(id);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to load support case'), err.response?.status ?? 500);
    }
  });

  app.post('/casos', async (request, reply) => {
    const body = createSchema.parse(request.body ?? {});
    try {
      const decoded = await request.jwtVerify<{ userId?: string }>().catch(() => ({ userId: undefined }));
      const data = await core.platformCreate({
        ...body,
        createdById: decoded.userId ?? null,
      });
      return sendOk(reply, data, 201);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to create support case'), err.response?.status ?? 400);
    }
  });

  app.post('/casos/:id/mensajes', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = messageSchema.parse(request.body ?? {});
    try {
      const token = sessionOrBearerToken(request);
      request.headers.authorization = `Bearer ${token}`;
      const decoded = await request.jwtVerify<{ userId?: string }>().catch(() => ({ userId: undefined }));
      const data = await core.platformAddMessage(id, { body: body.body, authorId: decoded.userId ?? null });
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to reply'), err.response?.status ?? 400);
    }
  });

  app.patch('/casos/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = patchSchema.parse(request.body ?? {});
    try {
      const data = await core.platformPatch(id, body);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to update case'), err.response?.status ?? 400);
    }
  });
};

export default platformSoporteRoutes;
