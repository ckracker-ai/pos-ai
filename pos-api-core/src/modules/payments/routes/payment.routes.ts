import { Router } from 'express';
import { sendOk, sendFail } from '../../../middleware/globalErrorHandler';
import paymentWebhookDelegate from '../delegates/PaymentWebhookDelegate';
import paymentCheckoutDelegate from '../delegates/PaymentCheckoutDelegate';
import paymentSessionDelegate from '../delegates/PaymentSessionDelegate';

const router = Router();

router.post('/checkout/sessions', async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const empresaId = String(body.empresaId ?? body.empresa_id ?? '').trim();
  if (!empresaId) return sendFail(res, 'VALIDATION_ERROR: empresaId required', 422);

  const result = await paymentCheckoutDelegate.createSession({
    empresaId,
    kind: (body.kind as 'SAAS_SUB' | undefined) ?? 'SAAS_SUB',
    provider: body.provider != null ? String(body.provider) : undefined,
    returnBaseUrl: body.returnBaseUrl != null ? String(body.returnBaseUrl) : undefined,
  });
  if (!result.success) {
    const code = result.error.startsWith('VALIDATION') ? 422 : 400;
    return sendFail(res, result.error, code);
  }
  return sendOk(res, result.value);
});

router.post('/checkout/webpay-commit', async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const tokenWs = String(body.token_ws ?? body.tokenWs ?? '').trim();
  if (!tokenWs) return sendFail(res, 'VALIDATION_ERROR: token_ws required', 422);
  const result = await paymentCheckoutDelegate.completeWebpayTransaction(tokenWs);
  if (!result.success) return sendFail(res, result.error, 400);
  return sendOk(res, result.value);
});

router.post('/checkout/sandbox-complete', async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const token = String(body.token ?? '').trim();
  if (!token) return sendFail(res, 'VALIDATION_ERROR: token required', 422);
  const result = await paymentCheckoutDelegate.completeSandboxSession(token);
  if (!result.success) return sendFail(res, result.error, 400);
  return sendOk(res, result.value);
});

router.post('/jobs/expire-sessions', async (_req, res) => {
  const result = await paymentSessionDelegate.expirePendingSessions();
  if (!result.success) return sendFail(res, result.error, 400);
  return sendOk(res, { job: 'expire-payment-sessions', ...result.value });
});

router.post('/webhooks/inbound', async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const result = await paymentWebhookDelegate.handleInbound(body);
  if (!result.success) {
    const code =
      result.error.startsWith('VALIDATION_ERROR') ? 422 : result.error === 'UNAUTHORIZED' ? 401 : 400;
    return sendFail(res, result.error, code);
  }
  return sendOk(res, result.value);
});

export default router;
