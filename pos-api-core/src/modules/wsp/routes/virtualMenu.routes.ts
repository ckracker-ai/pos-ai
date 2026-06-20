import { Router } from 'express';
import {
  authenticateToken,
  requireAuditor,
  requireSeller,
  AuthenticatedRequest,
} from '../../../middleware/auth.middleware';
import { sendOk, sendFail } from '../../../middleware/globalErrorHandler';
import { getEffectiveEmpresaId } from '../../../utils/tenantScope';
import virtualMenuDelegate from '../delegates/VirtualMenuDelegate';

const router = Router();

router.get('/public/:slug', async (req, res) => {
  try {
    const result = await virtualMenuDelegate.getPublicBySlug(req.params.slug);
    if (!result.success) return sendFail(res, result.error, result.error === 'MENU_NOT_FOUND' ? 404 : 400);
    return sendOk(res, { menu: result.value });
  } catch {
    return sendFail(res, 'ERROR_LOADING_PUBLIC_MENU', 500);
  }
});

router.use(authenticateToken);

router.get('/branch/:branchId', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const result = await virtualMenuDelegate.getByBranch(empresaId, req.params.branchId);
    if (!result.success) return sendFail(res, result.error, result.error === 'BRANCH_NOT_FOUND' ? 404 : 400);
    return sendOk(res, { menu: result.value });
  } catch {
    return sendFail(res, 'ERROR_LOADING_MENU', 500);
  }
});

router.patch('/branch/:branchId', requireAuditor, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const body = req.body ?? {};
    const result = await virtualMenuDelegate.updateMenu(empresaId, req.params.branchId, {
      title: body.title,
      subtitle: body.subtitle,
      isEnabled: body.isEnabled,
    });
    if (!result.success) return sendFail(res, result.error, 400);
    return sendOk(res, { menu: result.value });
  } catch {
    return sendFail(res, 'ERROR_UPDATING_MENU', 500);
  }
});

router.post('/branch/:branchId/categories', requireAuditor, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const body = req.body ?? {};
    const result = await virtualMenuDelegate.upsertCategory(empresaId, req.params.branchId, {
      id: body.id,
      name: String(body.name ?? ''),
      description: body.description,
      sortOrder: body.sortOrder,
      catalogCategoryId: body.catalogCategoryId,
    });
    if (!result.success) return sendFail(res, result.error, 400);
    return sendOk(res, { menu: result.value });
  } catch {
    return sendFail(res, 'ERROR_UPDATING_MENU_CATEGORY', 500);
  }
});

router.post('/branch/:branchId/products', requireAuditor, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const body = req.body ?? {};
    const result = await virtualMenuDelegate.upsertProduct(empresaId, req.params.branchId, {
      id: body.id,
      menuCategoryId: String(body.menuCategoryId ?? ''),
      productId: String(body.productId ?? ''),
      displayName: body.displayName,
      description: body.description,
      imageUrl: body.imageUrl,
      priceOverride: body.priceOverride,
      sortOrder: body.sortOrder,
      isFeatured: body.isFeatured,
    });
    if (!result.success) return sendFail(res, result.error, 400);
    return sendOk(res, { menu: result.value });
  } catch {
    return sendFail(res, 'ERROR_UPDATING_MENU_PRODUCT', 500);
  }
});

router.post('/branch/:branchId/sync-catalog', requireAuditor, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const result = await virtualMenuDelegate.syncFromCatalog(empresaId, req.params.branchId);
    if (!result.success) return sendFail(res, result.error, 400);
    return sendOk(res, { menu: result.value });
  } catch {
    return sendFail(res, 'ERROR_SYNCING_MENU_CATALOG', 500);
  }
});

export default router;
