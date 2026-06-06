import Fastify from 'fastify';
import cors from '@fastify/cors';
import config, { isMetaSendConfigured } from './config/index.js';
import { whatsappRoutes } from './webhooks/whatsapp.js';
import { internalNotifyRoutes } from './routes/internalNotify.js';
import { paymentWebhookRoutes } from './routes/paymentWebhook.js';
import { posInterpretRoutes } from './routes/posInterpret.js';

const app = Fastify({ logger: true, bodyLimit: 6 * 1024 * 1024 });

await app.register(cors, { origin: true });

app.get('/health', async () => ({
  status: 'ok',
  service: 'pos-api-assistant',
  version: '1.7.0',
  openAi: Boolean(config.openAiApiKey),
  metaSend: isMetaSendConfigured(),
  metaSignature: Boolean(config.metaAppSecret.trim()),
}));

await whatsappRoutes(app);
await internalNotifyRoutes(app);
await paymentWebhookRoutes(app);
await posInterpretRoutes(app);

app.listen({ port: config.port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`pos-api-assistant listening on ${address}`);
});
