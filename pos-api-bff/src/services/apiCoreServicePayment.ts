import { ApiCoreBaseService } from './apiCoreBaseService.js';
import config from '../config/index.js';

export type PaymentWebhookResult = {
  duplicate: boolean;
  kind: string;
  provider: string;
  externalId: string;
  status: string;
  data: Record<string, unknown>;
};

export class ApiCoreServicePayment extends ApiCoreBaseService {
  private coreHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-internal-key': config.internalApiKey,
    };
  }

  async processInboundWebhook(body: Record<string, unknown>): Promise<PaymentWebhookResult> {
    const response = await this.client.post('/payments/webhooks/inbound', body, {
      headers: this.coreHeaders(),
    });
    return response.data.data as PaymentWebhookResult;
  }

  async createCheckoutSession(body: {
    empresaId: string;
    kind?: string;
    provider?: string;
    returnBaseUrl?: string;
  }) {
    const response = await this.client.post('/payments/checkout/sessions', body, {
      headers: this.coreHeaders(),
    });
    return response.data.data as {
      provider: string;
      sessionId: string;
      externalId: string;
      amount: number;
      currency: string;
      redirectUrl: string;
      sandbox: boolean;
    };
  }

  async completeWebpayCommit(tokenWs: string): Promise<PaymentWebhookResult> {
    const response = await this.client.post(
      '/payments/checkout/webpay-commit',
      { token_ws: tokenWs },
      { headers: this.coreHeaders() }
    );
    return response.data.data as PaymentWebhookResult;
  }

  async completeSandboxCheckout(token: string): Promise<PaymentWebhookResult> {
    const response = await this.client.post(
      '/payments/checkout/sandbox-complete',
      { token },
      { headers: this.coreHeaders() }
    );
    return response.data.data as PaymentWebhookResult;
  }
}
