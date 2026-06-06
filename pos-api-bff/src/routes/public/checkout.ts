import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import config from '../../config/index.js';
import { ApiCoreServicePlatformEmpresa } from '../../services/apiCoreServicePlatformEmpresa.js';
import { ApiCoreServicePayment } from '../../services/apiCoreServicePayment.js';
import { extractCoreError } from '../../utils/extractCoreError.js';
import { sendFail, sendOk } from '../../utils/response.js';

const confirmSchema = z.object({
  empresaId: z.string().uuid(),
  provider: z.string().min(1).max(40).default('SANDBOX'),
  reference: z.string().min(1).max(120).optional(),
});

const createSessionSchema = z.object({
  empresaId: z.string().uuid(),
  provider: z.string().min(1).max(40).optional(),
});

const sandboxCompleteSchema = z.object({
  token: z.string().min(10),
});

const webpayCommitSchema = z.object({
  token_ws: z.string().min(10),
});

const webhookSchema = z.object({
  empresa_id: z.string().uuid(),
  provider: z.string().min(1).max(40).default('WEBPAY'),
  reference: z.string().min(1).max(120),
  status: z.enum(['paid', 'approved', 'APPROVED', 'PAID']).default('paid'),
  secret: z.string().optional(),
});

function webhookSecretOk(request: FastifyRequest, bodySecret?: string): boolean {
  const expected = config.subscriptionWebhookSecret;
  const header = request.headers['x-subscription-webhook-secret']?.toString();
  return Boolean(expected && (header === expected || bodySecret === expected));
}

const publicCheckoutRoutes = async (app: FastifyInstance) => {
  const core = new ApiCoreServicePlatformEmpresa();
  const payments = new ApiCoreServicePayment();

  app.get('/checkout/:empresaId', async (request, reply) => {
    const { empresaId } = request.params as { empresaId: string };
    try {
      const data = await core.getCheckout(empresaId);
      return sendOk(reply, data);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to load checkout'),
        err.response?.status ?? 404
      );
    }
  });

  app.post('/checkout/create-session', async (request, reply) => {
    const body = createSessionSchema.parse(request.body ?? {});
    try {
      const session = await payments.createCheckoutSession({
        empresaId: body.empresaId,
        provider: body.provider,
        returnBaseUrl: config.frontendPublicUrl,
      });
      return sendOk(reply, { session });
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to create checkout session'),
        err.response?.status ?? 400
      );
    }
  });

  app.post('/checkout/webpay-commit', async (request, reply) => {
    const body = webpayCommitSchema.parse(request.body ?? {});
    try {
      const result = await payments.completeWebpayCommit(body.token_ws);
      return sendOk(reply, result);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to commit Webpay transaction'),
        err.response?.status ?? 400
      );
    }
  });

  app.post('/checkout/sandbox-complete', async (request, reply) => {
    const body = sandboxCompleteSchema.parse(request.body ?? {});
    try {
      const result = await payments.completeSandboxCheckout(body.token);
      return sendOk(reply, result);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to complete sandbox checkout'),
        err.response?.status ?? 400
      );
    }
  });

  app.post('/checkout/confirm', async (request, reply) => {
    const body = confirmSchema.parse(request.body ?? {});
    const reference = body.reference ?? `sandbox-${Date.now()}`;
    try {
      const ledger = await payments.processInboundWebhook({
        provider: body.provider,
        externalId: reference,
        reference,
        status: 'APPROVED',
        empresa_id: body.empresaId,
        metadata: { kind: 'SAAS_SUB', empresaId: body.empresaId },
      });
      return sendOk(reply, { duplicate: ledger.duplicate, ...ledger.data });
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to confirm payment'),
        err.response?.status ?? 400
      );
    }
  });

  app.post('/webhooks/subscription-payment', async (request, reply) => {
    const body = webhookSchema.parse(request.body ?? {});
    if (!webhookSecretOk(request, body.secret)) {
      return sendFail(reply, 'UNAUTHORIZED', 401);
    }
    if (!['paid', 'approved', 'APPROVED', 'PAID'].includes(body.status)) {
      return sendFail(reply, 'PAYMENT_NOT_APPROVED', 422);
    }
    try {
      const ledger = await payments.processInboundWebhook({
        provider: body.provider,
        externalId: body.reference,
        reference: body.reference,
        status: body.status,
        empresa_id: body.empresa_id,
        metadata: { kind: 'SAAS_SUB', empresaId: body.empresa_id },
      });
      return sendOk(reply, {
        webhook: 'subscription-payment',
        duplicate: ledger.duplicate,
        ...ledger.data,
      });
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to process subscription webhook'),
        err.response?.status ?? 400
      );
    }
  });
};

export default publicCheckoutRoutes;
