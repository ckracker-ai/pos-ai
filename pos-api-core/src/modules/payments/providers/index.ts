import config from '../paymentConfig.js';
import { createSandboxProvider } from './sandboxProvider.js';
import { createWebpaySandboxProvider } from './webpaySandboxProvider.js';
import type { PaymentProviderAdapter } from './types.js';

const sandbox = createSandboxProvider(config.checkoutTokenSecret);
const webpay = createWebpaySandboxProvider(config.checkoutTokenSecret);

const registry: Record<string, PaymentProviderAdapter> = {
  SANDBOX: sandbox,
  WEBPAY: webpay,
};

export function getPaymentProvider(providerId?: string): PaymentProviderAdapter {
  const key = String(providerId ?? config.defaultProvider).trim().toUpperCase();
  const adapter = registry[key] ?? registry.SANDBOX;
  return adapter;
}
