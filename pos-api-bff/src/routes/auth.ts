import { FastifyInstance } from 'fastify';

import { z } from 'zod';

import { requireCoreRequestContext } from '../utils/coreRequestContext.js';
import { sendFail, sendOk } from '../utils/response.js';

const registerSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
  roleId: z.string().min(1),
  branchId: z.string().min(1),
  whatsappPhone: z.string().max(32).optional().nullable(),
});

const legalAcceptanceSchema = z.object({
  termsVersion: z.string().min(1),
  privacyVersion: z.string().min(1),
  accepted: z.literal(true),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  legalAcceptance: legalAcceptanceSchema.optional(),
});

const userUpsertSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  roleId: z.string().min(1),
  whatsappPhone: z.string().max(32).optional().nullable(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8),
});

const authRoutes = async (app: FastifyInstance) => {
  const authCore = new (await import('../services/apiCoreServiceAuth.js')).ApiCoreServiceAuth();







  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    try {
      const data = await authCore.login({
        email: body.email,
        password: body.password,
        legalAcceptance: body.legalAcceptance,
      });
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string; data?: unknown } } };
      const statusCode = err?.response?.status ?? 401;
      const payload = err?.response?.data;
      const error = payload?.error ?? 'Login failed';
      if (statusCode === 403 && error === 'LEGAL_REAUTH_REQUIRED' && payload?.data) {
        return reply.status(403).send({
          success: false,
          error,
          data: payload.data,
          code: 403,
        });
      }
      return sendFail(reply, error, statusCode);
    }
  });

  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    try {
      const data = await authCore.register({
        fullName: body.fullName,
        email: body.email,
        password: body.password,
        roleId: body.roleId,
        branchId: body.branchId,
        whatsappPhone: body.whatsappPhone,
      });
      return sendOk(reply, data, 201);

    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Register failed';
      return sendFail(reply, error, statusCode);
    }
  });

  app.get('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await authCore.getUser(id, ctx.token, ctx.internalKey, ctx.branchId);

      return sendOk(reply, data);

    } catch (e: any) {
      const statusCode = e?.response?.status ?? 404;
      const error = e?.response?.data?.error ?? 'Failed to get user';
      return sendFail(reply, error, statusCode);
    }
  });

  app.put('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const body = userUpsertSchema.parse(request.body);

    try {
      const data = await authCore.updateUser(id, body, ctx.token, ctx.internalKey, ctx.branchId);

      return sendOk(reply, data);

    } catch (e: any) {
      const statusCode = e?.response?.status ?? 501;
      const error = e?.response?.data?.error ?? 'Failed to update user';
      return sendFail(reply, error, statusCode);
    }
  });

  app.delete('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await authCore.deleteUser(id, ctx.token, ctx.internalKey, ctx.branchId);

      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to delete user';
      return sendFail(reply, error, statusCode);
    }
  });

  app.patch('/users/:id/restore', async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await authCore.restoreUser(id, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to restore user';
      return sendFail(reply, error, statusCode);
    }
  });

  app.patch('/users/:id/password', async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;
    const body = resetPasswordSchema.parse(request.body);

    try {
      const data = await authCore.resetUserPassword(
        id,
        body.password,
        ctx.token,
        ctx.internalKey,
        ctx.branchId
      );
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to reset user password';
      return sendFail(reply, error, statusCode);
    }
  });


  app.get('/users', async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await authCore.listUsers(ctx.token, ctx.internalKey, ctx.branchId);

      return sendOk(reply, data);

    } catch (e: any) {
      const statusCode = e?.response?.status ?? 501;
      const error = e?.response?.data?.error ?? 'Failed to list users';
      return sendFail(reply, error, statusCode);
    }
  });

  app.get('/roles', async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await authCore.listRoles(ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 501;
      const error = e?.response?.data?.error ?? 'Failed to list roles';
      return sendFail(reply, error, statusCode);
    }
  });
};

export default authRoutes;

