import { FastifyInstance } from 'fastify';
import { requireSeller } from '../middlewares/requireSeller.js';
import { requireCoreRequestContext } from '../utils/coreRequestContext.js';
import { sendFail, sendOk } from '../utils/response.js';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  parentId: z.string().uuid().nullable().optional(),
  slug: z.string().min(1).max(120).optional().nullable(),
  isActive: z.boolean().optional(),
});

const categoryCreateSchema = categorySchema.extend({
  name: z.string().min(1),
});

const supplierCreateSchema = z.object({
  name: z.string().min(1),
  contactEmail: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

const supplierUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  contactEmail: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const catalogProductCreateSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  categoryId: z.string().min(1),
  supplierId: z.string().min(1),
  price: z.coerce.number().positive(),
  description: z.string().optional(),
  unit: z.string().optional(),
  initialStock: z.coerce.number().min(0).optional(),
  minStock: z.coerce.number().min(0).optional(),
});

const catalogProductUpdateSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  categoryId: z.string().min(1),
  supplierId: z.string().min(1),
  price: z.coerce.number().positive(),
  description: z.string().optional().nullable(),
  unit: z.string().optional(),
  isActive: z.boolean().optional(),
});

const catalogRoutes = async (app: FastifyInstance) => {
  const categoryCore = new (await import('../services/apiCoreServiceCategory.js')).ApiCoreServiceCategory();
  const supplierCore = new (await import('../services/apiCoreServiceSupplier.js')).ApiCoreServiceSupplier();
  const productCore = new (await import('../services/apiCoreServiceProduct.js')).ApiCoreServiceProduct();

  app.get('/categories/tree', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const activeOnly = String((request.query as { activeOnly?: string }).activeOnly ?? '') === 'true';

    try {
      const data = await categoryCore.getCatalogCategoryTree(
        ctx.token,
        ctx.internalKey,
        ctx.branchId,
        activeOnly
      );
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 500;
      const error = e?.response?.data?.error ?? 'Failed to fetch category tree';
      return sendFail(reply, error, statusCode);
    }
  });

  app.get('/categories/leaves', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await categoryCore.getCatalogCategoryLeaves(
        ctx.token,
        ctx.internalKey,
        ctx.branchId
      );
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 500;
      const error = e?.response?.data?.error ?? 'Failed to fetch category leaves';
      return sendFail(reply, error, statusCode);
    }
  });

  app.get('/categories', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await categoryCore.listCatalogCategories(ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 500;
      const error = e?.response?.data?.error ?? 'Failed to fetch categories';

      console.error('[BFF][GET /categories] core error', {
        statusCode,
        error,
        coreResponse: e?.response?.data,
      });

      return sendFail(reply, error, statusCode);
    }
  });

  app.post('/categories', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const body = categoryCreateSchema.parse(request.body);

    try {
      const data = await categoryCore.createCatalogCategory(body, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data, 201);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to create category';
      return sendFail(reply, error, statusCode);
    }
  });

  app.patch('/categories/:id', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const { id } = request.params as { id: string };
    const body = categorySchema.parse(request.body);

    try {
      const data = await categoryCore.updateCatalogCategory(id, body, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to update category';
      return sendFail(reply, error, statusCode);
    }
  });

  app.post('/categories/:id/restore', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const { id } = request.params as { id: string };

    try {
      const data = await categoryCore.restoreCatalogCategory(
        id,
        ctx.token,
        ctx.internalKey,
        ctx.branchId
      );
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to restore category';
      return sendFail(reply, error, statusCode);
    }
  });

  app.delete('/categories/:id', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const { id } = request.params as { id: string };

    try {
      const data = await categoryCore.deleteCatalogCategory(id, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to delete category';
      return sendFail(reply, error, statusCode);
    }
  });

  app.get('/products', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await productCore.listCatalogProducts(ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 501;
      const error = e?.response?.data?.error ?? 'Failed to list users';
      return sendFail(reply, error, statusCode);
    }
  });

  app.get('/products/by-branch/:branchId', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;
    const { branchId } = request.params as { branchId: string };

    if (branchId !== ctx.branchId) {
      return sendFail(reply, 'Branch in URL must match active branch', 403);
    }

    try {
      const data = await productCore.listCatalogProductsByBranch(branchId, ctx.token, ctx.internalKey);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 501;
      const error = e?.response?.data?.error ?? 'Failed to list products by branch';
      return sendFail(reply, error, statusCode);
    }
  });

  app.post('/products', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const body = catalogProductCreateSchema.parse(request.body);

    try {
      const data = await productCore.createCatalogProduct(
        body,
        ctx.token,
        ctx.internalKey,
        ctx.branchId
      );
      return sendOk(reply, data, 201);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error =
        e?.response?.data?.error ??
        e?.issues?.[0]?.message ??
        e?.message ??
        'Failed to create catalog product';
      return sendFail(reply, error, statusCode);
    }
  });

  app.put('/products/:id', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const { id } = request.params as { id: string };
    const body = catalogProductUpdateSchema.parse(request.body);

    try {
      const data = await productCore.updateCatalogProduct(
        id,
        body,
        ctx.token,
        ctx.internalKey,
        ctx.branchId
      );
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to update catalog product';
      return sendFail(reply, error, statusCode);
    }
  });

  app.get('/suppliers', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await supplierCore.listSuppliers(ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 500;
      const error = e?.response?.data?.error ?? 'Failed to fetch suppliers';
      return sendFail(reply, error, statusCode);
    }
  });

  app.post('/suppliers', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const body = supplierCreateSchema.parse(request.body);

    try {
      const data = await supplierCore.createSupplier(body, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data, 201);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to create supplier';
      return sendFail(reply, error, statusCode);
    }
  });

  app.patch('/suppliers/:id', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const { id } = request.params as { id: string };
    const body = supplierUpdateSchema.parse(request.body);

    try {
      const data = await supplierCore.updateSupplier(id, body, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to update supplier';
      return sendFail(reply, error, statusCode);
    }
  });

  app.post('/suppliers/:id/restore', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const { id } = request.params as { id: string };

    try {
      const data = await supplierCore.restoreSupplier(id, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to restore supplier';
      return sendFail(reply, error, statusCode);
    }
  });

  app.delete('/suppliers/:id', { preHandler: [requireSeller] }, async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const { id } = request.params as { id: string };

    try {
      const data = await supplierCore.deleteSupplier(id, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to delete supplier';
      return sendFail(reply, error, statusCode);
    }
  });
};

export default catalogRoutes;
