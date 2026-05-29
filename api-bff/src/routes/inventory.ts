import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireCoreRequestContext } from '../utils/coreRequestContext.js';
import { sendFail, sendOk } from '../utils/response.js';
import { ApiCoreServiceInventory } from '../services/apiCoreServiceInventory.js';
import {
  normalizeInventoryListPayload,
  normalizeInventorySinglePayload,
} from '../utils/inventoryResponse.js';

const adjustStockSchema = z.object({
  productId: z.string().min(1),
  delta: z.coerce.number().refine((n) => n !== 0, { message: 'delta must not be 0' }),
});

const addToBranchSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().min(0),
  minStock: z.coerce.number().min(0).optional(),
});

const stockUpsertSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number(),
  minStock: z.coerce.number().optional(),
});

const inventoryRoutes = async (app: FastifyInstance) => {
  const inventoryCore = new ApiCoreServiceInventory();

  app.get('/branch/:branchId', async (request, reply) => {
    const { branchId } = request.params as { branchId: string };
    const ctx = requireCoreRequestContext(reply, request, { requireBranchId: false });
    if (!ctx) return;

    try {
      const data = await inventoryCore.getInventoryByBranch(branchId, ctx.token, ctx.internalKey);
      const normalized = normalizeInventoryListPayload(data, branchId);
      return sendOk(reply, normalized);
    } catch (e: any) {
      const statusCode = e?.response?.data?.code ?? e?.response?.status ?? 500;
      const error = e?.response?.data?.error ?? 'Failed to fetch inventory';
      return sendFail(reply, error, statusCode);
    }
  });

  app.get('/branch/:branchId/product/:productId', async (request, reply) => {
    const { branchId, productId } = request.params as { branchId: string; productId: string };
    const ctx = requireCoreRequestContext(reply, request, { requireBranchId: false });
    if (!ctx) return;

    try {
      const data = await inventoryCore.getInventoryByBranchProduct(
        branchId,
        productId,
        ctx.token,
        ctx.internalKey
      );
      const normalized = normalizeInventorySinglePayload(data, branchId);
      return sendOk(reply, normalized);
    } catch (e: any) {
      const statusCode = e?.response?.data?.code ?? e?.response?.status ?? 500;
      const error = e?.response?.data?.error ?? 'Failed to fetch inventory product';
      return sendFail(reply, error, statusCode);
    }
  });

  app.patch('/stock', async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const body = stockUpsertSchema.parse(request.body);

    try {
      const data = await inventoryCore.upsertStock(
        {
          productId: body.productId,
          quantity: body.quantity,
          minStock: body.minStock ?? 0,
        },
        ctx.token,
        ctx.internalKey,
        ctx.branchId
      );
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.data?.code ?? e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to update stock';
      return sendFail(reply, error, statusCode);
    }
  });

  app.post('/branch/:branchId/stock', async (request, reply) => {
    const { branchId } = request.params as { branchId: string };
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    if (branchId !== ctx.branchId) {
      return sendFail(reply, 'Branch in URL must match active branch', 403);
    }

    const body = addToBranchSchema.parse(request.body);

    try {
      const data = await inventoryCore.addProductToBranch(
        branchId,
        {
          productId: body.productId,
          quantity: body.quantity,
          minStock: body.minStock ?? 0,
        },
        ctx.token,
        ctx.internalKey
      );
      return sendOk(reply, data, 201);
    } catch (e: any) {
      const statusCode = e?.response?.data?.code ?? e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to add product to branch';
      return sendFail(reply, error, statusCode);
    }
  });

  app.patch('/stock/adjust', async (request, reply) => {
    const ctx = requireCoreRequestContext(reply, request);
    if (!ctx) return;

    const body = adjustStockSchema.parse(request.body);

    try {
      const data = await inventoryCore.adjustStock(
        { productId: body.productId, delta: body.delta },
        ctx.token,
        ctx.internalKey,
        ctx.branchId
      );
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.data?.code ?? e?.response?.status ?? 400;
      const error = e?.response?.data?.error ?? 'Failed to adjust stock';
      return sendFail(reply, error, statusCode);
    }
  });

  app.get('/branch/:branchId/low-stock', async (request, reply) => {
    const { branchId } = request.params as { branchId: string };
    const ctx = requireCoreRequestContext(reply, request, { requireBranchId: false });
    if (!ctx) return;

    try {
      const data = await inventoryCore.getLowStock(branchId, ctx.token, ctx.internalKey);
      return sendOk(reply, data);
    } catch (e: any) {
      const statusCode = e?.response?.data?.code ?? e?.response?.status ?? 500;
      const error = e?.response?.data?.error ?? 'Failed to fetch low stock';
      return sendFail(reply, error, statusCode);
    }
  });
};

export default inventoryRoutes;
