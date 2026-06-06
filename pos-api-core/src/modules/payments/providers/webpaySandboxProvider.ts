import { v4 as uuidv4 } from 'uuid';
import { issueCheckoutSessionToken } from '../utils/checkoutSessionToken.js';
import type { PaymentProviderAdapter, CreateCheckoutSessionInput, CreateCheckoutSessionResult } from './types.js';
import {
  isWebpayIntegrationConfigured,
  webpayCreateTransaction,
} from './webpay/webpayClient.js';

function shortBuyOrder(): string {
  const raw = uuidv4().replace(/-/g, '');
  return `WP${raw.slice(0, 24)}`;
}

export function createWebpaySandboxProvider(tokenSecret: string): PaymentProviderAdapter {
  return {
    id: 'WEBPAY',
    async createCheckoutSession(
      input: CreateCheckoutSessionInput,
      ctx: { amount: number; currency: string }
    ): Promise<CreateCheckoutSessionResult> {
      const sessionId = uuidv4();
      const externalId = shortBuyOrder();
      const returnBase = input.returnBaseUrl.replace(/\/$/, '');

      if (isWebpayIntegrationConfigured()) {
        const returnUrl = `${returnBase}/checkout/webpay-return`;
        const tbk = await webpayCreateTransaction({
          buyOrder: externalId,
          sessionId: input.empresaId,
          amount: ctx.amount,
          returnUrl,
        });
        return {
          provider: 'WEBPAY',
          sessionId,
          externalId: tbk.buyOrder,
          amount: ctx.amount,
          currency: ctx.currency,
          redirectUrl: tbk.url,
          sandbox: false,
          webpayToken: tbk.token,
        };
      }

      const token = issueCheckoutSessionToken(tokenSecret, {
        empresaId: input.empresaId,
        kind: input.kind,
        provider: 'WEBPAY',
        externalId,
        amount: ctx.amount,
        currency: ctx.currency,
        ttlSec: 3600,
      });
      const redirectUrl = `${returnBase}/checkout/webpay-simulate?token=${encodeURIComponent(token)}`;
      return {
        provider: 'WEBPAY',
        sessionId,
        externalId,
        amount: ctx.amount,
        currency: ctx.currency,
        redirectUrl,
        sandbox: true,
      };
    },
  };
}
