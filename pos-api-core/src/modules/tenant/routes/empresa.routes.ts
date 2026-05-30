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
  return 400;
};

/** Onboarding: crea empresa (+ sucursal central opcional). Solo x-internal-key (sin JWT). */
router.post('/', async (req, res) => {
  const result = await empresaDelegate.create(req.body ?? {});
  if (result.success) {
    return sendOk(res, { empresa: result.value.empresa, branch: result.value.branch ?? null }, 201);
  }
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.use(authenticateToken);

/** Perfil de la empresa del usuario autenticado. */
router.get('/me', requireComanda, async (req: AuthenticatedRequest, res) => {
  const result = await empresaDelegate.findById(getEffectiveEmpresaId(req));
  if (result.success) return sendOk(res, { empresa: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

/** Lista tenant actual (1 registro). Extensible a super-admin. */
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
  const result = await empresaDelegate.update(
    req.params.id,
    getEffectiveEmpresaId(req),
    req.body ?? {}
  );
  if (result.success) return sendOk(res, { empresa: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

router.post('/:id/restore', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const result = await empresaDelegate.restore(req.params.id, getEffectiveEmpresaId(req));
  if (result.success) return sendOk(res, { empresa: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

/** Soft delete: estado SUSPENDIDO (no borra datos). */
router.delete('/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const result = await empresaDelegate.deactivate(req.params.id, getEffectiveEmpresaId(req));
  if (result.success) return sendOk(res, { deactivated: true, empresa: result.value });
  return sendFail(res, result.error, mapErrorStatus(result.error));
});

export default router;
