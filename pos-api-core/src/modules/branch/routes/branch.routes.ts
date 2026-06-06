import { Router } from 'express';
import Branch from '../models/Branch.model';
import { branchListInclude, presentBranch } from '../utils/branchPresenter';
import { validateBranchTerritory } from '../utils/branchValidation';
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
        ? await Branch.findAll({
            where: { id: req.user!.branchId, empresaId },
            include: branchListInclude,
          })
        : await Branch.findAll({ where: { empresaId }, include: branchListInclude });
    return sendOk(res, { branches: branches.map((b) => presentBranch(b)) });
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

    const branch = await Branch.findOne({
      where: { id: req.params.id, empresaId },
      include: branchListInclude,
    });
    if (!branch) return sendFail(res, 'BRANCH_NOT_FOUND', 404);
    return sendOk(res, { branch: presentBranch(branch) });
  } catch {
    return sendFail(res, 'ERROR_FETCHING_BRANCH', 500);
  }
});

router.post('/', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const limit = await assertCanAddActiveBranch(empresaId);
    if (!limit.success) return sendFail(res, limit.error, 403);
    const body = req.body as {
      name?: string;
      address?: string;
      phone?: string;
      comunaId?: string;
      codigoPostal?: string;
    };
    const name = String(body.name ?? '').trim();
    if (!name) return sendFail(res, 'VALIDATION_ERROR: name required', 422);
    const territory = await validateBranchTerritory({
      comunaId: body.comunaId,
      codigoPostal: body.codigoPostal,
      requireTerritory: true,
    });
    if (!territory.ok) {
      const msg =
        territory.error === 'INVALID_POSTAL_CODE'
          ? 'Código postal inválido (7 dígitos)'
          : territory.error === 'COMUNA_REQUIRED'
            ? 'Comuna requerida'
            : 'Comuna no encontrada';
      return sendFail(res, msg, territory.status);
    }
    const branch = await Branch.create({
      name,
      address: body.address?.trim() || null,
      phone: body.phone?.trim() || null,
      comunaId: String(body.comunaId).trim(),
      codigoPostal: String(body.codigoPostal).trim(),
      empresaId,
    });
    await branch.reload({ include: branchListInclude });
    return sendOk(res, { branch: presentBranch(branch) }, 201);
  } catch {
    return sendFail(res, 'ERROR_CREATING_BRANCH', 400);
  }
});

const validateBranchCreatePayload = (
  body: unknown
): { valid: true; payload: Record<string, unknown> } | { valid: false; error?: string } => {
  const b = body as {
    name?: unknown;
    address?: unknown;
    phone?: unknown;
    comunaId?: unknown;
    codigoPostal?: unknown;
  };
  const name = typeof b?.name === 'string' ? b.name.trim() : '';
  if (!name) return { valid: false, error: 'name' };
  const comunaId = typeof b?.comunaId === 'string' ? b.comunaId.trim() : '';
  const codigoPostal = typeof b?.codigoPostal === 'string' ? b.codigoPostal.trim() : '';
  if (!comunaId || !codigoPostal) return { valid: false, error: 'territory' };
  return {
    valid: true,
    payload: {
      name,
      address: typeof b.address === 'string' ? b.address.trim() : null,
      phone: typeof b.phone === 'string' ? b.phone.trim() : null,
      comunaId,
      codigoPostal,
    },
  };
};

router.post('/branchAction', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const validation = validateBranchCreatePayload(req.body);
  if (!validation.valid) {
    const msg =
      validation.error === 'territory'
        ? 'VALIDATION_ERROR: comunaId and codigoPostal required'
        : 'VALIDATION_ERROR: Branch.name is required';
    return sendFail(res, msg, 422);
  }

  try {
    const empresaId = getEffectiveEmpresaId(req);
    const limit = await assertCanAddActiveBranch(empresaId);
    if (!limit.success) return sendFail(res, limit.error, 403);
    const territory = await validateBranchTerritory({
      comunaId: validation.payload.comunaId as string,
      codigoPostal: validation.payload.codigoPostal as string,
      requireTerritory: true,
    });
    if (!territory.ok) {
      return sendFail(res, territory.error, territory.status);
    }
    const branch = await Branch.create({ ...validation.payload, empresaId });
    await branch.reload({ include: branchListInclude });
    return sendOk(res, { branch: presentBranch(branch) }, 201);
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
      comunaId?: string;
      codigoPostal?: string;
      isActive?: boolean;
    };

    const patch: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
    if (body.address !== undefined) patch.address = body.address;
    if (body.phone !== undefined) patch.phone = body.phone;
    if (body.comunaId !== undefined) patch.comunaId = body.comunaId;
    if (body.codigoPostal !== undefined) patch.codigoPostal = body.codigoPostal;
    if (body.isActive !== undefined) patch.isActive = body.isActive;

    const territory = await validateBranchTerritory({
      comunaId: (patch.comunaId as string) ?? branch.comunaId,
      codigoPostal: (patch.codigoPostal as string) ?? branch.codigoPostal,
      requireTerritory: false,
    });
    if (!territory.ok) {
      return sendFail(res, territory.error, territory.status);
    }

    await branch.update(patch);
    await branch.reload({ include: branchListInclude });

    return sendOk(res, { branch: presentBranch(branch) });
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

    return sendOk(res, { branch: presentBranch(branch) });
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

    return sendOk(res, { deactivated: true, branch: presentBranch(branch) });
  } catch {
    return sendFail(res, 'ERROR_DELETING_BRANCH', 400);
  }
});

export default router;
