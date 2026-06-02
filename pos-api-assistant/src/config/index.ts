const env = process.env;

export default {
  port: Number(env.PORT ?? 3030),
  coreBaseUrl: env.CORE_API_BASE_URL ?? 'http://pos-api-core:1010',
  internalApiKey: env.INTERNAL_API_KEY ?? 'supersecretkey',
  openAiApiKey: env.OPENAI_API_KEY ?? '',
  openAiModel: env.OPENAI_MODEL ?? 'gpt-4o-mini',
  whatsappVerifyToken: env.WHATSAPP_VERIFY_TOKEN ?? 'pos-ai-dev-verify',
  whatsappAccessToken: env.WHATSAPP_ACCESS_TOKEN ?? '',
  whatsappPhoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID ?? '',
  whatsappApiVersion: env.WHATSAPP_API_VERSION ?? 'v21.0',
  metaAppSecret: env.META_APP_SECRET ?? '',
  paymentWebhookSecret:
    env.PAYMENT_WEBHOOK_SECRET?.trim() || env.INTERNAL_API_KEY?.trim() || 'supersecretkey',
};

export function isMetaSendConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() && process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  );
}
