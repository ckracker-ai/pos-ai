import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import config from '../../config/index.js';
import { ApiCoreServicePlatformEmpresa } from '../../services/apiCoreServicePlatformEmpresa.js';
import { extractCoreError } from '../../utils/extractCoreError.js';
import { sendFail, sendOk } from '../../utils/response.js';

const confirmSchema = z.object({
  empresaId: z.string().uuid(),
  provider: z.string().min(1).max(40).default('SANDBOX'),
  reference: z.string().min(1).max(120).optional(),
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

  app.post('/checkout/confirm', async (request, reply) => {
    const body = confirmSchema.parse(request.body ?? {});
    const reference = body.reference ?? `sandbox-${Date.now()}`;
    try {
      const data = await core.confirmCheckout(body.empresaId, {
        provider: body.provider,
        reference,
      });
      return sendOk(reply, data);
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
      const data = await core.confirmCheckout(body.empresa_id, {
        provider: body.provider,
        reference: body.reference,
      });
      return sendOk(reply, { webhook: 'subscription-payment', ...data });
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
