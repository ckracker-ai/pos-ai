import { Request, Response } from 'express';
import authDelegate from '../delegates/AuthDelegate';
import { sendOk, sendFail } from '../../../middleware/globalErrorHandler';
import { AuthenticatedRequest } from '../../../middleware/auth.middleware';
import { getEffectiveEmpresaId } from '../../../utils/tenantScope';

class AuthController {
  register = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    const empresaId = req.user ? getEffectiveEmpresaId(req) : req.body?.empresaId;
    const result = await authDelegate.register({ ...req.body, empresaId });
    if (result.success) return sendOk(res, result.value, 201);
    return sendFail(res, result.error, 400);
  };

  login = async (req: Request, res: Response): Promise<Response | void> => {
    const result = await authDelegate.login(req.body);
    if (result.success) return sendOk(res, result.value);
    const err = result.error;
    if (err === 'EMPRESA_SUSPENDED' || err === 'EMPRESA_PENDING_ONBOARDING') {
      return sendFail(res, err, 403);
    }
    if (err === 'TENANT_CONTEXT_REQUIRED') {
      return sendFail(res, err, 403);
    }
    return sendFail(res, err, 401);
  };

  findById = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    const result = await authDelegate.findById(req.params.id, getEffectiveEmpresaId(req));
    if (result.success) return sendOk(res, result.value);
    return sendFail(res, result.error, 404);
  };

  deactivate = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    const result = await authDelegate.deactivate(
      req.params.id,
      req.user!.userId,
      getEffectiveEmpresaId(req)
    );
    if (result.success) return sendOk(res, result.value);
    const status = result.error.startsWith('CANNOT_') ? 409 : 404;
    return sendFail(res, result.error, status);
  };

  restore = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    const result = await authDelegate.restore(req.params.id, getEffectiveEmpresaId(req));
    if (result.success) return sendOk(res, { user: result.value });
    return sendFail(res, result.error, 404);
  };
}

export default new AuthController();
