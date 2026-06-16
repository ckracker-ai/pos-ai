import { Request, Response, NextFunction } from 'express';

import * as jwt from 'jsonwebtoken';



import User from '../modules/auth/models/User.model';

import Role from '../modules/auth/models/Role.model';

import { readModelString } from '../utils/modelAttributes';

import { branchBelongsToEmpresa } from '../utils/tenantScope';

import { assertEmpresaAllowsOperation, getEmpresaEstado } from '../utils/empresaAccess';

import {

  getCachedAuthUser,

  setCachedAuthUser,

  type CachedAuthUser,

} from '../lib/authUserCache';



export interface AuthenticatedRequest extends Request {

  user?: {

    userId: string;

    roleId: string;

    roleName: string;

    empresaId: string;

    branchId: string;

  };

}



async function resolveAuthUser(

  userId: string,

  decodedPayload: {

    roleId: string;

    roleName: string;

    empresaId?: string;

    branchId?: string;

  }

): Promise<CachedAuthUser | null> {

  const cached = await getCachedAuthUser(userId);

  if (cached?.isActive) return cached;



  const user = await User.findByPk(userId, {

    include: [{ model: Role, as: 'role', attributes: ['name'] }],

  });



  if (!user) return null;



  const userPlain =

    typeof user.toJSON === 'function'

      ? (user.toJSON() as { role?: { name?: string }; isActive?: unknown })

      : (user as unknown as { role?: { name?: string }; isActive?: unknown });

  const rawActive = userPlain.isActive;
  const isActive =
    rawActive === true || rawActive === 'true' || rawActive === 1 || String(rawActive) === '1';



  const roleNameFromDb = String(userPlain.role?.name ?? decodedPayload.roleName ?? '').trim();

  const empresaIdFromUser =

    readModelString(user, 'empresaId') || String(decodedPayload.empresaId ?? '').trim();

  const branchIdFromUser =

    readModelString(user, 'branchId') || String(decodedPayload.branchId ?? '').trim();



  const row: CachedAuthUser = {

    userId,

    roleId: String(decodedPayload.roleId),

    roleName: roleNameFromDb || decodedPayload.roleName,

    empresaId: empresaIdFromUser,

    branchId: branchIdFromUser,

    isActive,

  };



  if (isActive) {

    await setCachedAuthUser(row);

  }



  return row;

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

      supportSession?: boolean;

    };



    const authUser = await resolveAuthUser(decodedPayload.userId, decodedPayload);

    if (!authUser) {

      res.status(404).json({ success: false, data: null, error: 'USER_NOT_FOUND', code: 404 });

      return;

    }



    if (!authUser.isActive) {

      res.status(403).json({ success: false, data: null, error: 'ACCOUNT_DISABLED', code: 403 });

      return;

    }



    const roleNameUpper = String(authUser.roleName ?? '').toUpperCase();

    const empresaIdFromUser = authUser.empresaId;

    const branchIdFromUser = authUser.branchId;



    if (!empresaIdFromUser) {

      res.status(403).json({ success: false, data: null, error: 'TENANT_CONTEXT_REQUIRED', code: 403 });

      return;

    }



    if (!decodedPayload.supportSession) {

      const tenantOk = await assertEmpresaAllowsOperation(empresaIdFromUser);

      if (!tenantOk.success) {

        const code = tenantOk.error === 'EMPRESA_NOT_FOUND' ? 404 : 403;

        res.status(code).json({ success: false, data: null, error: tenantOk.error, code });

        return;

      }

    } else {

      const estado = await getEmpresaEstado(empresaIdFromUser);

      if (!estado) {

        res.status(404).json({ success: false, data: null, error: 'EMPRESA_NOT_FOUND', code: 404 });

        return;

      }

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

      roleId: authUser.roleId,

      roleName: authUser.roleName,

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


