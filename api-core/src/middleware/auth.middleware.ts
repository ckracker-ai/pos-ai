import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

import User from '../modules/auth/models/User.model';
import Role from '../modules/auth/models/Role.model';
import { readModelString } from '../utils/modelAttributes';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    roleId: string;
    roleName: string;
    branchId: string;
  };
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  const branchIdHeader = req.headers['x-branch-id'];


  if (!token) {
    res.status(401).json({ success: false, data: null, error: 'ACCESS_TOKEN_REQUIRED', code: 401 });
    return;
  }

  // branchId en header opcional; solo se valida si llega y si el endpoint requiere scoping.
  // Nota: el requisito de comparar header vs user.branchId se aplica en rutas con contexto.
  if (branchIdHeader && typeof branchIdHeader !== 'string') {
    res.status(400).json({ success: false, data: null, error: 'BRANCH_ID_INVALID', code: 400 });
    return;
  }


  jwt.verify(token, process.env.JWT_SECRET ?? 'default_secret', async (err, decoded) => {
    // decoded comes from JWT; we validate against DB + header branchId
    if (err) {
      res.status(403).json({ success: false, data: null, error: 'INVALID_TOKEN', code: 403 });
      return;
    }

    const decodedPayload = decoded as { userId: string; roleId: string; roleName: string; branchId?: string };
    const user = await User.findByPk(decodedPayload.userId, {
      include: [{ model: Role, as: 'role', attributes: ['name'] }],
    });

    if (!user) {
      res.status(404).json({ success: false, data: null, error: 'USER_NOT_FOUND', code: 404 });
      return;
    }

    const userPlain =
      typeof user.toJSON === 'function'
        ? (user.toJSON() as { role?: { name?: string } })
        : (user as unknown as { role?: { name?: string } });

    const roleNameFromDb = String(userPlain.role?.name ?? decodedPayload.roleName ?? '').trim();
    const roleNameUpper = roleNameFromDb.toUpperCase();

    const branchIdFromUser =
      readModelString(user, 'branchId') || String(decodedPayload.branchId ?? '').trim();
    const canSwitchBranch = ['ADMIN', 'AUDITOR'].includes(roleNameUpper);
    const headerBranch =
      typeof branchIdHeader === 'string' && branchIdHeader.trim() ? branchIdHeader.trim() : '';

    const effectiveBranchId =
      canSwitchBranch && headerBranch ? headerBranch : branchIdFromUser;

    req.user = {
      userId: decodedPayload.userId,
      roleId: decodedPayload.roleId,
      roleName: roleNameFromDb || decodedPayload.roleName,
      branchId: effectiveBranchId,
    };

    next();
  });
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, data: null, error: 'UNAUTHENTICATED', code: 401 });
      return;
    }

    const userRole = String(req.user.roleName ?? '').toUpperCase();
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({ success: false, data: null, error: 'INSUFFICIENT_PERMISSIONS', code: 403 });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole(['ADMIN']);
export const requireAuditor = requireRole(['ADMIN', 'AUDITOR']);
export const requireSeller = requireRole(['ADMIN', 'AUDITOR', 'SELLER']);
/** Lectura de comandas/ventas (rol COMANDA y roles con más privilegios). */
export const requireComanda = requireRole(['ADMIN', 'AUDITOR', 'SELLER', 'COMANDA']);
