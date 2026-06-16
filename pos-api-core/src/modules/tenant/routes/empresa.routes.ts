import { Router } from 'express';
import { sendOk, sendFail } from '../../../middleware/globalErrorHandler';
import {
  authenticateToken,
  requireAdmin,
  requireComanda,
  AuthenticatedRequest,
} from '../../../middleware/auth.middleware';
import { getEffectiveEmpresaId } from '../../../utils/tenantScope';
import empresaDelegate from '../delegates/EmpresaDelegate';
import platformTenantOpsDelegate from '../../platform/delegates/PlatformTenantOpsDelegate';
import dataSubjectDelegate from '../../legal/delegates/DataSubjectDelegate';
import planRoutes from '../../saas/routes/plan.routes';
import assistantDelegate from '../../assistant/delegates/AssistantDelegate';
import suscripcionDelegate from '../../saas/delegates/SuscripcionDelegate';
import { countPlatformStats } from '../../saas/utils/planLimits';
import { withJobLock } from '../../../lib/jobLock';

const router = Router();

const mapErrorStatus = (error: string): number => {
  if (error === 'EMPRESA_NOT_FOUND') return 404;
  if (error === 'EMPRESA_ACCESS_DENIED') return 403;
  if (error.startsWith('VALIDATION_ERROR')) return 422;
  if (error.startsWith('RUT_') || error.startsWith('SLUG_') || error.startsWith('EMPRESA_DUPLICATE')) {
    return 409;
  }
  if (error.startsWith('EMAIL_TAKEN') || error.startsWith('ROLE_NOT_FOUND')) return 409;
  if (error === 'USER_NOT_FOUND' || error === 'BRANCH_NOT_FOUND') return 404;
  if (error.startsWith('BRANCH_NOT_FOUND')) return 404;
  if (error === 'PLAN_NOT_FOUND') return 404;
  if (error === 'SUBSCRIPTION_ALREADY_ACTIVE') return 409;
  if (error === 'ASSISTANT_PHONE_IN_USE') return 409;
  if (error.startsWith('ASSISTANT_PLAN_REQUIRED')) return 403;
  if (error.startsWith('ASSISTANT_VOICE_PLAN_REQUIRED')) return 403;
  if (error.startsWith('TRIBUTARIO_FORMAL_REQUIRED')) return 403;
  if (error.startsWith('PLAN_LIMIT_')) return 403;
  if (error === 'DATA_DELETION_REQUEST_ALREADY_OPEN') return 409;
  if (error === 'DELETION_CONFIRMATION_MISMATCH') return 422;
  if (error === 'DATA_DELETION_REQUEST_NOT_FOUND') return 404;
  if (error === 'DATA_DELETION_REQUEST_NOT_CANCELLABLE') return 409;
  if (error === 'DATA_DELETION_ROLLBACK_EXPIRED') return 409;
  if (error === 'SUPPORT_ACCESS_NO_ADMIN') return 404;
  return 400;
};

// ---------------------------------------------------------------------------
// Plataforma / onboarding — solo x-internal-key (sin JWT)
// ---------------------------------------------------------------------------

router.post('/', async (req, res) => {
  const result = await empresaDelegate.create(req.body ?? {});
  if (result.success) {
    return sendOk(
      res,
      {
        empresa: result.value.empresa,
        branch: result.value.branch ?? null,
        adminUserId: result.value.adminUserId ?? null,
      },
      201
    );
  }
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.use('/planes', planRoutes);

router.get('/platform/dashboard', async (_req, res) => {
  const result = await countPlatformStats();
  if (result.success) return sendOk(res, { stats: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.get('/platform/list', async (_req, res) => {
  const result = await empresaDelegate.listForPlatform();
  if (result.success) return sendOk(res, { empresas: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.get('/platform/assistant-bindings', async (_req, res) => {
  const result = await assistantDelegate.listAllBindings();
  if (result.success) return sendOk(res, { bindings: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.get('/platform/:empresaId/branches', async (req, res) => {
  const result = await platformTenantOpsDelegate.listBranches(req.params.empresaId);
  if (result.success) return sendOk(res, { sucursales: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.post('/platform/:empresaId/branches', async (req, res) => {
  const body = req.body ?? {};
  const result = await platformTenantOpsDelegate.createBranch(req.params.empresaId, {
    name: String(body.name ?? ''),
    address: body.address != null ? String(body.address) : undefined,
    phone: body.phone != null ? String(body.phone) : undefined,
  });
  if (result.success) return sendOk(res, { sucursal: result.value }, 201);
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.patch('/platform/:empresaId/branches/:branchId', async (req, res) => {
  const body = req.body ?? {};
  const result = await platformTenantOpsDelegate.patchBranch(
    req.params.empresaId,
    req.params.branchId,
    {
      name: body.name != null ? String(body.name) : undefined,
      address: body.address != null ? String(body.address) : undefined,
      phone: body.phone != null ? String(body.phone) : undefined,
      isActive: body.isActive != null ? Boolean(body.isActive) : undefined,
    }
  );
  if (result.success) return sendOk(res, { sucursal: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.patch('/platform/assistant-bindings/:bindingId/session-branch', async (req, res) => {
  const branchId = req.body?.branchId ?? null;
  const result = await assistantDelegate.setSessionBranch(req.params.bindingId, branchId);
  if (result.success) return sendOk(res, { updated: true, branchId });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.get('/platform/:empresaId/assistant-bindings', async (req, res) => {
  const result = await assistantDelegate.listBindingsForEmpresa(req.params.empresaId);
  if (result.success) return sendOk(res, { bindings: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.post('/platform/:empresaId/assistant-bindings', async (req, res) => {
  const body = req.body ?? {};
  const result = await assistantDelegate.upsertWhatsappBinding({
    empresaId: req.params.empresaId,
    externalId: String(body.externalId ?? body.telefono ?? ''),
    defaultBranchId: body.defaultBranchId ?? body.default_branch_id ?? null,
    adminNotifyPhone: body.adminNotifyPhone ?? body.admin_notify_phone ?? undefined,
  });
  if (result.success) return sendOk(res, result.value, 201);
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.post('/platform/:empresaId/voice-bindings', async (req, res) => {
  const body = req.body ?? {};
  const result = await assistantDelegate.upsertVoiceBinding({
    empresaId: req.params.empresaId,
    externalId: String(body.externalId ?? body.telefono ?? ''),
    defaultBranchId: body.defaultBranchId ?? body.default_branch_id ?? null,
  });
  if (result.success) return sendOk(res, result.value, 201);
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.get('/platform/:empresaId/users', async (req, res) => {
  const result = await platformTenantOpsDelegate.listUsers(req.params.empresaId);
  if (result.success) return sendOk(res, { users: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.post('/platform/:empresaId/users', async (req, res) => {
  const body = req.body ?? {};
  const result = await platformTenantOpsDelegate.createUser(req.params.empresaId, {
    fullName: String(body.fullName ?? ''),
    email: String(body.email ?? ''),
    password: String(body.password ?? ''),
    roleCodigo: body.roleCodigo,
    roleId: body.roleId,
    branchId: body.branchId,
  });
  if (result.success) return sendOk(res, { user: result.value }, 201);
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.patch('/platform/:empresaId/users/:userId/password', async (req, res) => {
  const password = String(req.body?.password ?? '');
  const result = await platformTenantOpsDelegate.resetPassword(
    req.params.empresaId,
    req.params.userId,
    password
  );
  if (result.success) return sendOk(res, result.value);
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.post('/platform/:empresaId/users/:userId/legal-reset', async (req, res) => {
  const result = await platformTenantOpsDelegate.resetUserLegal(
    req.params.empresaId,
    req.params.userId
  );
  if (result.success) return sendOk(res, result.value);
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.post('/platform/:empresaId/users/:userId/legal-grant', async (req, res) => {
  const result = await platformTenantOpsDelegate.grantUserLegal(
    req.params.empresaId,
    req.params.userId
  );
  if (result.success) return sendOk(res, result.value);
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.get('/platform/:id', async (req, res) => {
  const result = await empresaDelegate.findById(req.params.id);
  if (result.success) return sendOk(res, { empresa: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.patch('/:id/platform', async (req, res) => {
  const result = await empresaDelegate.updatePlatform(req.params.id, req.body ?? {});
  if (result.success) return sendOk(res, { empresa: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.patch('/platform/:empresaId/suscripcion', async (req, res) => {
  const body = req.body ?? {};
  const result = await empresaDelegate.patchSuscripcionPlatform(req.params.empresaId, {
    extendDays: body.extendDays != null ? Number(body.extendDays) : undefined,
    graceDays: body.graceDays != null ? Number(body.graceDays) : undefined,
    cancel: Boolean(body.cancel),
    note: body.note != null ? String(body.note) : undefined,
  });
  if (result.success) return sendOk(res, { suscripcion: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.post('/platform/jobs/refresh-subscriptions', async (_req, res) => {
  const locked = await withJobLock('refresh-subscriptions', 300, () =>
    suscripcionDelegate.refreshAllExpired()
  );
  if (!locked.acquired) {
    return sendOk(res, { job: 'refresh-subscriptions', skipped: true, reason: locked.reason });
  }
  const result = locked.value;
  if (result.success) return sendOk(res, { job: 'refresh-subscriptions', ...result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.get('/platform/:empresaId/checkout', async (req, res) => {
  const result = await empresaDelegate.getCheckoutSummary(req.params.empresaId);
  if (result.success) return sendOk(res, { checkout: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.post('/platform/:empresaId/checkout/confirm-payment', async (req, res) => {
  const body = req.body ?? {};
  const result = await empresaDelegate.confirmCheckoutPayment(req.params.empresaId, {
    provider: String(body.provider ?? 'SANDBOX'),
    reference: String(body.reference ?? body.transactionId ?? `sandbox-${Date.now()}`),
    extendDays: body.extendDays != null ? Number(body.extendDays) : undefined,
  });
  if (result.success) return sendOk(res, result.value);
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.get('/platform/:empresaId/data-deletion-status', async (req, res) => {
  const result = await dataSubjectDelegate.getDeletionStatus(req.params.empresaId);
  if (result.success) return sendOk(res, result.value);
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.post('/platform/:empresaId/data-deletion-request', async (req, res) => {
  const body = req.body ?? {};
  const result = await dataSubjectDelegate.createDeletionRequest({
    empresaId: req.params.empresaId,
    confirmationPhrase: String(body.confirmationPhrase ?? ''),
    notes: body.notes != null ? String(body.notes) : null,
    initiatedByPlatform: true,
  });
  if (result.success) return sendOk(res, result.value, 201);
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.post('/platform/:empresaId/data-deletion-cancel', async (req, res) => {
  const body = req.body ?? {};
  const result = await dataSubjectDelegate.cancelDeletionRequest({
    empresaId: req.params.empresaId,
    requestId: body.requestId != null ? String(body.requestId) : undefined,
  });
  if (result.success) return sendOk(res, result.value);
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.post('/platform/:empresaId/support-access', async (req, res) => {
  const result = await platformTenantOpsDelegate.createSupportAccess(req.params.empresaId);
  if (result.success) return sendOk(res, result.value);
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.post('/platform/jobs/process-data-deletions', async (_req, res) => {
  const locked = await withJobLock('process-data-deletions', 300, () =>
    dataSubjectDelegate.processScheduledDeletions()
  );
  if (!locked.acquired) {
    return sendOk(res, { job: 'process-data-deletions', skipped: true, reason: locked.reason });
  }
  const result = locked.value;
  if (result.success) return sendOk(res, { job: 'process-data-deletions', ...result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.post('/:id/suspend', async (req, res) => {
  const result = await empresaDelegate.suspendPlatform(req.params.id);
  if (result.success) return sendOk(res, { suspended: true, empresa: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.post('/:id/activate', async (req, res) => {
  const result = await empresaDelegate.activatePlatform(req.params.id);
  if (result.success) return sendOk(res, { activated: true, empresa: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

// ---------------------------------------------------------------------------
// Tenant autenticado — perfil comercial (sin lifecycle)
// ---------------------------------------------------------------------------

router.use(authenticateToken);

router.get('/me', requireComanda, async (req: AuthenticatedRequest, res) => {
  const result = await empresaDelegate.findById(getEffectiveEmpresaId(req));
  if (result.success) return sendOk(res, { empresa: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.get('/', requireComanda, async (req: AuthenticatedRequest, res) => {
  const result = await empresaDelegate.listForTenant(getEffectiveEmpresaId(req));
  if (result.success) return sendOk(res, { empresas: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.get('/:id', requireComanda, async (req: AuthenticatedRequest, res) => {
  const result = await empresaDelegate.findById(req.params.id, getEffectiveEmpresaId(req));
  if (result.success) return sendOk(res, { empresa: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.patch('/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const result = await empresaDelegate.updateForTenant(
    req.params.id,
    getEffectiveEmpresaId(req),
    req.body ?? {}
  );
  if (result.success) return sendOk(res, { empresa: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.patch('/:id/formalizacion-progreso', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const result = await empresaDelegate.updateFormalizacionProgreso(
    req.params.id,
    getEffectiveEmpresaId(req),
    req.body ?? {}
  );
  if (result.success) return sendOk(res, { empresa: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.get('/:id/data-export', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const result = await dataSubjectDelegate.exportTenantData(
    req.params.id,
    getEffectiveEmpresaId(req)
  );
  if (result.success) return sendOk(res, { export: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.get('/:id/data-deletion-status', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const result = await dataSubjectDelegate.getDeletionStatus(
    req.params.id,
    getEffectiveEmpresaId(req)
  );
  if (result.success) return sendOk(res, result.value);
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.post('/:id/data-deletion-request', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const body = req.body ?? {};
  const result = await dataSubjectDelegate.createDeletionRequest({
    empresaId: req.params.id,
    tenantEmpresaId: getEffectiveEmpresaId(req),
    requestedBy: req.user!.userId,
    confirmationPhrase: String(body.confirmationPhrase ?? ''),
    notes: body.notes != null ? String(body.notes) : null,
  });
  if (result.success) return sendOk(res, result.value, 201);
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.post('/:id/data-deletion-cancel', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const body = req.body ?? {};
  const result = await dataSubjectDelegate.cancelDeletionRequest({
    empresaId: req.params.id,
    tenantEmpresaId: getEffectiveEmpresaId(req),
    requestId: body.requestId != null ? String(body.requestId) : undefined,
  });
  if (result.success) return sendOk(res, result.value);
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.post('/:id/formalizar', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const body = req.body ?? {};
  const result = await empresaDelegate.formalizarEmpresa(
    req.params.id,
    getEffectiveEmpresaId(req),
    {
      rut: String(body.rut ?? ''),
      razonSocial: body.razonSocial != null ? String(body.razonSocial) : undefined,
      giroSii: body.giroSii != null ? String(body.giroSii) : null,
    }
  );
  if (result.success) return sendOk(res, { empresa: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

export default router;
