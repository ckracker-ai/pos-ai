import { z } from 'zod';

const uuid = z.string().uuid();

export const loginBodySchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
  legalAcceptance: z
    .object({
      termsVersion: z.string().min(1).max(32),
      privacyVersion: z.string().min(1).max(32),
      accepted: z.literal(true),
    })
    .optional(),
});

export const registerBodySchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: z.string().email().max(254),
  password: z.string().trim().min(8).max(128),
  roleId: uuid,
  branchId: uuid,
  whatsappPhone: z.string().max(32).optional().nullable(),
});

export const passwordBodySchema = z.object({
  password: z.string().trim().min(8).max(128),
});

export const userUpdateBodySchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  email: z.string().email().max(254).optional(),
  roleId: uuid.optional(),
  branchId: uuid.optional(),
  isActive: z.boolean().optional(),
  whatsappPhone: z.string().max(32).optional().nullable(),
});

export const otpRequestBodySchema = z.object({
  email: z.string().email().max(254),
  purpose: z.enum(['registro', 'password_reset']),
});

export const passwordResetWithOtpBodySchema = z.object({
  email: z.string().email().max(254),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().trim().min(8).max(128),
});

export const otpConsumeBodySchema = z.object({
  email: z.string().email().max(254),
  code: z.string().regex(/^\d{6}$/),
  purpose: z.enum(['registro', 'password_reset']).default('registro'),
});

export const idParamSchema = z.object({
  id: uuid,
});
