const config = {
  port: Number(process.env.PORT ?? 2020),
  apiPrefix: (process.env.API_PREFIX ?? '/pos/proxy').replace(/\/$/, ''),
  coreApiBaseUrl: process.env.CORE_API_BASE_URL ?? 'http://localhost:1010',
  assistantApiBaseUrl: process.env.ASSISTANT_API_BASE_URL ?? 'http://localhost:3030',
  internalApiKey: process.env.INTERNAL_API_KEY ?? '',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'replace-with-refresh-secret',
  branchHeader: 'x-branch-id',
  platformAdminEmail: process.env.PLATFORM_ADMIN_EMAIL ?? 'platform@pos-ai.local',
  platformAdminPassword: process.env.PLATFORM_ADMIN_PASSWORD ?? 'PlatformAdmin2026!',
  subscriptionWebhookSecret:
    process.env.SUBSCRIPTION_WEBHOOK_SECRET ?? process.env.INTERNAL_API_KEY ?? '',
  paymentGatewayWebhookSecret:
    process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET ??
    process.env.SUBSCRIPTION_WEBHOOK_SECRET ??
    process.env.INTERNAL_API_KEY ??
    '',
  paymentWebhookHmacSecret:
    process.env.PAYMENT_WEBHOOK_HMAC_SECRET ??
    process.env.SUBSCRIPTION_WEBHOOK_SECRET ??
    '',
  frontendPublicUrl: process.env.FRONTEND_PUBLIC_URL ?? 'http://localhost:8010',
  sessionTtlSec: Math.max(60, Number(process.env.SESSION_TTL_SEC ?? 28800) || 28800),
  cookieSecure:
    process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
};

export default config;
