import { v4 as uuidv4 } from 'uuid';
import { issueCheckoutSessionToken } from '../utils/checkoutSessionToken.js';
import type { PaymentProviderAdapter, CreateCheckoutSessionInput, CreateCheckoutSessionResult } from './types.js';

export function createSandboxProvider(tokenSecret: string): PaymentProviderAdapter {
  return {
    id: 'SANDBOX',
    async createCheckoutSession(
      input: CreateCheckoutSessionInput,
      ctx: { amount: number; currency: string }
    ): Promise<CreateCheckoutSessionResult> {
      const sessionId = uuidv4();
      const externalId = `sb-${sessionId.replace(/-/g, '').slice(0, 20)}`;
      const returnBase = input.returnBaseUrl.replace(/\/$/, '');
      const token = issueCheckoutSessionToken(tokenSecret, {
        empresaId: input.empresaId,
        kind: input.kind,
        provider: 'SANDBOX',
        externalId,
        amount: ctx.amount,
        currency: ctx.currency,
        ttlSec: 3600,
      });
      const redirectUrl = `${returnBase}/checkout/return?token=${encodeURIComponent(token)}`;
      return {
        provider: 'SANDBOX',
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
