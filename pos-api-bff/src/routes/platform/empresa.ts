import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requirePlatformAuth } from '../../middlewares/requirePlatformAuth.js';
import { extractCoreError } from '../../utils/extractCoreError.js';
import { sendFail, sendOk } from '../../utils/response.js';
import { registerPlatformAssistantEmpresaRoutes } from './assistantHandlers.js';

const createEmpresaSchema = z.object({
  rut: z.string().min(1),
  razonSocial: z.string().min(1),
  nombreFantasia: z.string().optional(),
  giroSii: z.string().optional(),
  direccionComercial: z.string().optional(),
  correoFacturacion: z.string().optional(),
  urlLogo: z.string().optional(),
  slug: z.string().optional(),
  branchName: z.string().optional(),
  adminEmail: z.string().email().optional(),
  adminPassword: z.string().min(8).optional(),
  adminFullName: z.string().optional(),
  planId: z.string().uuid().optional(),
  planCodigo: z.enum(['BASICO', 'ESTANDAR', 'FULL']).optional(),
});

const assistantBindingSchema = z.object({
  externalId: z.string().min(8),
  defaultBranchId: z.string().uuid().nullable().optional(),
  adminNotifyPhone: z.string().min(8).nullable().optional(),
});

const createTenantUserSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  roleCodigo: z.enum(['ADMIN', 'AUDITOR', 'SELLER', 'COMANDA']).optional(),
  roleId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
});

const resetTenantPasswordSchema = z.object({
  password: z.string().min(8),
});

const createTenantBranchSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
});

const patchTenantBranchSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

const updatePlatformSchema = z.object({
  razonSocial: z.string().min(1).optional(),
  nombreFantasia: z.string().nullable().optional(),
  giroSii: z.string().nullable().optional(),
  direccionComercial: z.string().nullable().optional(),
  correoFacturacion: z.string().nullable().optional(),
  urlLogo: z.string().nullable().optional(),
  slug: z.string().min(1).optional(),
  estado: z.enum(['ACTIVO', 'SUSPENDIDO', 'PENDIENTE_ONBOARDING']).optional(),
  planId: z.string().uuid().optional(),
  planCodigo: z.enum(['BASICO', 'ESTANDAR', 'FULL']).optional(),
  assistantAdminPhone: z
    .union([z.string().min(8), z.literal('')])
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v)),
  transferBankName: z.string().nullable().optional(),
  transferAccountType: z.string().nullable().optional(),
  transferAccount: z.string().nullable().optional(),
  transferHolderName: z.string().nullable().optional(),
  transferRut: z.string().nullable().optional(),
});

const platformEmpresaRoutes = async (app: FastifyInstance) => {
  const core = new (
    await import('../../services/apiCoreServicePlatformEmpresa.js')
  ).ApiCoreServicePlatformEmpresa();

  app.addHook('preHandler', requirePlatformAuth);

  registerPlatformAssistantEmpresaRoutes(app);

  app.get('/:empresaId/checkout', async (request, reply) => {
    const { empresaId } = request.params as { empresaId: string };
    try {
      const data = await core.getCheckout(empresaId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to fetch checkout summary'),
        err.response?.status ?? 500
      );
    }
  });

  app.post('/:empresaId/checkout/confirm-payment', async (request, reply) => {
    const { empresaId } = request.params as { empresaId: string };
    const body = z
      .object({
        provider: z.string().min(1).default('SANDBOX'),
        reference: z.string().min(1),
        extendDays: z.number().int().positive().optional(),
      })
      .parse(request.body ?? {});
    try {
      const data = await core.confirmCheckout(empresaId, body);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to confirm checkout payment'),
        err.response?.status ?? 400
      );
    }
  });

  app.patch('/:empresaId/suscripcion', async (request, reply) => {
    const { empresaId } = request.params as { empresaId: string };
    const body = z
      .object({
        extendDays: z.number().int().positive().optional(),
        graceDays: z.number().int().positive().optional(),
        cancel: z.boolean().optional(),
        note: z.string().max(500).optional(),
      })
      .parse(request.body ?? {});

    try {
      const data = await core.patchSuscripcion(empresaId, body);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to update subscription'),
        err.response?.status ?? 500
      );
    }
  });

  app.post('/:empresaId/voice-bindings', async (request, reply) => {
    const { empresaId } = request.params as { empresaId: string };
    const body = assistantBindingSchema.parse(request.body);
    try {
      const data = await core.upsertVoiceBinding(empresaId, body);
      return sendOk(reply, data, 201);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to save voice binding'),
        err.response?.status ?? 400
      );
    }
  });

  app.post('/:empresaId/assistant-bindings', async (request, reply) => {
    const { empresaId } = request.params as { empresaId: string };
    const body = assistantBindingSchema.parse(request.body);
    try {
      const data = await core.upsertAssistantBinding(empresaId, body);
      return sendOk(reply, data, 201);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to save assistant binding'),
        err.response?.status ?? 400
      );
    }
  });

  app.get('/', async (_request, reply) => {
    try {
      const data = await core.list();
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to list empresas'), err.response?.status ?? 500);
    }
  });

  app.post('/:empresaId/branches', async (request, reply) => {
    const { empresaId } = request.params as { empresaId: string };
    const body = createTenantBranchSchema.parse(request.body);
    try {
      const data = await core.createTenantBranch(empresaId, body);
      return sendOk(reply, data, 201);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to create tenant branch'),
        err.response?.status ?? 400
      );
    }
  });

  app.patch('/:empresaId/branches/:branchId', async (request, reply) => {
    const { empresaId, branchId } = request.params as { empresaId: string; branchId: string };
    const body = patchTenantBranchSchema.parse(request.body);
    try {
      const data = await core.patchTenantBranch(empresaId, branchId, body);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to update tenant branch'),
        err.response?.status ?? 400
      );
    }
  });

  app.get('/:empresaId/users', async (request, reply) => {
    const { empresaId } = request.params as { empresaId: string };
    try {
      const data = await core.listTenantUsers(empresaId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to list tenant users'),
        err.response?.status ?? 500
      );
    }
  });

  app.post('/:empresaId/users', async (request, reply) => {
    const { empresaId } = request.params as { empresaId: string };
    const body = createTenantUserSchema.parse(request.body);
    try {
      const data = await core.createTenantUser(empresaId, body);
      return sendOk(reply, data, 201);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to create tenant user'),
        err.response?.status ?? 400
      );
    }
  });

  app.patch('/:empresaId/users/:userId/password', async (request, reply) => {
    const { empresaId, userId } = request.params as { empresaId: string; userId: string };
    const body = resetTenantPasswordSchema.parse(request.body);
    try {
      const data = await core.resetTenantUserPassword(empresaId, userId, body.password);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to reset tenant password'),
        err.response?.status ?? 400
      );
    }
  });

  app.post('/:empresaId/users/:userId/legal-reset', async (request, reply) => {
    const { empresaId, userId } = request.params as { empresaId: string; userId: string };
    try {
      const data = await core.resetTenantUserLegal(empresaId, userId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to reset legal acceptances'),
        err.response?.status ?? 400
      );
    }
  });

  app.post('/:empresaId/users/:userId/legal-grant', async (request, reply) => {
    const { empresaId, userId } = request.params as { empresaId: string; userId: string };
    try {
      const data = await core.grantTenantUserLegal(empresaId, userId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to grant legal acceptances'),
        err.response?.status ?? 400
      );
    }
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const data = await core.getById(id);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to fetch empresa'), err.response?.status ?? 404);
    }
  });

  app.post('/', async (request, reply) => {
    const body = createEmpresaSchema.parse(request.body);
    try {
      const data = await core.create(body);
      return sendOk(reply, data, 201);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to create empresa'), err.response?.status ?? 400);
    }
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updatePlatformSchema.parse(request.body);
    try {
      const data = await core.updatePlatform(id, body);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to update empresa'), err.response?.status ?? 400);
    }
  });

  app.post('/:id/suspend', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const data = await core.suspend(id);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to suspend empresa'), err.response?.status ?? 400);
    }
  });

  app.post('/:id/activate', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const data = await core.activate(id);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(reply, extractCoreError(e, 'Failed to activate empresa'), err.response?.status ?? 400);
    }
  });

  app.get('/:empresaId/data-deletion-status', async (request, reply) => {
    const { empresaId } = request.params as { empresaId: string };
    try {
      const data = await core.getDataDeletionStatus(empresaId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to fetch deletion status'),
        err.response?.status ?? 400
      );
    }
  });

  app.post('/:empresaId/data-deletion-request', async (request, reply) => {
    const { empresaId } = request.params as { empresaId: string };
    const body = z
      .object({
        confirmationPhrase: z.string().min(1),
        notes: z.string().max(2000).optional().nullable(),
      })
      .parse(request.body ?? {});
    try {
      const data = await core.createDataDeletionRequest(empresaId, body);
      return sendOk(reply, data, 201);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to schedule data deletion'),
        err.response?.status ?? 400
      );
    }
  });

  app.post('/:empresaId/data-deletion-cancel', async (request, reply) => {
    const { empresaId } = request.params as { empresaId: string };
    const body = z.object({ requestId: z.string().uuid().optional() }).parse(request.body ?? {});
    try {
      const data = await core.cancelDataDeletionRequest(empresaId, body);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to cancel data deletion'),
        err.response?.status ?? 400
      );
    }
  });

  app.post('/:empresaId/support-access', async (request, reply) => {
    const { empresaId } = request.params as { empresaId: string };
    try {
      const data = await core.createSupportAccess(empresaId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to create support access'),
        err.response?.status ?? 400
      );
    }
  });
};

export default platformEmpresaRoutes;
