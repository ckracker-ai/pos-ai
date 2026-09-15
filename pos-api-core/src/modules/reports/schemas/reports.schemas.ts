import { z } from 'zod';

const optionalInt = (min: number, max: number) =>
  z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    const n = Number(val);
    return Number.isFinite(n) ? n : val;
  }, z.number().int().min(min).max(max).optional());

export const reportsQuerySchema = z.object({
  global: z.string().max(8).optional(),
  scope: z.string().max(16).optional(),
  days: optionalInt(7, 90),
  limit: optionalInt(1, 500),
  status: z.string().max(32).optional(),
  hour: optionalInt(0, 23),
});
