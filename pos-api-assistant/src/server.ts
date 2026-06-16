import Fastify from 'fastify';
import cors from '@fastify/cors';
import config, { isMetaSendConfigured } from './config/index.js';
import { whatsappRoutes } from './webhooks/whatsapp.js';
import { internalNotifyRoutes } from './routes/internalNotify.js';
import { paymentWebhookRoutes } from './routes/paymentWebhook.js';
import { posInterpretRoutes } from './routes/posInterpret.js';
import { voiceRoutes } from './webhooks/voice.js';
import { twilioVoiceRoutes } from './webhooks/twilioVoice.js';
import { getRedis, isRedisConfigured } from './lib/redis.js';

const app = Fastify({ logger: true, bodyLimit: 6 * 1024 * 1024 });

if (isRedisConfigured()) {
  await getRedis();
} else {
  app.log.info('REDIS_URL not set — assistant sessions use in-memory fallback');
}

await app.register(cors, { origin: true });

app.get('/health', async () => ({
  status: 'ok',
  service: 'pos-api-assistant',
  version: '1.8.0',
  openAi: Boolean(config.openAiApiKey),
  metaSend: isMetaSendConfigured(),
  metaSignature: Boolean(config.metaAppSecret.trim()),
  voiceDev: true,
  twilioVoice: Boolean(config.twilioAuthToken.trim()),
}));

await whatsappRoutes(app);
await voiceRoutes(app);
await twilioVoiceRoutes(app);
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
