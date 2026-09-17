import { Request, Response } from 'express';
import authDelegate from '../delegates/AuthDelegate';
import { sendOk, sendFail } from '../../../middleware/globalErrorHandler';
import { AuthenticatedRequest } from '../../../middleware/auth.middleware';
import { getEffectiveEmpresaId } from '../../../utils/tenantScope';
import type { LoginInput, RegisterInput } from '../delegates/AuthDelegate';

class AuthController {
  register = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    if (!req.user) {
      return sendFail(res, 'UNAUTHENTICATED', 401);
    }
    const empresaId = getEffectiveEmpresaId(req);
    const body = req.body as RegisterInput;
    const result = await authDelegate.register({ ...body, empresaId });
    if (result.success) return sendOk(res, result.value, 201);
    return sendFail(res, result.error, 400);
  };

  login = async (req: Request, res: Response): Promise<Response | void> => {
    const body = req.body as LoginInput;
    const result = await authDelegate.login({
      email: body.email,
      password: body.password,
      legalAcceptance: body.legalAcceptance,
      ipAddress: req.ip,
      userAgent: String(req.headers['user-agent'] ?? '').slice(0, 512),
    });
    if (result.success) return sendOk(res, result.value);
    const err = result.error;
    if (!result.success && result.error === 'LEGAL_REAUTH_REQUIRED' && 'value' in result) {
      return res.status(403).json({
        success: false,
        data: result.value,
        error: result.error,
        code: 403,
      });
    }
    if (err === 'LEGAL_VERSION_MISMATCH') {
      return sendFail(res, err, 409);
    }
    if (err === 'EMPRESA_SUSPENDED' || err === 'EMPRESA_PENDING_ONBOARDING') {
      return sendFail(res, err, 403);
    }
    if (err === 'TENANT_CONTEXT_REQUIRED') {
      return sendFail(res, err, 403);
    }
    return sendFail(res, err, 401);
  };

  requestEmailOtp = async (req: Request, res: Response): Promise<Response | void> => {
    const body = req.body as { email: string; purpose: 'registro' | 'password_reset' };
    const result = await authDelegate.requestEmailOtp(body.purpose, body.email);
    if (!result.success) {
      const status = result.error === 'OTP_COOLDOWN' ? 429 : result.error === 'OTP_STORE_UNAVAILABLE' ? 503 : 400;
      return sendFail(res, result.error, status);
    }
    return sendOk(res, result.value);
  };

  verifyRegistroOtp = async (req: Request, res: Response): Promise<Response | void> => {
    const body = req.body as { email: string; code: string };
    const result = await authDelegate.verifyRegistroOtp(body.email, body.code);
    if (!result.success) {
      const status = result.error === 'OTP_STORE_UNAVAILABLE' ? 503 : 400;
      return sendFail(res, result.error, status);
    }
    return sendOk(res, result.value);
  };

  consumeRegistroOtp = async (req: Request, res: Response): Promise<Response | void> => {
    const body = req.body as { email: string; code: string };
    const result = await authDelegate.consumeRegistroOtp(body.email, body.code);
    if (!result.success) {
      const status = result.error === 'OTP_STORE_UNAVAILABLE' ? 503 : 400;
      return sendFail(res, result.error, status);
    }
    return sendOk(res, result.value);
  };

  resetPasswordWithOtp = async (req: Request, res: Response): Promise<Response | void> => {
    const body = req.body as { email: string; code: string; password: string };
    const result = await authDelegate.resetPasswordWithOtp(body.email, body.code, body.password);
    if (!result.success) {
      const status = result.error === 'OTP_STORE_UNAVAILABLE' ? 503 : 400;
      return sendFail(res, result.error, status);
    }
    return sendOk(res, result.value);
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
