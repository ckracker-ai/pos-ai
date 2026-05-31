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

const router = Router();

const mapErrorStatus = (error: string): number => {
  if (error === 'EMPRESA_NOT_FOUND') return 404;
  if (error === 'EMPRESA_ACCESS_DENIED') return 403;
  if (error.startsWith('VALIDATION_ERROR')) return 422;
  if (error.startsWith('RUT_') || error.startsWith('SLUG_') || error.startsWith('EMPRESA_DUPLICATE')) {
    return 409;
  }
  if (error.startsWith('EMAIL_TAKEN') || error.startsWith('ROLE_NOT_FOUND')) return 409;
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

router.get('/platform/list', async (_req, res) => {
  const result = await empresaDelegate.listForPlatform();
  if (result.success) return sendOk(res, { empresas: result.value });
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

export default router;
