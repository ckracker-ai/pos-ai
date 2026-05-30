import { Router, Response } from 'express';
import { sendOk, sendFail } from '../../../middleware/globalErrorHandler';
import {
  authenticateToken,
  requireSeller,
  requireAuditor,
  AuthenticatedRequest,
} from '../../../middleware/auth.middleware';
import { getEffectiveEmpresaId } from '../../../utils/tenantScope';
import shrinkageDelegate from '../delegates/ShrinkageDelegate';
import Shrinkage from '../models/Shrinkage.model';

const router = Router();

router.use(authenticateToken);

router.get('/shrinkage', requireSeller, async (req: AuthenticatedRequest, res) => {
  const result = await shrinkageDelegate.listByBranch(
    getEffectiveEmpresaId(req),
    req.user!.branchId
  );
  if (result.success) return sendOk(res, { shrinkages: result.value });
  return sendFail(res, result.error, 404);
});

router.get('/shrinkage/status/:status', requireSeller, async (req: AuthenticatedRequest, res) => {
  const result = await shrinkageDelegate.listByBranchAndStatus(
    getEffectiveEmpresaId(req),
    req.user!.branchId,
    req.params.status
  );
  if (result.success) return sendOk(res, { shrinkages: result.value });
  return sendFail(res, result.error, 404);
});

const parseCreateBody = (
  body: unknown
):
  | { valid: true; reason: string; details: Array<{ productId: string; quantity: number }> }
  | { valid: false; error: string } => {
  const b = body as Record<string, unknown> | undefined;
  const reason = typeof b?.reason === 'string' ? b.reason.trim() : '';

  if (Array.isArray(b?.details) && b.details.length > 0) {
    const details = (b.details as Array<Record<string, unknown>>).map((line) => ({
      productId: String(line.productId ?? ''),
      quantity: Number(line.quantity),
    }));

    if (details.some((d) => !d.productId || !Number.isFinite(d.quantity) || d.quantity <= 0)) {
      return { valid: false, error: 'VALIDATION_ERROR: invalid shrinkage details' };
    }

    return { valid: true, reason: reason || 'Merma registrada', details };
  }

  const productId = typeof b?.productId === 'string' ? b.productId.trim() : '';
  const quantity = Number(b?.quantity);

  if (!productId) return { valid: false, error: 'VALIDATION_ERROR: productId is required' };
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { valid: false, error: 'VALIDATION_ERROR: quantity must be greater than zero' };
  }
  if (!reason) return { valid: false, error: 'VALIDATION_ERROR: reason is required' };

  return {
    valid: true,
    reason,
    details: [{ productId, quantity }],
  };
};

const createShrinkageHandler = async (req: AuthenticatedRequest, res: Response) => {
  const parsed = parseCreateBody(req.body);
  if (!parsed.valid) return sendFail(res, parsed.error, 422);

  try {
    const result = await shrinkageDelegate.createPending(
      getEffectiveEmpresaId(req),
      req.user!.branchId,
      req.user!.userId,
      parsed.reason,
      parsed.details
    );

    if (!result.success) {
      const status = result.error.startsWith('PRODUCT_NOT_FOUND') ? 404 : 400;
      return sendFail(res, result.error, status);
    }

    return sendOk(res, { shrinkages: result.value }, 201);
  } catch {
    return sendFail(res, 'ERROR_CREATING_SHRINKAGE', 400);
  }
};

router.post('/shrinkage', requireSeller, createShrinkageHandler);
router.post('/shrinkageAction', requireSeller, createShrinkageHandler);

router.post('/shrinkage/:id/approve', requireAuditor, async (req: AuthenticatedRequest, res) => {
  const result = await shrinkageDelegate.approve(
    req.params.id,
    getEffectiveEmpresaId(req),
    req.user!.branchId,
    req.user!.userId,
    req.user!.roleName
  );

  if (!result.success) {
    const status =
      result.error === 'SHRINKAGE_NOT_FOUND' || result.error === 'SHRINKAGE_BRANCH_MISMATCH'
        ? 404
        : 400;
    return sendFail(res, result.error, status);
  }

  return sendOk(res, { shrinkage: result.value });
});

router.post('/shrinkage/:id/reject', requireAuditor, async (req: AuthenticatedRequest, res) => {
  const note =
    typeof (req.body as { rejectionNote?: string })?.rejectionNote === 'string'
      ? (req.body as { rejectionNote: string }).rejectionNote
      : undefined;

  const result = await shrinkageDelegate.reject(
    req.params.id,
    getEffectiveEmpresaId(req),
    req.user!.branchId,
    req.user!.userId,
    note,
    req.user!.roleName
  );

  if (!result.success) {
    const status =
      result.error === 'SHRINKAGE_NOT_FOUND' || result.error === 'SHRINKAGE_BRANCH_MISMATCH'
        ? 404
        : 400;
    return sendFail(res, result.error, status);
  }

  return sendOk(res, { shrinkage: result.value });
});

router.get('/shrinkage/:id', requireSeller, async (req: AuthenticatedRequest, res) => {
  const list = await shrinkageDelegate.listByBranch(getEffectiveEmpresaId(req), req.user!.branchId);
  if (!list.success) return sendFail(res, list.error, 404);

  const shrinkage = list.value.find((s) => s.id === req.params.id);
  if (!shrinkage) return sendFail(res, 'SHRINKAGE_NOT_FOUND', 404);
  return sendOk(res, { shrinkage });
});

router.patch('/shrinkage/:id', requireAuditor, async (req: AuthenticatedRequest, res) => {
  const body = req.body as { status?: string; rejectionNote?: string };
  const status = String(body?.status ?? '').toUpperCase();
  const empresaId = getEffectiveEmpresaId(req);

  if (status === 'APPROVED') {
    const result = await shrinkageDelegate.approve(
      req.params.id,
      empresaId,
      req.user!.branchId,
      req.user!.userId,
      req.user!.roleName
    );
    if (!result.success) {
      const code =
        result.error === 'SHRINKAGE_NOT_FOUND' || result.error === 'SHRINKAGE_BRANCH_MISMATCH'
          ? 404
          : 400;
      return sendFail(res, result.error, code);
    }
    return sendOk(res, { shrinkage: result.value });
  }

  if (status === 'REJECTED') {
    const result = await shrinkageDelegate.reject(
      req.params.id,
      empresaId,
      req.user!.branchId,
      req.user!.userId,
      body.rejectionNote,
      req.user!.roleName
    );
    if (!result.success) {
      const code =
        result.error === 'SHRINKAGE_NOT_FOUND' || result.error === 'SHRINKAGE_BRANCH_MISMATCH'
          ? 404
          : 400;
      return sendFail(res, result.error, code);
    }
    return sendOk(res, { shrinkage: result.value });
  }

  return sendFail(res, 'VALIDATION_ERROR: status must be APPROVED or REJECTED', 422);
});

router.delete('/shrinkage/:id', requireAuditor, async (req: AuthenticatedRequest, res) => {
  const empresaId = getEffectiveEmpresaId(req);
  const list = await shrinkageDelegate.listByBranch(empresaId, req.user!.branchId);
  if (!list.success) return sendFail(res, list.error, 404);

  const row = list.value.find((s) => s.id === req.params.id);
  if (!row) return sendFail(res, 'SHRINKAGE_NOT_FOUND', 404);
  if (row.status === 'APPROVED') {
    return sendFail(res, 'CANNOT_DELETE_APPROVED_SHRINKAGE', 409);
  }

  await Shrinkage.destroy({
    where: { id: req.params.id, empresaId, branchId: req.user!.branchId },
  });
  return sendOk(res, { deleted: true });
});

export default router;
