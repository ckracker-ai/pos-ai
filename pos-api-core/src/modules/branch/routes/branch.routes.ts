import { Router } from 'express';
import Branch from '../models/Branch.model';
import { sendOk, sendFail } from '../../../middleware/globalErrorHandler';
import {
  authenticateToken,
  requireAdmin,
  requireComanda,
  AuthenticatedRequest,
} from '../../../middleware/auth.middleware';
import { getEffectiveEmpresaId } from '../../../utils/tenantScope';
import { assertCanAddActiveBranch } from '../../saas/utils/planLimits';

const router = Router();

router.use(authenticateToken);

router.get('/', requireComanda, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const role = String(req.user!.roleName ?? '').toUpperCase();
    const branches =
      role === 'COMANDA'
        ? await Branch.findAll({ where: { id: req.user!.branchId, empresaId } })
        : await Branch.findAll({ where: { empresaId } });
    return sendOk(res, { branches });
  } catch {
    return sendFail(res, 'ERROR_FETCHING_BRANCHES', 500);
  }
});

router.get('/:id', requireComanda, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const role = String(req.user!.roleName ?? '').toUpperCase();
    if (role === 'COMANDA' && String(req.params.id) !== String(req.user!.branchId)) {
      return sendFail(res, 'BRANCH_NOT_FOUND', 404);
    }

    const branch = await Branch.findOne({ where: { id: req.params.id, empresaId } });
    if (!branch) return sendFail(res, 'BRANCH_NOT_FOUND', 404);
    return sendOk(res, { branch });
  } catch {
    return sendFail(res, 'ERROR_FETCHING_BRANCH', 500);
  }
});

router.post('/', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const limit = await assertCanAddActiveBranch(empresaId);
    if (!limit.success) return sendFail(res, limit.error, 403);
    const branch = await Branch.create({ ...req.body, empresaId });
    return sendOk(res, { branch }, 201);
  } catch {
    return sendFail(res, 'ERROR_CREATING_BRANCH', 400);
  }
});

const validateBranchCreatePayload = (
  body: unknown
): { valid: true; payload: Record<string, unknown> } | { valid: false } => {
  const b = body as { name?: unknown } | undefined;
  const nameRaw = b?.name;
  if (typeof nameRaw !== 'string') return { valid: false };
  const name = nameRaw.trim();
  if (!name) return { valid: false };
  return { valid: true, payload: { ...b, name } };
};

router.post('/branchAction', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const validation = validateBranchCreatePayload(req.body);
  if (!validation.valid) return sendFail(res, 'VALIDATION_ERROR: Branch.name is required', 422);

  try {
    const empresaId = getEffectiveEmpresaId(req);
    const limit = await assertCanAddActiveBranch(empresaId);
    if (!limit.success) return sendFail(res, limit.error, 403);
    const branch = await Branch.create({ ...validation.payload, empresaId });
    return sendOk(res, { branch }, 201);
  } catch (err) {
    console.error('[Branch] ERROR_CREATING_BRANCH (/branchAction)', err);
    return sendFail(res, 'ERROR_CREATING_BRANCH', 400);
  }
});

router.patch('/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const branch = await Branch.findOne({ where: { id: req.params.id, empresaId } });
    if (!branch) return sendFail(res, 'BRANCH_NOT_FOUND', 404);

    const body = req.body as {
      name?: string;
      address?: string;
      phone?: string;
      isActive?: boolean;
    };

    const patch: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
    if (body.address !== undefined) patch.address = body.address;
    if (body.phone !== undefined) patch.phone = body.phone;
    if (body.isActive !== undefined) patch.isActive = body.isActive;

    await branch.update(patch);
    await branch.reload();

    return sendOk(res, { branch });
  } catch {
    return sendFail(res, 'ERROR_UPDATING_BRANCH', 400);
  }
});

router.post('/:id/restore', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const branch = await Branch.findOne({ where: { id: req.params.id, empresaId } });
    if (!branch) return sendFail(res, 'BRANCH_NOT_FOUND', 404);

    if (!branch.getDataValue('isActive')) {
      const limit = await assertCanAddActiveBranch(empresaId);
      if (!limit.success) return sendFail(res, limit.error, 403);
    }

    await branch.update({ isActive: true });
    await branch.reload();

    return sendOk(res, { branch });
  } catch {
    return sendFail(res, 'ERROR_RESTORING_BRANCH', 400);
  }
});

router.delete('/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const branch = await Branch.findOne({ where: { id: req.params.id, empresaId } });
    if (!branch) return sendFail(res, 'BRANCH_NOT_FOUND', 404);

    await branch.update({ isActive: false });
    await branch.reload();

    return sendOk(res, { deactivated: true, branch });
  } catch {
    return sendFail(res, 'ERROR_DELETING_BRANCH', 400);
  }
});

export default router;
