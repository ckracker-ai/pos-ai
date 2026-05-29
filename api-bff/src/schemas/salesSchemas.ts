import { z } from 'zod';

export const validateStockSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const createSaleSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  customerId: z.string().min(1),
  paymentMethod: z.enum(['cash', 'card', 'transfer']),
});
