import { Router } from 'express';
import inventoryDelegate from '../delegates/InventoryDelegate';
import { sendOk, sendFail } from '../../../middleware/globalErrorHandler';
import { authenticateToken, requireSeller, AuthenticatedRequest } from '../../../middleware/auth.middleware';
import { getEffectiveBranchId, resolveBranchId } from '../../../utils/branchContext';
import { getEffectiveEmpresaId } from '../../../utils/tenantScope';

const router = Router();

router.use(authenticateToken);

router.get('/branch/:branchId', requireSeller, async (req: AuthenticatedRequest, res) => {
  const branchId = resolveBranchId(req, req.params.branchId);
  if (!branchId) return sendFail(res, 'BRANCH_ACCESS_DENIED', 403);

  const result = await inventoryDelegate.getByBranch(getEffectiveEmpresaId(req), branchId);
  if (result.success) return sendOk(res, { inventory: result.value });
  return sendFail(res, result.error, 404);
});

router.get('/branch/:branchId/product/:productId', requireSeller, async (req: AuthenticatedRequest, res) => {
  const branchId = resolveBranchId(req, req.params.branchId);
  if (!branchId) return sendFail(res, 'BRANCH_ACCESS_DENIED', 403);

  const result = await inventoryDelegate.getOne(
    getEffectiveEmpresaId(req),
    req.params.productId,
    branchId
  );
  if (result.success) return sendOk(res, { stock: result.value });
  return sendFail(res, result.error, 404);
});

router.post('/branch/:branchId/stock', requireSeller, async (req: AuthenticatedRequest, res) => {
  const branchId = resolveBranchId(req, req.params.branchId);
  if (!branchId) return sendFail(res, 'BRANCH_ACCESS_DENIED', 403);

  const body = req.body as { productId?: string; quantity?: number; minStock?: number };
  if (!body?.productId) return sendFail(res, 'VALIDATION_ERROR: productId is required', 422);

  const result = await inventoryDelegate.addProductToBranch(getEffectiveEmpresaId(req), {
    productId: body.productId,
    branchId,
    quantity: Number(body.quantity ?? 0),
    minStock: Number(body.minStock ?? 0),
  });

  if (result.success) return sendOk(res, result.value, 201);

  const status =
    result.error === 'PRODUCT_NOT_FOUND'
      ? 404
      : result.error === 'STOCK_ALREADY_IN_BRANCH'
        ? 409
        : 400;
  return sendFail(res, result.error, status);
});

router.patch('/stock', requireSeller, async (req: AuthenticatedRequest, res) => {
  const empresaId = getEffectiveEmpresaId(req);
  const branchId = getEffectiveBranchId(req);
  const body = req.body as { productId?: string; quantity?: number; minStock?: number };
  if (!body?.productId) return sendFail(res, 'VALIDATION_ERROR: productId is required', 422);
  if (body.quantity === undefined || body.quantity === null) {
    return sendFail(res, 'VALIDATION_ERROR: quantity is required', 422);
  }

  const result = await inventoryDelegate.upsert(empresaId, {
    productId: body.productId,
    branchId,
    quantity: Number(body.quantity),
    minStock: Number(body.minStock ?? 0),
  });

  if (result.success) return sendOk(res, result.value);
  return sendFail(res, result.error, 400);
});

router.patch('/stock/adjust', requireSeller, async (req: AuthenticatedRequest, res) => {
  const empresaId = getEffectiveEmpresaId(req);
  const branchId = getEffectiveBranchId(req);
  const body = req.body as { productId?: string; delta?: number; quantity?: number };
  if (!body?.productId) return sendFail(res, 'VALIDATION_ERROR: productId is required', 422);

  const delta = body.delta !== undefined ? Number(body.delta) : Number(body.quantity);
  if (!Number.isFinite(delta)) {
    return sendFail(res, 'VALIDATION_ERROR: delta (or quantity) must be a number', 422);
  }

  const result = await inventoryDelegate.adjust(empresaId, {
    productId: body.productId,
    branchId,
    delta,
  });

  if (result.success) return sendOk(res, result.value);
  return sendFail(res, result.error, 400);
});

router.get('/branch/:branchId/low-stock', requireSeller, async (req: AuthenticatedRequest, res) => {
  const branchId = resolveBranchId(req, req.params.branchId);
  if (!branchId) return sendFail(res, 'BRANCH_ACCESS_DENIED', 403);

  const result = await inventoryDelegate.getLowStock(getEffectiveEmpresaId(req), branchId);
  if (result.success) return sendOk(res, result.value);
  return sendFail(res, result.error, 404);
});

export default router;
