import type { FastifyInstance } from 'fastify';
import config from '../config/index.js';
import { sendWhatsAppText, isMetaSendConfigured } from '../meta/sendMessage.js';

export async function internalNotifyRoutes(app: FastifyInstance) {
  app.post('/internal/notify-client', async (req, reply) => {
    const key = req.headers['x-internal-key'];
    if (!config.internalApiKey || key !== config.internalApiKey) {
      return reply.status(403).send({ success: false, error: 'UNAUTHORIZED' });
    }

    const body = req.body as { phone?: string; message?: string };
    const phone = String(body.phone ?? '').replace(/\D/g, '');
    const message = String(body.message ?? '').trim();

    if (phone.length < 8 || !message) {
      return reply.status(422).send({ success: false, error: 'VALIDATION_ERROR' });
    }

    if (!isMetaSendConfigured()) {
      req.log.info({ phone, message }, 'notify-client (dev, Meta no configurado)');
      return reply.send({ success: true, sentViaMeta: false, devMessage: message });
    }

    await sendWhatsAppText(phone, message);
    return reply.send({ success: true, sentViaMeta: true });
  });
}
