import { Router } from 'express';
import Branch from '../models/Branch.model';
import { sendOk, sendFail } from '../../../middleware/globalErrorHandler';
import {
  authenticateToken,
  requireSeller,
  requireComanda,
  AuthenticatedRequest,
} from '../../../middleware/auth.middleware';

const router = Router();

// All branch routes require authentication
router.use(authenticateToken);

// Branch management - Vendedor can manage
router.get('/', requireComanda, async (req: AuthenticatedRequest, res) => {
  try {
    const role = String(req.user!.roleName ?? '').toUpperCase();
    const branches =
      role === 'COMANDA'
        ? await Branch.findAll({ where: { id: req.user!.branchId } })
        : await Branch.findAll();
    return sendOk(res, { branches });
  } catch {
    return sendFail(res, 'ERROR_FETCHING_BRANCHES', 500);
  }
});

router.get('/:id', requireComanda, async (req: AuthenticatedRequest, res) => {
  try {
    const role = String(req.user!.roleName ?? '').toUpperCase();
    if (role === 'COMANDA' && String(req.params.id) !== String(req.user!.branchId)) {
      return sendFail(res, 'BRANCH_NOT_FOUND', 404);
    }

    const branch = await Branch.findByPk(req.params.id);
    if (!branch) return sendFail(res, 'BRANCH_NOT_FOUND', 404);
    return sendOk(res, { branch });
  } catch {
    return sendFail(res, 'ERROR_FETCHING_BRANCH', 500);
  }
});

// Create
router.post('/', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const branch = await Branch.create(req.body);
    return sendOk(res, { branch }, 201);
  } catch {
    return sendFail(res, 'ERROR_CREATING_BRANCH', 400);
  }
});

const validateBranchCreatePayload = (body: unknown): { valid: true; payload: Record<string, unknown> } | { valid: false } => {
  const b = body as { name?: unknown } | undefined;
  const nameRaw = b?.name;
  if (typeof nameRaw !== 'string') return { valid: false };
  const name = nameRaw.trim();
  if (!name) return { valid: false };
  return { valid: true, payload: { ...b, name } };
};

router.post('/branchAction', requireSeller, async (req: AuthenticatedRequest, res) => {
  const validation = validateBranchCreatePayload(req.body);
  if (!validation.valid) return sendFail(res, 'VALIDATION_ERROR: Branch.name is required', 422);

  try {
    const branch = await Branch.create(validation.payload);
    return sendOk(res, { branch }, 201);
  } catch (err) {
    console.error('[Branch] ERROR_CREATING_BRANCH (/branchAction)', err);
    return sendFail(res, 'ERROR_CREATING_BRANCH', 400);
  }
});



// Update (partial)
router.patch('/:id', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const [updated] = await Branch.update(req.body, { where: { id: req.params.id } });
    if (!updated) return sendFail(res, 'BRANCH_NOT_FOUND', 404);

    const branch = await Branch.findByPk(req.params.id);
    if (!branch) return sendFail(res, 'BRANCH_NOT_FOUND', 404);

    return sendOk(res, { branch });
  } catch {
    return sendFail(res, 'ERROR_UPDATING_BRANCH', 400);
  }
});

// Delete
router.delete('/:id', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const deleted = await Branch.destroy({ where: { id: req.params.id } });
    if (!deleted) return sendFail(res, 'BRANCH_NOT_FOUND', 404);
    return sendOk(res, { deleted: true });
  } catch {
    return sendFail(res, 'ERROR_DELETING_BRANCH', 400);
  }
});

export default router;

