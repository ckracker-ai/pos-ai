import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { ProductsService } from '../services/productsService.js';
import { ApiCoreServiceProduct } from '../services/apiCoreServiceProduct.js';
import { requireCoreRequestContext } from '../utils/coreRequestContext.js';
import { sendFail, sendOk } from '../utils/response.js';

const registerShrinkageSchema = z.object({
  reason: z.string().min(1),
  details: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

const productsRoutes = async (app: FastifyInstance) => {
  const productsService = new ProductsService();
  const productCore = new ApiCoreServiceProduct();

  app.get('/health', async () => ({ status: 'products route ok' }));

  app.get('/inventory', async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const result = await productsService.getInventoryByBranch(ctx.branchId, ctx.token, ctx.internalKey);

    if (!result.ok) {
      return reply.status(result.statusCode).send({ error: result.error });
    }

    return reply.send({ items: result.data });
  });

  app.get('/shrinkage', async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const result = await productsService.listShrinkage(ctx.token, ctx.internalKey, ctx.branchId);

    if (!result.ok) {
      return reply.status(result.statusCode).send({ error: result.error });
    }

    return reply.send({ shrinkages: result.data });
  });

  app.get('/shrinkage/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const result = await productsService.getShrinkageById(id, ctx.token, ctx.internalKey, ctx.branchId);

    if (!result.ok) {
      return reply.status(result.statusCode).send({ error: result.error });
    }

    return reply.send({ shrinkage: result.data });
  });

  app.post('/shrinkage', async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const body = registerShrinkageSchema.parse(request.body);

    const result = await productsService.registerShrinkage(
      ctx.branchId,
      body.reason,
      body.details,
      ctx.token,
      ctx.internalKey
    );

    if (!result.ok) {
      return reply.status(result.statusCode).send({ error: result.error });
    }

    return reply.send({ shrinkage: result.data });
  });

  app.get('/catalog/products/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await productCore.getProduct(id, ctx.token, ctx.internalKey, ctx.branchId);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 501;
      const error = e?.response?.data?.error ?? 'Failed to list users';
      return sendFail(reply, error, statusCode);
    }
  });

  app.get('/catalog/products', async (request, reply) => {
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

  app.post('/catalog/products', async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const bodySchema = z.object({
      name: z.string().min(1),
      sku: z.string().min(1),
      categoryId: z.string().min(1),
      supplierId: z.string().min(1),
      price: z.number().positive(),
    });

    const body = bodySchema.parse(request.body);
    const result = await productsService.createCatalogProduct(
      body,
      ctx.token,
      ctx.internalKey,
      ctx.branchId
    );

    if (!result.ok) {
      return reply.status(result.statusCode).send({ error: result.error });
    }

    return reply.send({ product: result.data });
  });

  app.put('/catalog/products/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const bodySchema = z.object({
      name: z.string().min(1),
      sku: z.string().min(1),
      categoryId: z.string().min(1),
      supplierId: z.string().min(1),
      price: z.coerce.number().positive(),
      description: z.string().optional().nullable(),
      unit: z.string().optional(),
      isActive: z.boolean().optional(),
    });

    const body = bodySchema.parse(request.body);
    const result = await productsService.updateCatalogProduct(
      id,
      body,
      ctx.token,
      ctx.internalKey,
      ctx.branchId
    );

    if (!result.ok) {
      return reply.status(result.statusCode).send({ error: result.error });
    }

    return reply.send({ product: result.data });
  });

  // DELETE /catalog/products/:id
  // Endpoint requerido para que el frontend pueda eliminar productos desde el mantenedor.
  app.delete('/catalog/products/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    try {
      const data = await productCore.deleteCatalogProduct(
        id,
        ctx.token,
        ctx.internalKey,
        ctx.branchId
      );
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to delete catalog product';
      return sendFail(reply, error, statusCode);
    }
  });
};

export default productsRoutes;
