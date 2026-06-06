import { v4 as uuidv4 } from 'uuid';
import PaymentEvent from '../models/PaymentEvent.model';
import { parsePaymentWebhookBody } from '../paymentWebhookParser.js';
import type { NormalizedPaymentWebhook } from '../types.js';
import { Result, ok, fail } from '../../../types/result';
import empresaDelegate from '../../tenant/delegates/EmpresaDelegate';
import assistantDelegate from '../../assistant/delegates/AssistantDelegate';

export type PaymentWebhookResult = {
  duplicate: boolean;
  kind: string;
  provider: string;
  externalId: string;
  status: string;
  data: Record<string, unknown>;
};

class PaymentWebhookDelegate {
  private serializeResult(data: Record<string, unknown>): string {
    return JSON.stringify(data);
  }

  private parseStoredResult(row: PaymentEvent): Record<string, unknown> {
    const raw = row.getDataValue('resultJson') as string | null;
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  async findByExternal(provider: string, externalId: string): Promise<PaymentEvent | null> {
    return PaymentEvent.findOne({ where: { provider, externalId } });
  }

  private async dispatchApproved(
    event: NormalizedPaymentWebhook
  ): Promise<Result<Record<string, unknown>>> {
    if (event.kind === 'SAAS_SUB') {
      const paid = await empresaDelegate.confirmCheckoutPayment(event.empresaId, {
        provider: event.provider,
        reference: event.externalId,
      });
      if (!paid.success) return paid;
      return ok({
        kind: event.kind,
        suscripcion: paid.value.suscripcion,
        empresa: paid.value.empresa,
      });
    }

    const sale = await assistantDelegate.confirmOnlinePayment(event.empresaId, event.pedidoId!, {
      provider: event.provider,
      reference: event.externalId,
    });
    if (!sale.success) return sale;
    return ok({
      kind: event.kind,
      sale_id: sale.value.saleId,
      client_phone: sale.value.clientPhone,
      client_message: sale.value.clientMessage,
    });
  }

  async handleInbound(
    body: Record<string, unknown>
  ): Promise<Result<PaymentWebhookResult>> {
    const parsed = parsePaymentWebhookBody(body);
    if (!parsed.ok) return fail(parsed.error);

    const event = parsed.value;

    const existing = await this.findByExternal(event.provider, event.externalId);
    if (existing) {
      return ok({
        duplicate: true,
        kind: String(existing.getDataValue('kind') ?? event.kind),
        provider: event.provider,
        externalId: event.externalId,
        status: String(existing.getDataValue('status') ?? event.status),
        data: this.parseStoredResult(existing),
      });
    }

    if (event.status !== 'APPROVED') {
      const row = await PaymentEvent.create({
        id: uuidv4(),
        provider: event.provider,
        externalId: event.externalId,
        kind: event.kind,
        status: event.status,
        amount: event.amount,
        currency: event.currency,
        empresaId: event.empresaId,
        saleId: event.pedidoId,
        resultCode: 'IGNORED_STATUS',
        resultJson: this.serializeResult({ ignored: true, status: event.status }),
      });
      return ok({
        duplicate: false,
        kind: event.kind,
        provider: event.provider,
        externalId: event.externalId,
        status: event.status,
        data: { ignored: true, paymentEventId: row.id },
      });
    }

    const dispatched = await this.dispatchApproved(event);
    if (!dispatched.success) {
      return dispatched;
    }

    await PaymentEvent.create({
      id: uuidv4(),
      provider: event.provider,
      externalId: event.externalId,
      kind: event.kind,
      status: event.status,
      amount: event.amount,
      currency: event.currency,
      empresaId: event.empresaId,
      saleId: event.pedidoId,
      resultCode: 'SUCCESS',
      resultJson: this.serializeResult(dispatched.value),
    });

    return ok({
      duplicate: false,
      kind: event.kind,
      provider: event.provider,
      externalId: event.externalId,
      status: event.status,
      data: dispatched.value,
    });
  }
}

export default new PaymentWebhookDelegate();
