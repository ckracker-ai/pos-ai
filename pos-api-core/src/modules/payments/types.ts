export type PaymentKind = 'SAAS_SUB' | 'SALE_WSP';

export type PaymentWebhookStatus = 'APPROVED' | 'REJECTED' | 'PENDING';

export type NormalizedPaymentWebhook = {
  provider: string;
  externalId: string;
  status: PaymentWebhookStatus;
  amount: number;
  currency: string;
  kind: PaymentKind;
  empresaId: string;
  pedidoId: string | null;
};
