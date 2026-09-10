import { v4 as uuidv4 } from 'uuid';
import TradeCustomer from '../models/TradeCustomer.model';
import { Result, ok, fail } from '../../../types/result';

export type TradeCustomerInput = {
  name: string;
  rut?: string | null;
  creditLimit?: number;
  isOverdue?: boolean;
  isActive?: boolean;
  notes?: string | null;
};

function toPlain(row: TradeCustomer) {
  const p = row.get({ plain: true }) as TradeCustomer;
  return {
    id: String(row.getDataValue('id') ?? p.id),
    empresaId: p.empresaId,
    name: p.name,
    rut: p.rut ?? null,
    creditLimit: Number(p.creditLimit ?? 0),
    creditUsed: Number(p.creditUsed ?? 0),
    isOverdue: p.isOverdue === true,
    isActive: p.isActive !== false,
    notes: p.notes ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

class TradeCustomerDelegate {
  async list(empresaId: string): Promise<Result<ReturnType<typeof toPlain>[]>> {
    const rows = await TradeCustomer.findAll({
      where: { empresaId },
      order: [['name', 'ASC']],
    });
    return ok(rows.map(toPlain));
  }

  async create(empresaId: string, input: TradeCustomerInput): Promise<Result<ReturnType<typeof toPlain>>> {
    const name = String(input.name ?? '').trim();
    if (!name) return fail('VALIDATION_ERROR: name is required');
    const row = await TradeCustomer.create({
      id: uuidv4(),
      empresaId,
      name,
      rut: input.rut?.trim() || null,
      creditLimit: Number(input.creditLimit) >= 0 ? Number(input.creditLimit) : 0,
      creditUsed: 0,
      isOverdue: Boolean(input.isOverdue),
      isActive: input.isActive !== false,
      notes: input.notes?.trim() || null,
    });
    return ok(toPlain(row));
  }

  async update(
    empresaId: string,
    id: string,
    input: TradeCustomerInput & { canManageCredit?: boolean }
  ): Promise<Result<ReturnType<typeof toPlain>>> {
    const row = await TradeCustomer.findOne({ where: { id, empresaId } });
    if (!row) return fail('CUSTOMER_NOT_FOUND');
    if (input.name !== undefined) {
      const name = String(input.name).trim();
      if (!name) return fail('VALIDATION_ERROR: name is required');
      row.name = name;
    }
    if (input.rut !== undefined) row.rut = input.rut?.trim() || null;
    if (input.notes !== undefined) row.notes = input.notes?.trim() || null;
    if (input.isActive !== undefined) row.isActive = input.isActive;
    if (input.canManageCredit) {
      if (input.creditLimit !== undefined) {
        const limit = Number(input.creditLimit);
        if (!Number.isFinite(limit) || limit < 0) return fail('VALIDATION_ERROR: creditLimit must be >= 0');
        row.creditLimit = limit;
      }
      if (input.isOverdue !== undefined) row.isOverdue = Boolean(input.isOverdue);
    }
    await row.save();
    return ok(toPlain(row));
  }
}

export default new TradeCustomerDelegate();
