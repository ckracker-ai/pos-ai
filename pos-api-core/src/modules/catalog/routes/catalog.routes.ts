import { Router } from 'express';
import { sendOk, sendFail } from '../../../middleware/globalErrorHandler';
import { authenticateToken, requireSeller, AuthenticatedRequest } from '../../../middleware/auth.middleware';
import Category from '../models/Category.model';
import Product from '../models/Product.model';
import Supplier from '../models/Supplier.model';
import catalogProductDelegate from '../delegates/CatalogProductDelegate';
import { getEffectiveBranchId } from '../../../utils/branchContext';
import { getEffectiveEmpresaId } from '../../../utils/tenantScope';

const router = Router();

// All catalog routes require authentication
router.use(authenticateToken);

// Categories - Vendedor can create, view, update and delete
router.get('/categories', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const categories = await Category.findAll({ where: { empresaId } });
    return sendOk(res, { categories });
  } catch {
    return sendFail(res, 'ERROR_FETCHING_CATEGORIES', 500);
  }
});

router.get('/categories/:id', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const category = await Category.findOne({ where: { id: req.params.id, empresaId } });
    if (!category) return sendFail(res, 'CATEGORY_NOT_FOUND', 404);
    return sendOk(res, { category });
  } catch {
    return sendFail(res, 'ERROR_FETCHING_CATEGORY', 500);
  }
});

const validateCategoryCreatePayload = (body: unknown): { valid: true; payload: Record<string, unknown> } | { valid: false } => {
  const b = body as { name?: unknown } | undefined;
  const nameRaw = b?.name;
  if (typeof nameRaw !== 'string') return { valid: false };
  const name = nameRaw.trim();
  if (!name) return { valid: false };
  return { valid: true, payload: { ...b, name } };
};

// POST /categoriesAction (crear)
router.post('/categoriesAction', requireSeller, async (req: AuthenticatedRequest, res) => {
  // Debug (temporal) para verificar cómo llega el payload
  // eslint-disable-next-line no-console
  console.error('[Catalog][Debug] /categoriesAction body=', req.body);

  const validation = validateCategoryCreatePayload(req.body);
  if (!validation.valid) return sendFail(res, 'VALIDATION_ERROR: Category.name is required', 422);

  try {
    const empresaId = getEffectiveEmpresaId(req);
    const category = await Category.create({ ...validation.payload, empresaId });
    return sendOk(res, { category }, 201);
  } catch (err) {
    console.error('[Catalog] ERROR_CREATING_CATEGORY (/categoriesAction)', err);
    throw err;
  }
});



// PATCH /categories/:id (update parcial)
router.patch('/categories/:id', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const category = await Category.findOne({ where: { id: req.params.id, empresaId } });
    if (!category) return sendFail(res, 'CATEGORY_NOT_FOUND', 404);

    const body = (req.body ?? {}) as {
      name?: string;
      description?: string | null;
      isActive?: boolean;
    };

    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.description !== undefined) patch.description = body.description;
    if (body.isActive !== undefined) patch.isActive = body.isActive;

    if (Object.keys(patch).length === 0) {
      return sendFail(res, 'VALIDATION_ERROR: no fields to update', 422);
    }

    await category.update(patch);
    await category.reload();

    return sendOk(res, { category });
  } catch (err) {
    console.error('[Catalog] PATCH category failed', err);
    return sendFail(res, 'ERROR_UPDATING_CATEGORY', 400);
  }
});

router.post('/categories/:id/restore', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const category = await Category.findOne({ where: { id: req.params.id, empresaId } });
    if (!category) return sendFail(res, 'CATEGORY_NOT_FOUND', 404);

    await category.update({ isActive: true });
    await category.reload();

    return sendOk(res, { category });
  } catch (err) {
    console.error('[Catalog] POST restore category failed', err);
    return sendFail(res, 'ERROR_UPDATING_CATEGORY', 400);
  }
});

// DELETE /categories/:id — desactivación lógica (soft delete)
router.delete('/categories/:id', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const category = await Category.findOne({ where: { id: req.params.id, empresaId } });
    if (!category) return sendFail(res, 'CATEGORY_NOT_FOUND', 404);

    await category.update({ isActive: false });
    return sendOk(res, { deactivated: true, category });
  } catch {
    return sendFail(res, 'ERROR_DELETING_CATEGORY', 400);
  }
});

// Backward compatibility (creación previa bajo /categories)
router.post('/categories', requireSeller, async (req: AuthenticatedRequest, res) => {
  // Debug (temporal) para verificar cómo llega el payload
  // eslint-disable-next-line no-console
  console.error('[Catalog][Debug] /categories body=', req.body);

  const validation = validateCategoryCreatePayload(req.body);
  if (!validation.valid) return sendFail(res, 'VALIDATION_ERROR: Category.name is required', 422);

  try {
    const empresaId = getEffectiveEmpresaId(req);
    const category = await Category.create({ ...validation.payload, empresaId });
    return sendOk(res, { category }, 201);
  } catch (err) {
    console.error('[Catalog] ERROR_CREATING_CATEGORY (/categories)', err);
    throw err;
  }
});





// Products - Vendedor can create, view, update, and delete

const parseCreateProductBody = (
  body: unknown
):
  | { valid: true; payload: import('../delegates/CatalogProductDelegate').CreateProductInput }
  | { valid: false; error: string } => {
  const b = body as Record<string, unknown> | undefined;
  const name = typeof b?.name === 'string' ? b.name.trim() : '';
  const sku = typeof b?.sku === 'string' ? b.sku.trim() : '';
  const categoryId = typeof b?.categoryId === 'string' ? b.categoryId.trim() : '';
  const supplierId = typeof b?.supplierId === 'string' ? b.supplierId.trim() : '';
  const price = Number(b?.price);

  if (!name || !sku || !categoryId || !supplierId) {
    return { valid: false, error: 'VALIDATION_ERROR: name, sku, categoryId and supplierId are required' };
  }
  if (!Number.isFinite(price) || price <= 0) {
    return { valid: false, error: 'VALIDATION_ERROR: price must be a positive number' };
  }

  const initialStockRaw = b?.initialStock ?? b?.stock;
  const initialStock =
    initialStockRaw === undefined || initialStockRaw === null
      ? 0
      : Number(initialStockRaw);

  if (!Number.isFinite(initialStock) || initialStock < 0) {
    return { valid: false, error: 'VALIDATION_ERROR: initialStock must be >= 0' };
  }

  const minStock = b?.minStock === undefined ? 0 : Number(b.minStock);
  if (!Number.isFinite(minStock) || minStock < 0) {
    return { valid: false, error: 'VALIDATION_ERROR: minStock must be >= 0' };
  }

  return {
    valid: true,
    payload: {
      name,
      sku,
      categoryId,
      supplierId,
      price,
      description: typeof b?.description === 'string' ? b.description : undefined,
      unit: typeof b?.unit === 'string' ? b.unit : undefined,
      isActive: b?.isActive !== false,
      initialStock,
      minStock,
    },
  };
};

// List products with branch stock (JOIN inventory_stock for active branch)
router.get('/products', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const branchId = getEffectiveBranchId(req);
    const result = await catalogProductDelegate.listByBranch(empresaId, branchId);

    if (!result.success) {
      const status = result.error === 'BRANCH_NOT_FOUND' ? 404 : 400;
      return sendFail(res, result.error, status);
    }

    return sendOk(res, { products: result.value, branchId });
  } catch {
    return sendFail(res, 'ERROR_FETCHING_PRODUCTS', 500);
  }
});

// Combined catalog for a branch (explicit branch in path; must match active branch)
router.get('/products/by-branch/:branchId', requireSeller, async (req: AuthenticatedRequest, res) => {
  const effective = getEffectiveBranchId(req);
  if (req.params.branchId !== effective) {
    return sendFail(res, 'BRANCH_ACCESS_DENIED', 403);
  }

  try {
    const empresaId = getEffectiveEmpresaId(req);
    const result = await catalogProductDelegate.listByBranch(empresaId, effective);
    if (!result.success) {
      const status = result.error === 'BRANCH_NOT_FOUND' ? 404 : 400;
      return sendFail(res, result.error, status);
    }
    return sendOk(res, { products: result.value, branchId: effective });
  } catch {
    return sendFail(res, 'ERROR_FETCHING_PRODUCTS', 500);
  }
});

// Transactional create: Product + InventoryStock for active branch
router.post('/products', requireSeller, async (req: AuthenticatedRequest, res) => {
  const validation = parseCreateProductBody(req.body);
  if (!validation.valid) return sendFail(res, validation.error, 422);

  try {
    const empresaId = getEffectiveEmpresaId(req);
    const branchId = getEffectiveBranchId(req);
    const result = await catalogProductDelegate.createWithBranchStock(
      empresaId,
      branchId,
      validation.payload
    );

    if (!result.success) {
      const status = result.error === 'BRANCH_NOT_FOUND' ? 404 : 400;
      return sendFail(res, result.error, status);
    }

    const { product, inventory } = result.value;
    return sendOk(
      res,
      {
        product,
        inventory: {
          id: inventory.id,
          productId: inventory.productId,
          branchId: inventory.branchId,
          quantity: inventory.quantity,
          minStock: inventory.minStock,
        },
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'ERROR_CREATING_PRODUCT';
    return sendFail(res, message, 400);
  }
});

// Aliases to match requested singular paths
router.get('/product/:id', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const product = await Product.findOne({
      where: { id: req.params.id, empresaId },
      include: [{ model: Category, as: 'category' }, { model: Supplier, as: 'supplier' }],
    });
    if (!product) return sendFail(res, 'PRODUCT_NOT_FOUND', 404);
    return sendOk(res, { product });
  } catch {
    return sendFail(res, 'ERROR_FETCHING_PRODUCT', 500);
  }
});

router.post('/product', requireSeller, async (req: AuthenticatedRequest, res) => {
  const validation = parseCreateProductBody(req.body);
  if (!validation.valid) return sendFail(res, validation.error, 422);

  try {
    const empresaId = getEffectiveEmpresaId(req);
    const branchId = getEffectiveBranchId(req);
    const result = await catalogProductDelegate.createWithBranchStock(
      empresaId,
      branchId,
      validation.payload
    );

    if (!result.success) {
      const status = result.error === 'BRANCH_NOT_FOUND' ? 404 : 400;
      return sendFail(res, result.error, status);
    }

    const { product, inventory } = result.value;
    return sendOk(
      res,
      {
        product,
        inventory: {
          id: inventory.id,
          productId: inventory.productId,
          branchId: inventory.branchId,
          quantity: inventory.quantity,
          minStock: inventory.minStock,
        },
      },
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'ERROR_CREATING_PRODUCT';
    return sendFail(res, message, 400);
  }
});

// GET by branchId is implemented via inventory stock (catalog doesn't store branchId)
router.get('/product/:branchId', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    // This endpoint is intentionally mapped to inventory listing for the authenticated user's branch.
    // The project doesn't define products-by-branch in catalog; inventory already exposes product info via stock records.
    return sendFail(res, 'NOT_IMPLEMENTED_USE_INVENTORY', 404);
  } catch {
    return sendFail(res, 'ERROR_FETCHING_PRODUCTS', 500);
  }
});

// Update
router.put('/products/:id', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const [updated] = await Product.update(req.body, { where: { id: req.params.id, empresaId } });
    if (!updated) return sendFail(res, 'PRODUCT_NOT_FOUND', 404);

    const product = await Product.findOne({
      where: { id: req.params.id, empresaId },
      include: [{ model: Category, as: 'category' }, { model: Supplier, as: 'supplier' }],
    });
    return sendOk(res, { product });
  } catch {
    return sendFail(res, 'ERROR_UPDATING_PRODUCT', 400);
  }
});

router.patch('/product/:id', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const [updated] = await Product.update(req.body, { where: { id: req.params.id, empresaId } });
    if (!updated) return sendFail(res, 'PRODUCT_NOT_FOUND', 404);

    const product = await Product.findOne({
      where: { id: req.params.id, empresaId },
      include: [{ model: Category, as: 'category' }, { model: Supplier, as: 'supplier' }],
    });
    return sendOk(res, { product });
  } catch {
    return sendFail(res, 'ERROR_UPDATING_PRODUCT', 400);
  }
});

// Delete
router.delete('/product/:id', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const deleted = await Product.destroy({ where: { id: req.params.id, empresaId } });
    if (!deleted) return sendFail(res, 'PRODUCT_NOT_FOUND', 404);
    return sendOk(res, { deleted: true });
  } catch {
    return sendFail(res, 'ERROR_DELETING_PRODUCT', 400);
  }
});


// Suppliers - Vendedor can manage
router.get('/suppliers', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const suppliers = await Supplier.findAll({ where: { empresaId } });
    return sendOk(res, { suppliers });
  } catch {
    return sendFail(res, 'ERROR_FETCHING_SUPPLIERS', 500);
  }
});

router.get('/suppliers/:id', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const supplier = await Supplier.findOne({ where: { id: req.params.id, empresaId } });
    if (!supplier) return sendFail(res, 'SUPPLIER_NOT_FOUND', 404);
    return sendOk(res, { supplier });
  } catch {
    return sendFail(res, 'ERROR_FETCHING_SUPPLIER', 500);
  }
});

const validateSupplierCreatePayload = (body: unknown): { valid: true; payload: Record<string, unknown> } | { valid: false } => {
  const b = body as { name?: unknown } | undefined;
  const nameRaw = b?.name;
  if (typeof nameRaw !== 'string') return { valid: false };
  const name = nameRaw.trim();
  if (!name) return { valid: false };
  return { valid: true, payload: { ...b, name } };
};

// POST /suppliers
router.post('/suppliers', requireSeller, async (req: AuthenticatedRequest, res) => {
  const validation = validateSupplierCreatePayload(req.body);
  if (!validation.valid) return sendFail(res, 'VALIDATION_ERROR: Supplier.name is required', 422);

  try {
    const empresaId = getEffectiveEmpresaId(req);
    const supplier = await Supplier.create({ ...validation.payload, empresaId });
    return sendOk(res, { supplier }, 201);
  } catch (err) {
    return sendFail(res, 'ERROR_CREATING_SUPPLIER', 400);
  }
});

// PATCH /suppliers/:id (partial update)
router.patch('/suppliers/:id', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const supplier = await Supplier.findOne({ where: { id: req.params.id, empresaId } });
    if (!supplier) return sendFail(res, 'SUPPLIER_NOT_FOUND', 404);

    const body = (req.body ?? {}) as {
      name?: string;
      contactEmail?: string | null;
      contactPhone?: string | null;
      address?: string | null;
      isActive?: boolean;
    };

    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const validation = validateSupplierCreatePayload({ ...body, name: body.name });
      if (!validation.valid) return sendFail(res, 'VALIDATION_ERROR: Supplier.name is required', 422);
      patch.name = validation.payload.name;
    }
    if (body.contactEmail !== undefined) patch.contactEmail = body.contactEmail;
    if (body.contactPhone !== undefined) patch.contactPhone = body.contactPhone;
    if (body.address !== undefined) patch.address = body.address;
    if (body.isActive !== undefined) patch.isActive = body.isActive;

    if (Object.keys(patch).length === 0) {
      return sendFail(res, 'VALIDATION_ERROR: no fields to update', 422);
    }

    await supplier.update(patch);
    await supplier.reload();

    return sendOk(res, { supplier });
  } catch (err) {
    console.error('[Catalog] PATCH supplier failed', err);
    return sendFail(res, 'ERROR_UPDATING_SUPPLIER', 400);
  }
});

router.post('/suppliers/:id/restore', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const supplier = await Supplier.findOne({ where: { id: req.params.id, empresaId } });
    if (!supplier) return sendFail(res, 'SUPPLIER_NOT_FOUND', 404);

    await supplier.update({ isActive: true });
    await supplier.reload();

    return sendOk(res, { supplier });
  } catch (err) {
    console.error('[Catalog] POST restore supplier failed', err);
    return sendFail(res, 'ERROR_UPDATING_SUPPLIER', 400);
  }
});

// DELETE /suppliers/:id — desactivación lógica (soft delete)
router.delete('/suppliers/:id', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const empresaId = getEffectiveEmpresaId(req);
    const supplier = await Supplier.findOne({ where: { id: req.params.id, empresaId } });
    if (!supplier) return sendFail(res, 'SUPPLIER_NOT_FOUND', 404);

    await supplier.update({ isActive: false });
    return sendOk(res, { deactivated: true, supplier });
  } catch {
    return sendFail(res, 'ERROR_DELETING_SUPPLIER', 400);
  }
});

export default router;
