import { z } from 'zod';
import { SUPPORT_SEVERITIES, SUPPORT_STATUSES } from '../supportStatus';

const uuid = z.string().uuid();

export const createCaseBodySchema = z.object({
  empresaId: uuid,
  subject: z.string().trim().min(3).max(200),
  body: z.string().trim().min(1).max(4000),
  origin: z.enum(['TENANT', 'PLATFORM', 'SIGNAL', 'COPILOT']).optional(),
  severity: z.enum(SUPPORT_SEVERITIES).optional(),
  createdByKind: z.enum(['USER', 'PLATFORM', 'SYSTEM']).optional(),
  createdById: uuid.optional().nullable(),
  authorKind: z.enum(['USER', 'PLATFORM', 'SYSTEM', 'COPILOT']).optional(),
});

export const createTenantCaseBodySchema = z.object({
  subject: z.string().trim().min(3).max(200),
  body: z.string().trim().min(1).max(4000),
  severity: z.enum(SUPPORT_SEVERITIES).optional(),
});

export const addMessageBodySchema = z.object({
  body: z.string().trim().min(1).max(4000),
  authorKind: z.enum(['USER', 'PLATFORM', 'SYSTEM', 'COPILOT']).optional(),
  authorId: uuid.optional().nullable(),
});

export const patchCaseBodySchema = z.object({
  status: z.enum(SUPPORT_STATUSES),
});

export const copilotBodySchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const listQuerySchema = z.object({
  empresaId: uuid.optional(),
  status: z.enum(SUPPORT_STATUSES).optional(),
  openOnly: z.enum(['1', 'true', '0', 'false']).optional(),
});

export const idParamSchema = z.object({
  id: uuid,
});

export const manualSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
});
