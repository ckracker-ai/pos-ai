import { Router } from 'express';
import { sendOk, sendFail } from '../../../middleware/globalErrorHandler';
import { authenticateToken, requireSeller, AuthenticatedRequest } from '../../../middleware/auth.middleware';
import { getEffectiveEmpresaId } from '../../../utils/tenantScope';
import tradeCustomerDelegate from '../delegates/TradeCustomerDelegate';

const router = Router();
router.use(authenticateToken);

function canManageCredit(req: AuthenticatedRequest): boolean {
  const role = String(req.user?.roleName ?? '').toUpperCase();
  return role === 'ADMIN' || role === 'AUDITOR';
}

router.get('/customers', requireSeller, async (req: AuthenticatedRequest, res) => {
  const result = await tradeCustomerDelegate.list(getEffectiveEmpresaId(req));
  if (!result.success) return sendFail(res, result.error, 400);
  return sendOk(res, { customers: result.value });
});

router.post('/customers', requireSeller, async (req: AuthenticatedRequest, res) => {
  const body = (req.body ?? {}) as {
    name?: string;
    rut?: string | null;
    creditLimit?: number;
    isOverdue?: boolean;
    notes?: string | null;
  };
  const credit = canManageCredit(req);
  const result = await tradeCustomerDelegate.create(getEffectiveEmpresaId(req), {
    name: String(body.name ?? ''),
    rut: body.rut,
    creditLimit: credit ? Number(body.creditLimit ?? 0) : 0,
    isOverdue: credit ? Boolean(body.isOverdue) : false,
    notes: body.notes,
  });
  if (!result.success) return sendFail(res, result.error, result.error.startsWith('VALIDATION') ? 422 : 400);
  return sendOk(res, { customer: result.value }, 201);
});

router.put('/customers/:id', requireSeller, async (req: AuthenticatedRequest, res) => {
  const body = (req.body ?? {}) as {
    name?: string;
    rut?: string | null;
    creditLimit?: number;
    isOverdue?: boolean;
    isActive?: boolean;
    notes?: string | null;
  };
  const result = await tradeCustomerDelegate.update(getEffectiveEmpresaId(req), req.params.id, {
    name: body.name ?? '',
    rut: body.rut,
    creditLimit: body.creditLimit,
    isOverdue: body.isOverdue,
    isActive: body.isActive,
    notes: body.notes,
    canManageCredit: canManageCredit(req),
  });
  if (!result.success) {
    const status = result.error === 'CUSTOMER_NOT_FOUND' ? 404 : result.error.startsWith('VALIDATION') ? 422 : 400;
    return sendFail(res, result.error, status);
  }
  return sendOk(res, { customer: result.value });
});

export default router;
