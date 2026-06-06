import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import config from '../../config/index.js';
import { ApiCoreServicePayment } from '../../services/apiCoreServicePayment.js';
import { extractCoreError } from '../../utils/extractCoreError.js';
import { sendFail, sendOk } from '../../utils/response.js';
import { verifyPaymentSignature, signPaymentPayload } from '../../utils/paymentSignature.js';

const unifiedWebhookSchema = z.object({
  provider: z.string().min(1).max(40),
  externalId: z.string().min(1).max(120),
  status: z.enum(['APPROVED', 'REJECTED', 'PENDING', 'paid', 'approved', 'PAID']).default('APPROVED'),
  amount: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  metadata: z.object({
    kind: z.enum(['SAAS_SUB', 'SALE_WSP']),
    empresaId: z.string().uuid(),
    pedidoId: z.string().uuid().nullable().optional(),
  }),
  signature: z.string().optional(),
});

function gatewaySecretOk(request: FastifyRequest, bodySecret?: string): boolean {
  const expected = config.paymentGatewayWebhookSecret;
  const header =
    request.headers['x-payment-gateway-secret']?.toString() ??
    request.headers['x-subscription-webhook-secret']?.toString();
  return Boolean(expected && (header === expected || bodySecret === expected));
}

function canonicalWebhookBody(body: z.infer<typeof unifiedWebhookSchema>): string {
  return JSON.stringify({
    provider: body.provider,
    externalId: body.externalId,
    status: body.status,
    amount: body.amount ?? 0,
    currency: body.currency ?? 'CLP',
    metadata: body.metadata,
  });
}

const paymentGatewayRoutes = async (app: FastifyInstance): Promise<void> => {
  const payments = new ApiCoreServicePayment();

  app.post('/webhooks/payment-gateway', async (request, reply) => {
    const body = unifiedWebhookSchema.parse(request.body ?? {});
    const bodySecret = (request.body as { secret?: string })?.secret;
    if (!gatewaySecretOk(request, bodySecret)) {
      return sendFail(reply, 'UNAUTHORIZED', 401);
    }

    const canonical = canonicalWebhookBody(body);
    if (
      config.paymentWebhookHmacSecret &&
      body.signature &&
      !verifyPaymentSignature(config.paymentWebhookHmacSecret, canonical, body.signature)
    ) {
      return sendFail(reply, 'INVALID_SIGNATURE', 401);
    }

    try {
      const ledger = await payments.processInboundWebhook({
        provider: body.provider,
        externalId: body.externalId,
        status: body.status,
        amount: body.amount ?? 0,
        currency: body.currency ?? 'CLP',
        metadata: {
          kind: body.metadata.kind,
          empresaId: body.metadata.empresaId,
          pedidoId: body.metadata.pedidoId ?? null,
        },
      });
      return sendOk(reply, { webhook: 'payment-gateway', duplicate: ledger.duplicate, ...ledger.data });
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      return sendFail(
        reply,
        extractCoreError(e, 'Failed to process payment gateway webhook'),
        err.response?.status ?? 400
      );
    }
  });
};

export default paymentGatewayRoutes;

/** Utilidad dev: firma HMAC para pruebas Postman/smoke */
export function devSignPaymentWebhook(body: Record<string, unknown>, secret: string): string {
  const canonical = JSON.stringify({
    provider: body.provider,
    externalId: body.externalId,
    status: body.status ?? 'APPROVED',
    amount: body.amount ?? 0,
    currency: body.currency ?? 'CLP',
    metadata: body.metadata,
  });
  return signPaymentPayload(secret, canonical);
}
