import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import {
  ValidationError,
  UniqueConstraintError,
  ForeignKeyConstraintError,
  ConnectionError,
  DatabaseError,
} from 'sequelize';

export interface UnifiedResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
  code: number;
}

export const sendOk = <T>(res: Response, data: T, status: number = 200): Response =>
  res.status(status).json(<UnifiedResponse<T>>{
    success: true,
    data,
    error: null,
    code: status,
  });

export const sendFail = (res: Response, error: string, status: number = 400): Response =>
  res.status(status).json(<UnifiedResponse>{
    success: false,
    data: null,
    error,
    code: status,
  });

export const globalErrorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  console.error('[GlobalErrorHandler]', {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  if (err instanceof UniqueConstraintError) {
    const fields = err.errors.map((e) => e.path).join(', ');
    res.status(409).json(<UnifiedResponse>{
      success: false,
      data: null,
      error: `DUPLICATE_ENTRY: ${fields} already exists`,
      code: 409,
    });
    return;
  }

  if (err instanceof ValidationError) {
    res.status(422).json(<UnifiedResponse>{
      success: false,
      data: null,
      error: `VALIDATION_ERROR: ${err.errors.map((e) => e.message).join('; ')}`,
      code: 422,
    });
    return;
  }

  if (err instanceof ForeignKeyConstraintError) {
    res.status(400).json(<UnifiedResponse>{
      success: false,
      data: null,
      error:
        'No se pudo completar la operación. Verifique que los datos relacionados existan y estén vigentes.',
      code: 400,
    });
    return;
  }

  if (err instanceof ConnectionError) {
    res.status(503).json(<UnifiedResponse>{
      success: false,
      data: null,
      error: 'DB_UNAVAILABLE: cannot reach the database',
      code: 503,
    });
    return;
  }

  if (err instanceof DatabaseError) {
    res.status(500).json(<UnifiedResponse>{
      success: false,
      data: null,
      error: 'DB_ERROR: an unexpected database error occurred',
      code: 500,
    });
    return;
  }

  res.status(500).json(<UnifiedResponse>{
    success: false,
    data: null,
    error: `INTERNAL_ERROR: ${err.message ?? 'unknown error'}`,
    code: 500,
  });
};
