import { v4 as uuidv4 } from 'uuid';
import { Op, Transaction } from 'sequelize';
import Sale from '../../sales/models/Sale.model';
import SaleDeliveryEvent from '../models/SaleDeliveryEvent.model';
import { Result, ok, fail } from '../../../types/result';
import type { DeliveryStatus } from '../types.js';
import { TERMINAL_DELIVERY_STATUSES } from '../types.js';
import { canTransitionDelivery, parseDeliveryStatus } from '../deliveryTransitions.js';

export type DeliveryQueueItem = {
  id: string;
  saleNumber: string;
  total: number;
  deliveryStatus: DeliveryStatus;
  deliveryCustomerName: string | null;
  deliveryPhone: string | null;
  deliveryAddress: string | null;
  deliveryAmount: number;
  createdAt: Date;
};

class DeliveryTrackingDelegate {
  async seedCreatedForSale(
    saleId: string,
    empresaId: string,
    branchId: string,
    createdBy: string | null,
    transaction?: Transaction
  ): Promise<Result<void>> {
    await Sale.update(
      { deliveryStatus: 'CREATED' },
      { where: { id: saleId, empresaId, branchId }, transaction }
    );
    await SaleDeliveryEvent.create(
      {
        id: uuidv4(),
        saleId,
        empresaId,
        branchId,
        status: 'CREATED',
        note: 'Pedido con envío registrado',
        createdBy,
      },
      { transaction }
    );
    return ok(undefined);
  }

  async listPending(empresaId: string, branchId: string): Promise<Result<DeliveryQueueItem[]>> {
    const rows = await Sale.findAll({
      where: {
        empresaId,
        branchId,
        requiresDelivery: true,
        deliveryStatus: { [Op.notIn]: TERMINAL_DELIVERY_STATUSES },
      },
      order: [['createdAt', 'ASC']],
      limit: 100,
    });

    return ok(
      rows.map((s) => ({
        id: String(s.getDataValue('id')),
        saleNumber: String(s.getDataValue('id')).slice(0, 8).toUpperCase(),
        total: Number(s.getDataValue('total') ?? 0),
        deliveryStatus: String(s.getDataValue('deliveryStatus') ?? 'CREATED') as DeliveryStatus,
        deliveryCustomerName: s.getDataValue('deliveryCustomerName') as string | null,
        deliveryPhone: s.getDataValue('deliveryPhone') as string | null,
        deliveryAddress: s.getDataValue('deliveryAddress') as string | null,
        deliveryAmount: Number(s.getDataValue('deliveryAmount') ?? 0),
        createdAt: s.getDataValue('createdAt') as Date,
      }))
    );
  }

  async advanceStatus(input: {
    saleId: string;
    empresaId: string;
    branchId: string;
    status: string;
    note?: string | null;
    userId: string;
  }): Promise<Result<{ deliveryStatus: DeliveryStatus; event: SaleDeliveryEvent }>> {
    const next = parseDeliveryStatus(input.status);
    if (!next) return fail('VALIDATION_ERROR: invalid delivery status');

    const sale = await Sale.findOne({
      where: {
        id: input.saleId,
        empresaId: input.empresaId,
        branchId: input.branchId,
        requiresDelivery: true,
      },
    });
    if (!sale) return fail('SALE_NOT_FOUND');

    const currentRaw = sale.getDataValue('deliveryStatus') as string | null;
    const current = parseDeliveryStatus(currentRaw ?? 'CREATED') ?? 'CREATED';
    if (!canTransitionDelivery(current, next)) {
      return fail(`DELIVERY_INVALID_TRANSITION: ${current} -> ${next}`);
    }

    await sale.update({ deliveryStatus: next });
    const event = await SaleDeliveryEvent.create({
      id: uuidv4(),
      saleId: input.saleId,
      empresaId: input.empresaId,
      branchId: input.branchId,
      status: next,
      note: input.note?.trim() || null,
      createdBy: input.userId,
    });

    return ok({ deliveryStatus: next, event });
  }

  async getTimeline(
    saleId: string,
    empresaId: string,
    branchId: string
  ): Promise<Result<{ deliveryStatus: DeliveryStatus | null; events: SaleDeliveryEvent[] }>> {
    const sale = await Sale.findOne({
      where: { id: saleId, empresaId, branchId, requiresDelivery: true },
    });
    if (!sale) return fail('SALE_NOT_FOUND');

    const events = await SaleDeliveryEvent.findAll({
      where: { saleId, empresaId },
      order: [['createdAt', 'ASC']],
    });

    const st = sale.getDataValue('deliveryStatus') as string | null;
    return ok({
      deliveryStatus: st ? (parseDeliveryStatus(st) as DeliveryStatus) : null,
      events,
    });
  }
}

export default new DeliveryTrackingDelegate();
