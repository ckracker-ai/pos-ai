const paymentConfig = {
  defaultProvider: (process.env.PAYMENT_PROVIDER ?? 'SANDBOX').trim().toUpperCase(),
  checkoutTokenSecret:
    process.env.PAYMENT_CHECKOUT_TOKEN_SECRET ??
    process.env.INTERNAL_API_KEY ??
    'supersecretkey',
  webhookHmacSecret:
    process.env.PAYMENT_WEBHOOK_HMAC_SECRET ??
    process.env.SUBSCRIPTION_WEBHOOK_SECRET ??
    process.env.INTERNAL_API_KEY ??
    'supersecretkey',
  sandboxReturnBaseUrl:
    process.env.PAYMENT_SANDBOX_RETURN_BASE_URL ??
    process.env.FRONTEND_PUBLIC_URL ??
    'http://localhost:8010',
  webpayMode: (process.env.WEBPAY_MODE ?? 'simulate').trim().toLowerCase() as 'simulate' | 'integration',
  webpayCommerceCode: (process.env.WEBPAY_COMMERCE_CODE ?? '').trim(),
  webpayApiSecret: (process.env.WEBPAY_API_SECRET ?? '').trim(),
  webpayApiBaseUrl:
    (process.env.WEBPAY_API_BASE_URL ?? 'https://webpay3gint.transbank.cl').trim(),
};

export default paymentConfig;
