const config = {
  port: Number(process.env.PORT ?? 2020),
  apiPrefix: (process.env.API_PREFIX ?? '/pos/proxy').replace(/\/$/, ''),
  coreApiBaseUrl: process.env.CORE_API_BASE_URL ?? 'http://localhost:1010',
  assistantApiBaseUrl: process.env.ASSISTANT_API_BASE_URL ?? 'http://localhost:3030',
  internalApiKey: process.env.INTERNAL_API_KEY ?? 'supersecretkey',
  jwtSecret: process.env.JWT_SECRET ?? 'replace-with-strong-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'replace-with-refresh-secret',
  branchHeader: 'x-branch-id',
  platformAdminEmail: process.env.PLATFORM_ADMIN_EMAIL ?? 'platform@pos-ai.local',
  platformAdminPassword: process.env.PLATFORM_ADMIN_PASSWORD ?? 'PlatformAdmin2026!',
  subscriptionWebhookSecret:
    process.env.SUBSCRIPTION_WEBHOOK_SECRET ??
    process.env.INTERNAL_API_KEY ??
    'supersecretkey',
  paymentGatewayWebhookSecret:
    process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET ??
    process.env.SUBSCRIPTION_WEBHOOK_SECRET ??
    process.env.INTERNAL_API_KEY ??
    'supersecretkey',
  paymentWebhookHmacSecret:
    process.env.PAYMENT_WEBHOOK_HMAC_SECRET ??
    process.env.SUBSCRIPTION_WEBHOOK_SECRET ??
    '',
  frontendPublicUrl: process.env.FRONTEND_PUBLIC_URL ?? 'http://localhost:8010',
};

export default config;
