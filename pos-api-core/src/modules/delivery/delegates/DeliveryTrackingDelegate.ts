import { v4 as uuidv4 } from 'uuid';
import { Op, Transaction } from 'sequelize';
import Sale from '../../sales/models/Sale.model';
import SaleDeliveryEvent from '../models/SaleDeliveryEvent.model';
import User from '../../auth/models/User.model';
import Role from '../../auth/models/Role.model';
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
  assignedDriverId: string | null;
  assignedDriverName: string | null;
  createdAt: Date;
};

export type DeliveryDriverOption = {
  id: string;
  fullName: string;
  email: string;
  whatsappPhone: string | null;
};

class DeliveryTrackingDelegate {
  private async resolveDriver(
    empresaId: string,
    branchId: string,
    driverId: string
  ): Promise<Result<User>> {
    const role = await Role.findOne({ where: { name: 'DELIVERY' } });
    if (!role) return fail('DELIVERY_ROLE_NOT_CONFIGURED');

    const driver = await User.findOne({
      where: {
        id: driverId,
        empresaId,
        branchId,
        roleId: String(role.getDataValue('id')),
        isActive: true,
      },
    });
    if (!driver) return fail('DRIVER_NOT_FOUND');
    return ok(driver);
  }

  async listDrivers(empresaId: string, branchId: string): Promise<Result<DeliveryDriverOption[]>> {
    const role = await Role.findOne({ where: { name: 'DELIVERY' } });
    if (!role) return ok([]);

    const rows = await User.findAll({
      where: {
        empresaId,
        branchId,
        roleId: String(role.getDataValue('id')),
        isActive: true,
      },
      order: [['fullName', 'ASC']],
      limit: 100,
    });

    return ok(
      rows.map((u) => ({
        id: String(u.getDataValue('id')),
        fullName: String(u.getDataValue('fullName') ?? ''),
        email: String(u.getDataValue('email') ?? ''),
        whatsappPhone: (u.getDataValue('whatsappPhone') as string | null) ?? null,
      }))
    );
  }

  async seedCreatedForSale(
    saleId: string,
    empresaId: string,
    branchId: string,
    createdBy: string | null,
    transaction?: Transaction
  ): Promise<Result<void>> {
    await Sale.update(
      { deliveryStatus: 'CREATED', assignedDriverId: null },
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

  async listPending(
    empresaId: string,
    branchId: string,
    options?: { driverUserId?: string | null }
  ): Promise<Result<DeliveryQueueItem[]>> {
    const where: Record<string, unknown> = {
      empresaId,
      branchId,
      requiresDelivery: true,
      deliveryStatus: { [Op.notIn]: TERMINAL_DELIVERY_STATUSES },
    };

    const driverUserId = options?.driverUserId?.trim();
    if (driverUserId) {
      where.assignedDriverId = driverUserId;
      where.deliveryStatus = { [Op.in]: ['ASSIGNED', 'ON_ROUTE'] };
    }

    const rows = await Sale.findAll({
      where,
      include: [{ model: User, as: 'assignedDriver', attributes: ['fullName'], required: false }],
      order: [['createdAt', 'ASC']],
      limit: 100,
    });

    return ok(
      rows.map((s) => {
        const driver = s.get('assignedDriver') as { fullName?: string } | null | undefined;
        return {
          id: String(s.getDataValue('id')),
          saleNumber: String(s.getDataValue('id')).slice(0, 8).toUpperCase(),
          total: Number(s.getDataValue('total') ?? 0),
          deliveryStatus: String(s.getDataValue('deliveryStatus') ?? 'CREATED') as DeliveryStatus,
          deliveryCustomerName: s.getDataValue('deliveryCustomerName') as string | null,
          deliveryPhone: s.getDataValue('deliveryPhone') as string | null,
          deliveryAddress: s.getDataValue('deliveryAddress') as string | null,
          deliveryAmount: Number(s.getDataValue('deliveryAmount') ?? 0),
          assignedDriverId: (s.getDataValue('assignedDriverId') as string | null) ?? null,
          assignedDriverName: driver?.fullName ? String(driver.fullName) : null,
          createdAt: s.getDataValue('createdAt') as Date,
        };
      })
    );
  }

  async advanceStatus(input: {
    saleId: string;
    empresaId: string;
    branchId: string;
    status: string;
    note?: string | null;
    userId: string;
    assignedDriverId?: string | null;
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

    let driverNote: string | null = null;
    const updates: Partial<{ deliveryStatus: DeliveryStatus; assignedDriverId: string | null }> = {
      deliveryStatus: next,
    };

    if (next === 'ASSIGNED') {
      const driverId = String(input.assignedDriverId ?? '').trim();
      if (!driverId) {
        return fail('VALIDATION_ERROR: assignedDriverId required when assigning repartidor');
      }
      const driverResult = await this.resolveDriver(input.empresaId, input.branchId, driverId);
      if (!driverResult.success) return driverResult;
      updates.assignedDriverId = driverId;
      driverNote = `Repartidor: ${String(driverResult.value.getDataValue('fullName') ?? '')}`;
    }

    await sale.update(updates);

    const noteParts = [input.note?.trim(), driverNote].filter(Boolean);
    const event = await SaleDeliveryEvent.create({
      id: uuidv4(),
      saleId: input.saleId,
      empresaId: input.empresaId,
      branchId: input.branchId,
      status: next,
      note: noteParts.length > 0 ? noteParts.join(' · ') : null,
      createdBy: input.userId,
    });

    return ok({ deliveryStatus: next, event });
  }

  async getTimeline(
    saleId: string,
    empresaId: string,
    branchId: string
  ): Promise<
    Result<{
      deliveryStatus: DeliveryStatus | null;
      assignedDriverId: string | null;
      assignedDriverName: string | null;
      events: SaleDeliveryEvent[];
    }>
  > {
    const sale = await Sale.findOne({
      where: { id: saleId, empresaId, branchId, requiresDelivery: true },
      include: [{ model: User, as: 'assignedDriver', attributes: ['fullName'], required: false }],
    });
    if (!sale) return fail('SALE_NOT_FOUND');

    const events = await SaleDeliveryEvent.findAll({
      where: { saleId, empresaId },
      order: [['createdAt', 'ASC']],
    });

    const driver = sale.get('assignedDriver') as { fullName?: string } | null | undefined;
    const st = sale.getDataValue('deliveryStatus') as string | null;
    return ok({
      deliveryStatus: st ? (parseDeliveryStatus(st) as DeliveryStatus) : null,
      assignedDriverId: (sale.getDataValue('assignedDriverId') as string | null) ?? null,
      assignedDriverName: driver?.fullName ? String(driver.fullName) : null,
      events,
    });
  }
}

export default new DeliveryTrackingDelegate();
