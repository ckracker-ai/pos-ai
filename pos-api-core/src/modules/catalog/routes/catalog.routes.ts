import { Router } from 'express';
import { sendOk, sendFail } from '../../../middleware/globalErrorHandler';
import { authenticateToken, requireSeller, AuthenticatedRequest } from '../../../middleware/auth.middleware';
import Category from '../models/Category.model';
import Product from '../models/Product.model';
import Supplier from '../models/Supplier.model';
import catalogProductDelegate from '../delegates/CatalogProductDelegate';
import categoryDelegate from '../delegates/CategoryDelegate';
import { getEffectiveBranchId } from '../../../utils/branchContext';
import { getEffectiveEmpresaId } from '../../../utils/tenantScope';

const router = Router();

// All catalog routes require authentication
router.use(authenticateToken);

// Categories — jerárquicas (principal / subcategoría)
router.get('/categories/tree', requireSeller, async (req: AuthenticatedRequest, res) => {
  const empresaId = getEffectiveEmpresaId(req);
  const activeOnly = String(req.query.activeOnly ?? '') === 'true';
  const result = await categoryDelegate.getTree(empresaId, activeOnly);
  if (!result.success) return sendFail(res, result.error, 400);
  return sendOk(res, { tree: result.value });
});

router.get('/categories/leaves', requireSeller, async (req: AuthenticatedRequest, res) => {
  const empresaId = getEffectiveEmpresaId(req);
  const activeOnly = String(req.query.activeOnly ?? 'true') !== 'false';
  const result = await categoryDelegate.getLeaves(empresaId, activeOnly);
  if (!result.success) return sendFail(res, result.error, 400);
  return sendOk(res, { categories: result.value });
});

router.get('/categories', requireSeller, async (req: AuthenticatedRequest, res) => {
  const empresaId = getEffectiveEmpresaId(req);
  const result = await categoryDelegate.listFlat(empresaId);
  if (!result.success) return sendFail(res, result.error, 500);
  return sendOk(res, { categories: result.value });
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

const parseCategoryBody = (body: unknown) => {
  const b = (body ?? {}) as {
    name?: string;
    description?: string | null;
    parentId?: string | null;
    slug?: string | null;
    isActive?: boolean;
  };
  return b;
};

const statusForCategoryError = (error: string): number => {
  if (error.startsWith('VALIDATION_ERROR')) return 422;
  if (error === 'CATEGORY_NOT_FOUND' || error === 'PARENT_CATEGORY_NOT_FOUND') return 404;
  if (
    error === 'CATEGORY_PARENT_CYCLE' ||
    error === 'CATEGORY_MAX_DEPTH_EXCEEDED' ||
    error === 'CATEGORY_NOT_LEAF' ||
    error === 'CATEGORY_NAME_TAKEN_SIBLING' ||
    error === 'CATEGORY_NAME_TAKEN_ROOT' ||
    error === 'SLUG_ALREADY_TAKEN'
  ) {
    return 409;
  }
  return 400;
};

router.post('/categoriesAction', requireSeller, async (req: AuthenticatedRequest, res) => {
  const empresaId = getEffectiveEmpresaId(req);
  const body = parseCategoryBody(req.body);
  if (!body.name?.trim()) return sendFail(res, 'VALIDATION_ERROR: Category.name is required', 422);
  const result = await categoryDelegate.create(empresaId, {
    name: body.name,
    description: body.description,
    parentId: body.parentId,
    slug: body.slug,
  });
  if (!result.success) return sendFail(res, result.error, statusForCategoryError(result.error));
  return sendOk(res, { category: result.value }, 201);
});

router.patch('/categories/:id', requireSeller, async (req: AuthenticatedRequest, res) => {
  const empresaId = getEffectiveEmpresaId(req);
  const body = parseCategoryBody(req.body);
  const result = await categoryDelegate.update(empresaId, req.params.id, body);
  if (!result.success) return sendFail(res, result.error, statusForCategoryError(result.error));
  return sendOk(res, { category: result.value });
});

router.post('/categories/:id/restore', requireSeller, async (req: AuthenticatedRequest, res) => {
  const empresaId = getEffectiveEmpresaId(req);
  const result = await categoryDelegate.restore(empresaId, req.params.id);
  if (!result.success) return sendFail(res, result.error, statusForCategoryError(result.error));
  return sendOk(res, { category: result.value });
});

router.delete('/categories/:id', requireSeller, async (req: AuthenticatedRequest, res) => {
  const empresaId = getEffectiveEmpresaId(req);
  const result = await categoryDelegate.deactivate(empresaId, req.params.id);
  if (!result.success) return sendFail(res, result.error, statusForCategoryError(result.error));
  return sendOk(res, { deactivated: true, category: result.value.category });
});

router.post('/categories', requireSeller, async (req: AuthenticatedRequest, res) => {
  const empresaId = getEffectiveEmpresaId(req);
  const body = parseCategoryBody(req.body);
  if (!body.name?.trim()) return sendFail(res, 'VALIDATION_ERROR: Category.name is required', 422);
  const result = await categoryDelegate.create(empresaId, {
    name: body.name,
    description: body.description,
    parentId: body.parentId,
    slug: body.slug,
  });
  if (!result.success) return sendFail(res, result.error, statusForCategoryError(result.error));
  return sendOk(res, { category: result.value }, 201);
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

const parseUpdateProductBody = (
  body: unknown
):
  | { valid: true; payload: import('../delegates/CatalogProductDelegate').UpdateProductInput }
  | { valid: false; error: string } => {
  const b = body as Record<string, unknown> | undefined;
  const payload: import('../delegates/CatalogProductDelegate').UpdateProductInput = {};

  if (b?.name !== undefined) {
    const name = typeof b.name === 'string' ? b.name.trim() : '';
    if (!name) return { valid: false, error: 'VALIDATION_ERROR: name is required' };
    payload.name = name;
  }

  if (b?.sku !== undefined) {
    const sku = typeof b.sku === 'string' ? b.sku.trim() : '';
    if (!sku) return { valid: false, error: 'VALIDATION_ERROR: sku is required' };
    payload.sku = sku;
  }

  if (b?.categoryId !== undefined) {
    const categoryId = typeof b.categoryId === 'string' ? b.categoryId.trim() : '';
    if (!categoryId) return { valid: false, error: 'VALIDATION_ERROR: categoryId is required' };
    payload.categoryId = categoryId;
  }

  if (b?.supplierId !== undefined) {
    const supplierId = typeof b.supplierId === 'string' ? b.supplierId.trim() : '';
    if (!supplierId) return { valid: false, error: 'VALIDATION_ERROR: supplierId is required' };
    payload.supplierId = supplierId;
  }

  if (b?.price !== undefined) {
    const price = Number(b.price);
    if (!Number.isFinite(price) || price <= 0) {
      return { valid: false, error: 'VALIDATION_ERROR: price must be a positive number' };
    }
    payload.price = price;
  }

  if (b?.description !== undefined) {
    payload.description = typeof b.description === 'string' ? b.description : null;
  }

  if (b?.unit !== undefined) {
    payload.unit = typeof b.unit === 'string' ? b.unit : undefined;
  }

  if (b?.isActive !== undefined) {
    payload.isActive = b.isActive !== false;
  }

  if (Object.keys(payload).length === 0) {
    return { valid: false, error: 'VALIDATION_ERROR: no fields to update' };
  }

  return { valid: true, payload };
};

const statusForProductError = (error: string): number => {
  if (error.startsWith('VALIDATION_ERROR')) return 422;
  if (error === 'PRODUCT_NOT_FOUND' || error === 'CATEGORY_NOT_FOUND' || error === 'SUPPLIER_NOT_FOUND') {
    return 404;
  }
  if (error === 'CATEGORY_NOT_LEAF' || error === 'CATEGORY_INACTIVE') return 409;
  return 400;
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
  const validation = parseUpdateProductBody(req.body);
  if (!validation.valid) return sendFail(res, validation.error, 422);

  try {
    const empresaId = getEffectiveEmpresaId(req);
    const result = await catalogProductDelegate.update(
      empresaId,
      req.params.id,
      validation.payload
    );
    if (!result.success) {
      return sendFail(res, result.error, statusForProductError(result.error));
    }
    return sendOk(res, { product: result.value });
  } catch {
    return sendFail(res, 'ERROR_UPDATING_PRODUCT', 400);
  }
});

router.patch('/product/:id', requireSeller, async (req: AuthenticatedRequest, res) => {
  const validation = parseUpdateProductBody(req.body);
  if (!validation.valid) return sendFail(res, validation.error, 422);

  try {
    const empresaId = getEffectiveEmpresaId(req);
    const result = await catalogProductDelegate.update(
      empresaId,
      req.params.id,
      validation.payload
    );
    if (!result.success) {
      return sendFail(res, result.error, statusForProductError(result.error));
    }
    return sendOk(res, { product: result.value });
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
