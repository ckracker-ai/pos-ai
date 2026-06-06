import { Router } from 'express';
import { sendOk, sendFail } from '../../../middleware/globalErrorHandler';
import {
  authenticateToken,
  requireSeller,
  AuthenticatedRequest,
} from '../../../middleware/auth.middleware';
import { getEffectiveEmpresaId } from '../../../utils/tenantScope';
import assistantDelegate from '../delegates/AssistantDelegate';

const router = Router();

router.use(authenticateToken);

router.post('/consolidate-duplicates', requireSeller, async (req: AuthenticatedRequest, res) => {
  const result = await assistantDelegate.cleanupPaymentProofsForBranch(
    getEffectiveEmpresaId(req),
    req.user!.branchId
  );
  if (result.success) return sendOk(res, result.value);
  return sendFail(res, result.error, 400);
});

router.get('/:id/image', requireSeller, async (req: AuthenticatedRequest, res) => {
  const result = await assistantDelegate.getPaymentProofImage(
    getEffectiveEmpresaId(req),
    req.params.id,
    req.user!.branchId
  );
  if (result.success) return sendOk(res, result.value);
  const code =
    result.error === 'PAYMENT_PROOF_NOT_FOUND' || result.error === 'PAYMENT_PROOF_BRANCH_MISMATCH'
      ? 404
      : result.error === 'PAYMENT_PROOF_IMAGE_NOT_FOUND'
        ? 404
        : 400;
  return sendFail(res, result.error, code);
});

router.get('/', requireSeller, async (req: AuthenticatedRequest, res) => {
  const status = req.query.status ? String(req.query.status) : 'pending';
  const result = await assistantDelegate.listPaymentProofsForBranch(
    getEffectiveEmpresaId(req),
    req.user!.branchId,
    status
  );
  if (result.success) return sendOk(res, { proofs: result.value });
  return sendFail(res, result.error, 400);
});

router.post('/:id/confirm', requireSeller, async (req: AuthenticatedRequest, res) => {
  const result = await assistantDelegate.confirmPaymentProof(
    getEffectiveEmpresaId(req),
    req.params.id,
    req.user!.branchId,
    req.user!.userId
  );
  if (result.success) return sendOk(res, result.value);
  const code =
    result.error === 'PAYMENT_PROOF_NOT_FOUND' || result.error === 'PAYMENT_PROOF_BRANCH_MISMATCH'
      ? 404
      : result.error === 'SALE_ALREADY_CLOSED'
        ? 409
        : 400;
  return sendFail(res, result.error, code);
});

router.post('/:id/reject', requireSeller, async (req: AuthenticatedRequest, res) => {
  const note =
    typeof (req.body as Record<string, unknown> | undefined)?.note === 'string'
      ? String((req.body as Record<string, unknown>).note).trim()
      : '';
  const result = await assistantDelegate.rejectPaymentProof(
    getEffectiveEmpresaId(req),
    req.params.id,
    req.user!.branchId,
    req.user!.userId,
    note || null
  );
  if (result.success) return sendOk(res, result.value);
  const code =
    result.error === 'PAYMENT_PROOF_NOT_FOUND' || result.error === 'PAYMENT_PROOF_BRANCH_MISMATCH'
      ? 404
      : result.error === 'SALE_ALREADY_CLOSED'
        ? 409
        : 400;
  return sendFail(res, result.error, code);
});

export default router;
