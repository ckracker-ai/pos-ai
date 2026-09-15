import { FastifyReply, FastifyRequest } from 'fastify';
import config from '../config/index.js';
import { sendFail } from './response.js';
import { sessionOrBearerToken } from '../middlewares/sessionAuth.js';

export type CoreRequestContext = {
  token: string;
  internalKey?: string;
  branchId?: string;
};

export type RequireCoreContextOptions = {
  requireInternalKey?: boolean;
  requireBranchId?: boolean;
};

export function getCoreRequestContext(request: FastifyRequest): CoreRequestContext {
  const token = sessionOrBearerToken(request);
  const internalKey = config.internalApiKey;
  const branchId =
    request.branchContext?.branchId ??
    request.headers[config.branchHeader]?.toString() ??
    request.authSession?.branchId ??
    '';

  return {
    token,
    internalKey,
    branchId: branchId || undefined,
  };
}

export function requireCoreRequestContext(
  reply: FastifyReply,
  request: FastifyRequest,
  options: RequireCoreContextOptions = {}
): { token: string; internalKey: string; branchId: string } | null {
  const { requireInternalKey = true, requireBranchId = true } = options;
  const ctx = getCoreRequestContext(request);

  if (!ctx.token) {
    sendFail(reply, 'Missing session', 401);
    return null;
  }

  if (requireInternalKey && !ctx.internalKey) {
    sendFail(reply, 'Missing INTERNAL_API_KEY', 401);
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
