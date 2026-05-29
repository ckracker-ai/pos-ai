import { AuthenticatedRequest } from '../middleware/auth.middleware';

/** Sucursal efectiva del request (JWT + x-branch-id para roles con cambio de sucursal). */
export function getEffectiveBranchId(req: AuthenticatedRequest): string {
  return req.user!.branchId;
}

/**
 * Valida que la sucursal de la ruta coincida con la activa.
 * Retorna null si el acceso debe denegarse.
 */
export function resolveBranchId(
  req: AuthenticatedRequest,
  routeBranchId?: string
): string | null {
  const effective = getEffectiveBranchId(req);
  if (!routeBranchId || routeBranchId === effective) {
    return effective;
  }
  return null;
}
