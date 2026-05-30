import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

import User from '../modules/auth/models/User.model';
import Role from '../modules/auth/models/Role.model';
import Empresa from '../modules/tenant/models/Empresa.model';
import { readModelString } from '../utils/modelAttributes';
import { branchBelongsToEmpresa } from '../utils/tenantScope';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    roleId: string;
    roleName: string;
    empresaId: string;
    branchId: string;
  };
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const branchIdHeader = req.headers['x-branch-id'];

  if (!token) {
    res.status(401).json({ success: false, data: null, error: 'ACCESS_TOKEN_REQUIRED', code: 401 });
    return;
  }

  if (branchIdHeader && typeof branchIdHeader !== 'string') {
    res.status(400).json({ success: false, data: null, error: 'BRANCH_ID_INVALID', code: 400 });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET ?? 'default_secret', async (err, decoded) => {
    if (err) {
      res.status(403).json({ success: false, data: null, error: 'INVALID_TOKEN', code: 403 });
      return;
    }

    const decodedPayload = decoded as {
      userId: string;
      roleId: string;
      roleName: string;
      empresaId?: string;
      branchId?: string;
    };

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

    const empresaIdFromUser =
      readModelString(user, 'empresaId') || String(decodedPayload.empresaId ?? '').trim();
    const branchIdFromUser =
      readModelString(user, 'branchId') || String(decodedPayload.branchId ?? '').trim();

    if (!empresaIdFromUser) {
      res.status(403).json({ success: false, data: null, error: 'TENANT_CONTEXT_REQUIRED', code: 403 });
      return;
    }

    const empresa = await Empresa.findByPk(empresaIdFromUser, { attributes: ['id', 'estado'] });
    if (!empresa || readModelString(empresa, 'estado') === 'SUSPENDIDO') {
      res.status(403).json({ success: false, data: null, error: 'EMPRESA_SUSPENDED', code: 403 });
      return;
    }

    const canSwitchBranch = ['ADMIN', 'AUDITOR'].includes(roleNameUpper);
    const headerBranch =
      typeof branchIdHeader === 'string' && branchIdHeader.trim() ? branchIdHeader.trim() : '';

    const effectiveBranchId =
      canSwitchBranch && headerBranch ? headerBranch : branchIdFromUser;

    if (effectiveBranchId) {
      const branchOk = await branchBelongsToEmpresa(effectiveBranchId, empresaIdFromUser);
      if (!branchOk) {
        res.status(403).json({ success: false, data: null, error: 'BRANCH_TENANT_MISMATCH', code: 403 });
        return;
      }
    }

    req.user = {
      userId: decodedPayload.userId,
      roleId: decodedPayload.roleId,
      roleName: roleNameFromDb || decodedPayload.roleName,
      empresaId: empresaIdFromUser,
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
export const requireComanda = requireRole(['ADMIN', 'AUDITOR', 'SELLER', 'COMANDA']);
