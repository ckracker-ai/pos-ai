import { Router } from 'express';
import { sendFail, sendOk } from '../../../middleware/globalErrorHandler';
import { authenticateToken, AuthenticatedRequest } from '../../../middleware/auth.middleware';
import { validate } from '../../../middleware/validate';
import { getEffectiveEmpresaId } from '../../../utils/tenantScope';
import supportDelegate from '../delegates/SupportDelegate';
import { draftCopilotReply, searchManual, sectionsForRole } from '../erpManual';
import {
  addMessageBodySchema,
  copilotBodySchema,
  createCaseBodySchema,
  createTenantCaseBodySchema,
  idParamSchema,
  listQuerySchema,
  manualSearchQuerySchema,
  patchCaseBodySchema,
} from '../schemas/support.schemas';

const router = Router();

const mapStatus = (error: string): number => {
  if (error === 'SUPPORT_CASE_NOT_FOUND' || error === 'EMPRESA_NOT_FOUND') return 404;
  if (error.startsWith('VALIDATION_ERROR')) return 400;
  return 400;
};

router.get('/platform/casos', validate(listQuerySchema, 'query'), async (req, res) => {
  const q = req.query as { empresaId?: string; status?: string; openOnly?: string };
  const result = await supportDelegate.list({
    empresaId: q.empresaId,
    status: q.status as never,
    openOnly: q.openOnly === '1' || q.openOnly === 'true',
  });
  if (result.success) return sendOk(res, result.value);
  return sendFail(res, result.error, mapStatus(result.error));
});

router.get('/platform/casos/:id', validate(idParamSchema, 'params'), async (req, res) => {
  const result = await supportDelegate.getById(req.params.id);
  if (result.success) return sendOk(res, { caso: result.value });
  return sendFail(res, result.error, mapStatus(result.error));
});

router.post('/platform/casos', validate(createCaseBodySchema, 'body'), async (req, res) => {
  const body = req.body as {
    empresaId: string;
    subject: string;
    body: string;
    origin?: 'PLATFORM';
    severity?: 'BAJA' | 'MEDIA' | 'ALTA';
    createdById?: string | null;
  };
  const result = await supportDelegate.create({
    ...body,
    origin: body.origin ?? 'PLATFORM',
    createdByKind: 'PLATFORM',
    authorKind: 'PLATFORM',
  });
  if (result.success) return sendOk(res, { caso: result.value }, 201);
  return sendFail(res, result.error, mapStatus(result.error));
});

router.post(
  '/platform/casos/:id/mensajes',
  validate(idParamSchema, 'params'),
  validate(addMessageBodySchema, 'body'),
  async (req, res) => {
    const body = req.body as { body: string; authorId?: string | null };
    const result = await supportDelegate.addMessage({
      casoId: req.params.id,
      body: body.body,
      authorKind: 'PLATFORM',
      authorId: body.authorId ?? null,
    });
    if (result.success) return sendOk(res, { caso: result.value });
    return sendFail(res, result.error, mapStatus(result.error));
  }
);

router.patch(
  '/platform/casos/:id',
  validate(idParamSchema, 'params'),
  validate(patchCaseBodySchema, 'body'),
  async (req, res) => {
    const result = await supportDelegate.patchStatus(req.params.id, req.body.status);
    if (result.success) return sendOk(res, { caso: result.value });
    return sendFail(res, result.error, mapStatus(result.error));
  }
);

router.get('/manual', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const empresaId = getEffectiveEmpresaId(req);
  if (!empresaId) return sendFail(res, 'TENANT_CONTEXT_REQUIRED', 403);
  return sendOk(res, { sections: sectionsForRole(req.user?.roleName) });
});

router.get(
  '/manual/search',
  authenticateToken,
  validate(manualSearchQuerySchema, 'query'),
  async (req: AuthenticatedRequest, res) => {
    const empresaId = getEffectiveEmpresaId(req);
    if (!empresaId) return sendFail(res, 'TENANT_CONTEXT_REQUIRED', 403);
    const q = String((req.query as { q?: string }).q ?? '');
    return sendOk(res, { hits: searchManual(q, req.user?.roleName) });
  }
);

router.get('/casos', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const empresaId = getEffectiveEmpresaId(req);
  if (!empresaId) return sendFail(res, 'TENANT_CONTEXT_REQUIRED', 403);
  const result = await supportDelegate.list({ empresaId, openOnly: true });
  if (result.success) return sendOk(res, result.value);
  return sendFail(res, result.error, mapStatus(result.error));
});

router.get(
  '/casos/:id',
  authenticateToken,
  validate(idParamSchema, 'params'),
  async (req: AuthenticatedRequest, res) => {
    const empresaId = getEffectiveEmpresaId(req);
    if (!empresaId) return sendFail(res, 'TENANT_CONTEXT_REQUIRED', 403);
    const result = await supportDelegate.getById(req.params.id, empresaId);
    if (result.success) return sendOk(res, { caso: result.value });
    return sendFail(res, result.error, mapStatus(result.error));
  }
);

router.post('/casos', authenticateToken, validate(createTenantCaseBodySchema, 'body'), async (req: AuthenticatedRequest, res) => {
  const empresaId = getEffectiveEmpresaId(req);
  if (!empresaId) return sendFail(res, 'TENANT_CONTEXT_REQUIRED', 403);
  const body = req.body as { subject: string; body: string; severity?: 'BAJA' | 'MEDIA' | 'ALTA' };
  const result = await supportDelegate.create({
    empresaId,
    subject: body.subject,
    body: body.body,
    origin: 'TENANT',
    severity: body.severity,
    createdByKind: 'USER',
    createdById: req.user?.userId ?? null,
    authorKind: 'USER',
  });
  if (result.success) return sendOk(res, { caso: result.value }, 201);
  return sendFail(res, result.error, mapStatus(result.error));
});

router.post('/casos/ask', authenticateToken, validate(createTenantCaseBodySchema, 'body'), async (req: AuthenticatedRequest, res) => {
  const empresaId = getEffectiveEmpresaId(req);
  if (!empresaId) return sendFail(res, 'TENANT_CONTEXT_REQUIRED', 403);
  const body = req.body as { subject: string; body: string };
  const created = await supportDelegate.create({
    empresaId,
    subject: body.subject,
    body: body.body,
    origin: 'COPILOT',
    createdByKind: 'USER',
    createdById: req.user?.userId ?? null,
    authorKind: 'USER',
  });
  if (!created.success) return sendFail(res, created.error, mapStatus(created.error));
  const draft = draftCopilotReply(body.body, req.user?.roleName);
  const copilot = await supportDelegate.addMessage({
    casoId: created.value.id,
    body: draft.reply,
    authorKind: 'COPILOT',
    empresaId,
  });
  if (!copilot.success) return sendFail(res, copilot.error, mapStatus(copilot.error));
  if (draft.escalate) {
    await supportDelegate.patchStatus(created.value.id, 'ESPERANDO_SOPORTE', empresaId);
  }
  const fresh = await supportDelegate.getById(created.value.id, empresaId);
  if (!fresh.success) return sendFail(res, fresh.error, mapStatus(fresh.error));
  return sendOk(res, { caso: fresh.value, escalate: draft.escalate, hits: draft.hits }, 201);
});

router.post(
  '/casos/:id/mensajes',
  authenticateToken,
  validate(idParamSchema, 'params'),
  validate(addMessageBodySchema, 'body'),
  async (req: AuthenticatedRequest, res) => {
    const empresaId = getEffectiveEmpresaId(req);
    if (!empresaId) return sendFail(res, 'TENANT_CONTEXT_REQUIRED', 403);
    const result = await supportDelegate.addMessage({
      casoId: req.params.id,
      body: req.body.body,
      authorKind: 'USER',
      authorId: req.user?.userId ?? null,
      empresaId,
    });
    if (result.success) return sendOk(res, { caso: result.value });
    return sendFail(res, result.error, mapStatus(result.error));
  }
);

router.post(
  '/casos/:id/copilot',
  authenticateToken,
  validate(idParamSchema, 'params'),
  validate(copilotBodySchema, 'body'),
  async (req: AuthenticatedRequest, res) => {
    const empresaId = getEffectiveEmpresaId(req);
    if (!empresaId) return sendFail(res, 'TENANT_CONTEXT_REQUIRED', 403);
    const added = await supportDelegate.addMessage({
      casoId: req.params.id,
      body: req.body.body,
      authorKind: 'USER',
      authorId: req.user?.userId ?? null,
      empresaId,
    });
    if (!added.success) return sendFail(res, added.error, mapStatus(added.error));
    const draft = draftCopilotReply(req.body.body, req.user?.roleName);
    const copilot = await supportDelegate.addMessage({
      casoId: req.params.id,
      body: draft.reply,
      authorKind: 'COPILOT',
      empresaId,
    });
    if (!copilot.success) return sendFail(res, copilot.error, mapStatus(copilot.error));
    if (draft.escalate) {
      await supportDelegate.patchStatus(req.params.id, 'ESPERANDO_SOPORTE', empresaId);
    }
    const fresh = await supportDelegate.getById(req.params.id, empresaId);
    if (!fresh.success) return sendFail(res, fresh.error, mapStatus(fresh.error));
    return sendOk(res, { caso: fresh.value, escalate: draft.escalate, hits: draft.hits });
  }
);

export default router;
