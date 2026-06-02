import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import config from '../config/index.js';
import { coreClient } from '../core/coreClient.js';
import { sendWhatsAppText, isMetaSendConfigured } from '../meta/sendMessage.js';

const paymentWebhookSchema = z.object({
  empresa_id: z.string().uuid(),
  sale_id: z.string().uuid(),
  provider: z.string().max(40).optional(),
  reference: z.string().max(120).optional(),
  secret: z.string().optional(),
});

export async function paymentWebhookRoutes(app: FastifyInstance) {
  app.post('/webhooks/payment', async (req, reply) => {
    const body = paymentWebhookSchema.parse(req.body);
    const headerSecret = String(req.headers['x-payment-webhook-secret'] ?? '');
    const secret = headerSecret || body.secret || '';

    if (!config.paymentWebhookSecret || secret !== config.paymentWebhookSecret) {
      return reply.status(401).send({ success: false, error: 'UNAUTHORIZED' });
    }

    try {
      const data = await coreClient.confirmOnlinePayment(body.empresa_id, body.sale_id, {
        provider: body.provider,
        reference: body.reference,
      });

      const phone = String(data.client_phone ?? '').replace(/\D/g, '');
      const message = String(data.client_message ?? '').trim();

      if (phone.length >= 8 && message) {
        if (isMetaSendConfigured()) {
          await sendWhatsAppText(phone, message);
        } else {
          req.log.info({ phone, message }, 'payment webhook — notify client (dev)');
        }
      }

      return reply.send({ success: true, data });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'PAYMENT_CONFIRM_FAILED';
      return reply.status(400).send({ success: false, error: message });
    }
  });
}
