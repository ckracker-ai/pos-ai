import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { sendFail } from './globalErrorHandler';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'invalid input';
      sendFail(res, `VALIDATION_ERROR: ${message}`, 422);
      return;
    }
    req[source] = parsed.data as never;
    next();
  };
}
