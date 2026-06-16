import { Op, Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../../../config/database';
import PaymentSession, { PaymentSessionStatus } from '../models/PaymentSession.model';
import PaymentEvent from '../models/PaymentEvent.model';
import paymentWebhookDelegate, { PaymentWebhookResult } from './PaymentWebhookDelegate';
import {
  isWebpayAuthorized,
  webpayCommitTransaction,
  type WebpayCommitResult,
} from '../providers/webpay/webpayClient.js';
import type { PaymentKind } from '../types.js';
import { Result, ok, fail } from '../../../types/result';
import { paymentSessionExpiresAt } from '../utils/paymentSessionTime.js';

export type CreatePendingSessionInput = {
  provider: string;
  externalId: string;
  kind: PaymentKind;
  amount: number;
  currency?: string;
  empresaId: string;
  saleId?: string | null;
  tbkToken?: string | null;
  stockReserved?: boolean;
};

export function sessionStatusFromCommit(commit: WebpayCommitResult): 'APPROVED' | 'REJECTED' {
  return isWebpayAuthorized(commit) ? 'APPROVED' : 'REJECTED';
}

function parseEventResult(row: PaymentEvent | null): Record<string, unknown> {
  if (!row) return {};
  const raw = row.getDataValue('resultJson') as string | null;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function webhookResultFromLedger(
  duplicate: boolean,
  event: PaymentEvent | null,
  sessionStatus: PaymentSessionStatus
): PaymentWebhookResult {
  return {
    duplicate,
    kind: String(event?.getDataValue('kind') ?? 'SAAS_SUB'),
    provider: String(event?.getDataValue('provider') ?? 'WEBPAY'),
    externalId: String(event?.getDataValue('externalId') ?? ''),
    status: String(event?.getDataValue('status') ?? sessionStatus),
    data: parseEventResult(event),
  };
}

class PaymentSessionDelegate {
  async createPending(input: CreatePendingSessionInput): Promise<Result<{ id: string }>> {
    const provider = input.provider.trim().toUpperCase();
    const externalId = input.externalId.trim();
    if (!provider || !externalId) {
      return fail('VALIDATION_ERROR: provider and externalId required');
    }

    const existing = await PaymentSession.findOne({
      where: { provider, externalId },
    });
    if (existing) {
      const status = String(existing.getDataValue('status') ?? '') as PaymentSessionStatus;
      if (status === 'PENDING' && new Date(existing.getDataValue('expiresAt') as Date) > new Date()) {
        return ok({ id: String(existing.getDataValue('id') ?? existing.id) });
      }
    }

    const row = await PaymentSession.create({
      id: uuidv4(),
      provider,
      externalId,
      kind: input.kind,
      status: 'PENDING',
      amount: input.amount,
      currency: input.currency ?? 'CLP',
      empresaId: input.empresaId,
      saleId: input.saleId ?? null,
      tbkToken: input.tbkToken ?? null,
      stockReserved: Boolean(input.stockReserved),
      expiresAt: paymentSessionExpiresAt(),
    });

    return ok({ id: String(row.getDataValue('id') ?? row.id) });
  }

  private async loadIdempotentOutcome(
    session: PaymentSession,
    tx: Transaction
  ): Promise<Result<PaymentWebhookResult> | null> {
    const status = String(session.getDataValue('status') ?? '') as PaymentSessionStatus;
    const provider = String(session.getDataValue('provider') ?? '');
    const externalId = String(session.getDataValue('externalId') ?? '');

    if (status === 'APPROVED') {
      const ledger = await PaymentEvent.findOne({
        where: { provider, externalId },
        transaction: tx,
      });
      return ok(webhookResultFromLedger(true, ledger, status));
    }

    if (status === 'REJECTED' || status === 'CANCELLED' || status === 'EXPIRED') {
      const ledger = await PaymentEvent.findOne({
        where: { provider, externalId },
        transaction: tx,
      });
      const data = ledger
        ? parseEventResult(ledger)
        : { sessionStatus: status, message: 'Pago no autorizado o sesión expirada' };
      return ok({
        duplicate: true,
        kind: String(session.getDataValue('kind') ?? 'SAAS_SUB'),
        provider,
        externalId,
        status,
        data,
      });
    }

    return null;
  }

  private async persistRejectedLedger(
    session: PaymentSession,
    commit: WebpayCommitResult,
    tx: Transaction
  ): Promise<void> {
    const provider = String(session.getDataValue('provider') ?? 'WEBPAY');
    const externalId = String(session.getDataValue('externalId') ?? commit.buyOrder);
    const existing = await PaymentEvent.findOne({
      where: { provider, externalId },
      transaction: tx,
    });
    if (existing) return;

    await PaymentEvent.create(
      {
        id: uuidv4(),
        provider,
        externalId,
        kind: String(session.getDataValue('kind') ?? 'SAAS_SUB'),
        status: 'REJECTED',
        amount: commit.amount || Number(session.getDataValue('amount') ?? 0),
        currency: String(session.getDataValue('currency') ?? 'CLP'),
        empresaId: String(session.getDataValue('empresaId') ?? commit.sessionId),
        saleId: (session.getDataValue('saleId') as string | null) ?? null,
        resultCode: commit.responseCode != null ? String(commit.responseCode) : 'REJECTED',
        resultJson: JSON.stringify({
          webpayStatus: commit.status,
          responseCode: commit.responseCode,
          buyOrder: commit.buyOrder,
        }),
      },
      { transaction: tx }
    );
  }

  async commitWebpayReturn(tokenWs: string): Promise<Result<PaymentWebhookResult>> {
    let commit: WebpayCommitResult;
    try {
      commit = await webpayCommitTransaction(tokenWs);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'WEBPAY_COMMIT_FAILED';
      return fail(msg);
    }

    const buyOrder = commit.buyOrder?.trim();
    if (!buyOrder) return fail('VALIDATION_ERROR: Webpay commit sin buy_order');

    const provider = 'WEBPAY';
    const nextStatus = sessionStatusFromCommit(commit);
    const now = new Date();

    return sequelize.transaction(async (tx) => {
      let session = await PaymentSession.findOne({
        where: { provider, externalId: buyOrder },
        lock: tx.LOCK.UPDATE,
        transaction: tx,
      });

      if (!session) {
        const empresaId = commit.sessionId?.trim();
        if (!empresaId) return fail('VALIDATION_ERROR: missing session_id from Webpay');
        session = await PaymentSession.create(
          {
            id: uuidv4(),
            provider,
            externalId: buyOrder,
            kind: 'SAAS_SUB',
            status: 'PENDING',
            amount: commit.amount,
            currency: 'CLP',
            empresaId,
            expiresAt: paymentSessionExpiresAt(now),
          },
          { transaction: tx }
        );
      }

      const idempotent = await this.loadIdempotentOutcome(session, tx);
      if (idempotent) return idempotent;

      await session.update(
        {
          status: nextStatus,
          amount: commit.amount || Number(session.getDataValue('amount') ?? 0),
          committedAt: now,
          resultJson: {
            status: commit.status,
            responseCode: commit.responseCode,
            authorizationCode: commit.authorizationCode,
            buyOrder: commit.buyOrder,
            sessionId: commit.sessionId,
          },
        },
        { transaction: tx }
      );

      if (nextStatus === 'REJECTED') {
        await this.persistRejectedLedger(session, commit, tx);
        return fail(`WEBPAY_NOT_AUTHORIZED: ${commit.status}`);
      }

      const empresaId =
        commit.sessionId?.trim() || String(session.getDataValue('empresaId') ?? '');
      if (!empresaId) return fail('VALIDATION_ERROR: missing empresaId');

      const inbound = await paymentWebhookDelegate.handleInbound({
        provider,
        externalId: buyOrder,
        status: 'APPROVED',
        amount: commit.amount,
        currency: 'CLP',
        metadata: {
          kind: String(session.getDataValue('kind') ?? 'SAAS_SUB'),
          empresaId,
        },
      });

      if (!inbound.success) return inbound;
      return inbound;
    });
  }

  /** Marca PENDING vencidas (>15 min) como EXPIRED. SALE_WSP: liberar stock — backlog. */
  async expirePendingSessions(): Promise<Result<{ scanned: number; expired: number }>> {
    const now = new Date();
    const candidates = await PaymentSession.findAll({
      where: {
        status: 'PENDING',
        expiresAt: { [Op.lt]: now },
      },
      limit: 100,
      order: [['expiresAt', 'ASC']],
    });

    let expired = 0;
    for (const row of candidates) {
      await sequelize.transaction(async (tx) => {
        const locked = await PaymentSession.findByPk(row.id, {
          lock: tx.LOCK.UPDATE,
          transaction: tx,
        });
        if (!locked || String(locked.getDataValue('status')) !== 'PENDING') return;

        await locked.update({ status: 'EXPIRED' }, { transaction: tx });
        expired += 1;
      });
    }

    return ok({ scanned: candidates.length, expired });
  }
}

export default new PaymentSessionDelegate();
