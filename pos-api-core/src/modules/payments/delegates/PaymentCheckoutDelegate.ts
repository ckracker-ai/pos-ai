import empresaDelegate from '../../tenant/delegates/EmpresaDelegate.js';
import { getPaymentProvider } from '../providers/index.js';
import type { PaymentKind } from '../types.js';
import paymentConfig from '../paymentConfig.js';
import { Result, ok, fail } from '../../../types/result';
import type { CreateCheckoutSessionResult } from '../providers/types.js';
import { verifyCheckoutSessionToken } from '../utils/checkoutSessionToken.js';
import paymentWebhookDelegate from './PaymentWebhookDelegate.js';
import paymentSessionDelegate from './PaymentSessionDelegate.js';
import { isWebpayIntegrationConfigured } from '../providers/webpay/webpayClient.js';

class PaymentCheckoutDelegate {
  async createSession(input: {
    empresaId: string;
    kind?: PaymentKind;
    provider?: string;
    returnBaseUrl?: string;
  }): Promise<Result<CreateCheckoutSessionResult>> {
    const kind = input.kind ?? 'SAAS_SUB';
    if (kind !== 'SAAS_SUB') {
      return fail('VALIDATION_ERROR: only SAAS_SUB checkout session in v1.10');
    }

    const summary = await empresaDelegate.getCheckoutSummary(input.empresaId);
    if (!summary.success) return summary;
    if (!summary.value.canPay) {
      return fail('SUBSCRIPTION_ALREADY_ACTIVE');
    }

    const provider = getPaymentProvider(input.provider ?? paymentConfig.defaultProvider);
    try {
      const session = await provider.createCheckoutSession(
        {
          empresaId: input.empresaId,
          kind,
          returnBaseUrl: input.returnBaseUrl ?? paymentConfig.sandboxReturnBaseUrl,
        },
        {
          amount: summary.value.totalClp,
          currency: 'CLP',
          razonSocial: summary.value.razonSocial,
        }
      );

      if (session.webpayToken && !session.sandbox) {
        const pending = await paymentSessionDelegate.createPending({
          provider: session.provider,
          externalId: session.externalId,
          kind,
          amount: session.amount,
          currency: session.currency,
          empresaId: input.empresaId,
          tbkToken: session.webpayToken,
        });
        if (!pending.success) return pending;
      }

      return ok(session);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'CHECKOUT_SESSION_FAILED';
      return fail(msg);
    }
  }

  async completeWebpayTransaction(
    tokenWs: string
  ): Promise<Result<import('./PaymentWebhookDelegate.js').PaymentWebhookResult>> {
    if (!isWebpayIntegrationConfigured()) {
      return fail('WEBPAY_INTEGRATION_NOT_CONFIGURED');
    }
    return paymentSessionDelegate.commitWebpayReturn(tokenWs);
  }

  async completeSandboxSession(token: string): Promise<Result<import('./PaymentWebhookDelegate.js').PaymentWebhookResult>> {
    const verified = verifyCheckoutSessionToken(paymentConfig.checkoutTokenSecret, token);
    if (!verified.ok) return fail(verified.error);

    const p = verified.value;
    return paymentWebhookDelegate.handleInbound({
      provider: p.provider,
      externalId: p.externalId,
      status: 'APPROVED',
      amount: p.amount,
      currency: p.currency,
      metadata: {
        kind: p.kind,
        empresaId: p.empresaId,
      },
    });
  }
}

export default new PaymentCheckoutDelegate();
