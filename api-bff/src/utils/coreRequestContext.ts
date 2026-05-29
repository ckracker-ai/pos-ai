import { FastifyReply, FastifyRequest } from 'fastify';
import config from '../config/index.js';
import { sendFail } from './response.js';

export type CoreRequestContext = {
  token: string;
  internalKey?: string;
  branchId?: string;
};

export type RequireCoreContextOptions = {
  requireInternalKey?: boolean;
  requireBranchId?: boolean;
};

/** Extrae token, x-internal-key y branchId del request (middleware + header). */
export function getCoreRequestContext(request: FastifyRequest): CoreRequestContext {
  const token = (request.headers.authorization ?? '').toString().replace(/^Bearer\s+/i, '');
  const internalKey = request.headers['x-internal-key']?.toString();
  const branchId =
    request.branchContext?.branchId ??
    request.headers[config.branchHeader]?.toString() ??
    '';

  return {
    token,
    internalKey,
    branchId: branchId || undefined,
  };
}

/**
 * Valida el contexto requerido por api-core y responde con sendFail si falta algo.
 * Devuelve null si ya se envió la respuesta de error.
 */
export function requireCoreRequestContext(
  reply: FastifyReply,
  request: FastifyRequest,
  options: RequireCoreContextOptions = {}
): { token: string; internalKey: string; branchId: string } | null {
  const { requireInternalKey = true, requireBranchId = true } = options;
  const ctx = getCoreRequestContext(request);

  if (requireInternalKey && !ctx.internalKey) {
    sendFail(reply, 'Missing x-internal-key header', 401);
    return null;
  }

  if (requireBranchId && !ctx.branchId) {
    sendFail(reply, 'Missing x-branch-id header', 400);
    return null;
  }

  return {
    token: ctx.token,
    internalKey: ctx.internalKey ?? '',
    branchId: ctx.branchId ?? '',
  };
}
