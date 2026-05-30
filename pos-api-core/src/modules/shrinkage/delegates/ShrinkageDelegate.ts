import { v4 as uuidv4 } from 'uuid';
import sequelize from '../../../config/database';
import Shrinkage from '../models/Shrinkage.model';
import Product from '../../catalog/models/Product.model';
import InventoryStock from '../../inventory/models/InventoryStock.model';
import { Result, ok, fail } from '../../../types/result';

export interface ShrinkageRecord {
  id: string;
  productId: string;
  branchId: string;
  reportedBy: string;
  approvedBy: string | null;
  quantity: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  product?: { id: string; name: string; sku: string };
}

export interface CreateShrinkageLine {
  productId: string;
  quantity: number;
}

class ShrinkageDelegate {
  private branchKey(branchId: string): string {
    return String(branchId ?? '')
      .trim()
      .toLowerCase();
  }

  private isAuditorRole(roleName?: string): boolean {
    const role = String(roleName ?? '').toUpperCase();
    return role === 'ADMIN' || role === 'AUDITOR';
  }

  private async resolvePendingShrinkage(
    shrinkageId: string,
    empresaId: string,
    activeBranchId: string,
    roleName?: string
  ): Promise<Result<Shrinkage>> {
    const id = String(shrinkageId ?? '').trim();
    if (!id) return fail('SHRINKAGE_NOT_FOUND');

    const shrinkage = await Shrinkage.findOne({ where: { id, empresaId } });
    if (!shrinkage) return fail('SHRINKAGE_NOT_FOUND');

    if (shrinkage.status !== 'PENDING') {
      return fail('SHRINKAGE_NOT_PENDING');
    }

    const rowBranch = this.branchKey(shrinkage.branchId);
    const headerBranch = this.branchKey(activeBranchId);

    if (rowBranch !== headerBranch && !this.isAuditorRole(roleName)) {
      return fail('SHRINKAGE_BRANCH_MISMATCH');
    }

    return ok(shrinkage);
  }

  async listByBranch(empresaId: string, branchId: string): Promise<Result<ShrinkageRecord[]>> {
    const rows = await Shrinkage.findAll({
      where: { empresaId, branchId },
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }],
      order: [['createdAt', 'DESC']],
    });
    return ok(rows.map((row) => this.toRecord(row)));
  }

  async listByBranchAndStatus(
    empresaId: string,
    branchId: string,
    status: string
  ): Promise<Result<ShrinkageRecord[]>> {
    const rows = await Shrinkage.findAll({
      where: { empresaId, branchId, status },
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }],
      order: [['createdAt', 'DESC']],
    });
    return ok(rows.map((row) => this.toRecord(row)));
  }

  async createPending(
    empresaId: string,
    branchId: string,
    reportedBy: string,
    reason: string,
    lines: CreateShrinkageLine[]
  ): Promise<Result<ShrinkageRecord[]>> {
    if (!lines.length) return fail('VALIDATION_ERROR: at least one product line is required');

    const transaction = await sequelize.transaction();
    try {
      const created: Shrinkage[] = [];

      for (const line of lines) {
        const product = await Product.findOne({
          where: { id: line.productId, empresaId },
          transaction,
        });
        if (!product) {
          await transaction.rollback();
          return fail(`PRODUCT_NOT_FOUND:${line.productId}`);
        }

        const quantity = Number(line.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          await transaction.rollback();
          return fail('VALIDATION_ERROR: quantity must be greater than zero');
        }

        const stock = await InventoryStock.findOne({
          where: { empresaId, productId: line.productId, branchId },
          transaction,
        });
        if (!stock) {
          await transaction.rollback();
          return fail(`STOCK_RECORD_NOT_FOUND:${line.productId}`);
        }

        const shrinkage = await Shrinkage.create(
          {
            id: uuidv4(),
            empresaId,
            productId: line.productId,
            branchId,
            reportedBy,
            quantity,
            reason,
            status: 'PENDING',
          },
          { transaction }
        );
        created.push(shrinkage);
      }

      await transaction.commit();

      const withProduct = await Shrinkage.findAll({
        where: { id: created.map((s) => s.id) },
        include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }],
      });

      return ok(withProduct.map((row) => this.toRecord(row)));
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async approve(
    shrinkageId: string,
    empresaId: string,
    branchId: string,
    approverId: string,
    roleName?: string
  ): Promise<Result<ShrinkageRecord>> {
    const pending = await this.resolvePendingShrinkage(shrinkageId, empresaId, branchId, roleName);
    if (!pending.success) return pending;

    const transaction = await sequelize.transaction();
    try {
      const shrinkage = await Shrinkage.findByPk(pending.value.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!shrinkage) {
        await transaction.rollback();
        return fail('SHRINKAGE_NOT_FOUND');
      }

      const shrinkageQty = Number(shrinkage.quantity);
      if (!Number.isFinite(shrinkageQty) || shrinkageQty <= 0) {
        await transaction.rollback();
        return fail('VALIDATION_ERROR: quantity must be greater than zero');
      }

      const stockBranchId = shrinkage.branchId;
      const stock = await InventoryStock.findOne({
        where: { empresaId, productId: shrinkage.productId, branchId: stockBranchId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!stock) {
        await transaction.rollback();
        return fail('STOCK_RECORD_NOT_FOUND');
      }

      const nextQty = Number(stock.quantity) - Number(shrinkage.quantity);
      if (nextQty < 0) {
        await transaction.rollback();
        return fail(
          `INSUFFICIENT_STOCK: available ${stock.quantity}, requested ${shrinkage.quantity}`
        );
      }

      await stock.update({ quantity: nextQty }, { transaction });
      await shrinkage.update(
        { status: 'APPROVED', approvedBy: approverId, rejectionNote: null },
        { transaction }
      );

      await transaction.commit();

      const reloaded = await Shrinkage.findByPk(shrinkage.id, {
        include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }],
      });

      return ok(this.toRecord(reloaded!));
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async reject(
    shrinkageId: string,
    empresaId: string,
    branchId: string,
    approverId: string,
    rejectionNote?: string,
    roleName?: string
  ): Promise<Result<ShrinkageRecord>> {
    const pending = await this.resolvePendingShrinkage(shrinkageId, empresaId, branchId, roleName);
    if (!pending.success) return pending;

    const shrinkage = pending.value;

    await shrinkage.update({
      status: 'REJECTED',
      approvedBy: approverId,
      rejectionNote: rejectionNote?.trim() || null,
    });

    const reloaded = await Shrinkage.findByPk(shrinkage.id, {
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }],
    });

    return ok(this.toRecord(reloaded!));
  }

  private toRecord(row: Shrinkage): ShrinkageRecord {
    const raw = row as unknown as {
      product?: { id: string; name: string; sku: string };
    };

    return {
      id: row.id,
      productId: row.productId,
      branchId: row.branchId,
      reportedBy: row.reportedBy,
      approvedBy: row.approvedBy ?? null,
      quantity: row.quantity,
      reason: row.reason,
      status: row.status,
      rejectionNote: row.rejectionNote ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      product: raw.product,
    };
  }
}

export default new ShrinkageDelegate();
