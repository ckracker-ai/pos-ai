import type { PaymentKind } from '../types.js';

export type CreateCheckoutSessionInput = {
  empresaId: string;
  kind: PaymentKind;
  returnBaseUrl: string;
};

export type CreateCheckoutSessionResult = {
  provider: string;
  sessionId: string;
  externalId: string;
  amount: number;
  currency: string;
  redirectUrl: string;
  sandbox: boolean;
  /** Presente en integración Transbank real */
  webpayToken?: string;
};

export interface PaymentProviderAdapter {
  readonly id: string;
  createCheckoutSession(
    input: CreateCheckoutSessionInput,
    ctx: { amount: number; currency: string; razonSocial: string }
  ): Promise<CreateCheckoutSessionResult>;
}
