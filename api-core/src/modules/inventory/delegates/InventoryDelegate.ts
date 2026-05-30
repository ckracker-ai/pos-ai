import { v4 as uuidv4 } from 'uuid';
import { literal, QueryTypes, Transaction } from 'sequelize';
import sequelize from '../../../config/database';
import InventoryStock from '../models/InventoryStock.model';
import Product from '../../catalog/models/Product.model';
import Branch from '../../branch/models/Branch.model';
import { Result, ok, fail } from '../../../types/result';

export interface StockRecord {
  id: string;
  productId: string;
  branchId: string;
  quantity: number;
  minStock: number;
  product?: {
    name: string;
    sku: string;
    price: number;
  };
}

export interface UpsertStockInput {
  productId: string;
  branchId: string;
  quantity: number;
  minStock: number;
}

export interface AdjustStockInput {
  productId: string;
  branchId: string;
  delta: number;
}

class InventoryDelegate {
  async getByBranch(empresaId: string, branchId: string): Promise<Result<StockRecord[]>> {
    const branch = await Branch.findOne({ where: { id: branchId, empresaId } });
    if (!branch) return fail('BRANCH_NOT_FOUND');

    const rows = await sequelize.query<Record<string, unknown>>(
      `SELECT
         s.id,
         s.product_id,
         s.branch_id,
         s.quantity,
         s.min_stock,
         p.name AS product_name,
         p.sku AS product_sku,
         p.price AS product_price
       FROM inventory_stock s
       LEFT JOIN products p ON p.id = s.product_id AND p.empresa_id = :empresaId
       WHERE s.empresa_id = :empresaId AND s.branch_id = :branchId`,
      { replacements: { empresaId, branchId }, type: QueryTypes.SELECT }
    );

    return ok(rows.map((row) => this.toPlainStock(this.toRecordFromRow(row))));
  }

  async getOne(empresaId: string, productId: string, branchId: string): Promise<Result<StockRecord>> {
    const rows = await sequelize.query<Record<string, unknown>>(
      `SELECT
         s.id,
         s.product_id,
         s.branch_id,
         s.quantity,
         s.min_stock,
         p.name AS product_name,
         p.sku AS product_sku,
         p.price AS product_price
       FROM inventory_stock s
       LEFT JOIN products p ON p.id = s.product_id AND p.empresa_id = :empresaId
       WHERE s.empresa_id = :empresaId
         AND s.product_id = :productId
         AND s.branch_id = :branchId
       LIMIT 1`,
      { replacements: { empresaId, productId, branchId }, type: QueryTypes.SELECT }
    );

    const row = rows[0];
    if (!row) return fail('STOCK_RECORD_NOT_FOUND');
    return ok(this.toPlainStock(this.toRecordFromRow(row)));
  }

  async upsert(empresaId: string, input: UpsertStockInput, transaction?: Transaction): Promise<Result<StockRecord>> {
    if (!input.productId?.trim()) {
      return fail('VALIDATION_ERROR: productId is required');
    }
    if (!input.branchId?.trim()) {
      return fail('VALIDATION_ERROR: branchId is required');
    }

    const product = await Product.findOne({ where: { id: input.productId, empresaId } });
    if (!product) return fail('PRODUCT_NOT_FOUND');

    const branch = await Branch.findOne({ where: { id: input.branchId, empresaId } });
    if (!branch) return fail('BRANCH_NOT_FOUND');

    const minStock = Number.isFinite(input.minStock) ? input.minStock : 0;
    const quantity = Number(input.quantity);

    if (!Number.isFinite(minStock) || minStock < 0) {
      return fail('VALIDATION_ERROR: minStock must be >= 0');
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      return fail('VALIDATION_ERROR: quantity must be >= 0');
    }

    const [entry, created] = await InventoryStock.findOrCreate({
      where: { empresaId, productId: input.productId, branchId: input.branchId },
      defaults: {
        id: uuidv4(),
        empresaId,
        productId: input.productId,
        branchId: input.branchId,
        quantity,
        minStock,
      },
      transaction,
    });

    if (!created) {
      await entry.update({ quantity, minStock }, { transaction });
    }

    const reloaded = await InventoryStock.findByPk(entry.id, {
      include: [{ model: Product, as: 'product', attributes: ['name', 'sku', 'price'] }],
      transaction,
    });

    return ok(this.toRecord(reloaded ?? entry));
  }

  /** Solo crea stock en sucursal; falla si el producto ya está asignado a esa sucursal. */
  async addProductToBranch(empresaId: string, input: UpsertStockInput): Promise<Result<StockRecord>> {
    if (!input.productId?.trim()) {
      return fail('VALIDATION_ERROR: productId is required');
    }
    if (!input.branchId?.trim()) {
      return fail('VALIDATION_ERROR: branchId is required');
    }

    const product = await Product.findOne({ where: { id: input.productId, empresaId } });
    if (!product) return fail('PRODUCT_NOT_FOUND');

    const branch = await Branch.findOne({ where: { id: input.branchId, empresaId } });
    if (!branch) return fail('BRANCH_NOT_FOUND');

    const existing = await InventoryStock.findOne({
      where: { empresaId, productId: input.productId, branchId: input.branchId },
    });
    if (existing) return fail('STOCK_ALREADY_IN_BRANCH');

    const minStock = Number.isFinite(input.minStock) ? input.minStock : 0;
    const quantity = Number(input.quantity);
    if (!Number.isFinite(minStock) || minStock < 0) {
      return fail('VALIDATION_ERROR: minStock must be >= 0');
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      return fail('VALIDATION_ERROR: quantity must be >= 0');
    }

    const entry = await InventoryStock.create({
      id: uuidv4(),
      empresaId,
      productId: input.productId,
      branchId: input.branchId,
      quantity,
      minStock,
    });

    const reloaded = await InventoryStock.findByPk(entry.id, {
      include: [{ model: Product, as: 'product', attributes: ['name', 'sku', 'price'] }],
    });

    return ok(this.toRecord(reloaded ?? entry));
  }

  async adjust(empresaId: string, input: AdjustStockInput): Promise<Result<StockRecord>> {
    if (!input.productId?.trim()) {
      return fail('VALIDATION_ERROR: productId is required');
    }
    if (!input.branchId?.trim()) {
      return fail('VALIDATION_ERROR: branchId is required');
    }

    const delta = Number(input.delta);
    if (!Number.isFinite(delta) || delta === 0) {
      return fail('VALIDATION_ERROR: delta must be a non-zero number');
    }

    const entry = await InventoryStock.findOne({
      where: { empresaId, productId: input.productId, branchId: input.branchId },
    });
    if (!entry) return fail('STOCK_RECORD_NOT_FOUND');

    const newQty = entry.quantity + delta;
    if (newQty < 0) {
      return fail(`INSUFFICIENT_STOCK: available ${entry.quantity}, requested ${Math.abs(delta)}`);
    }

    await entry.update({ quantity: newQty });

    const reloaded = await InventoryStock.findByPk(entry.id, {
      include: [{ model: Product, as: 'product', attributes: ['name', 'sku', 'price'] }],
    });

    return ok(this.toRecord(reloaded ?? entry));
  }

  async getLowStock(empresaId: string, branchId: string): Promise<Result<StockRecord[]>> {
    const branch = await Branch.findOne({ where: { id: branchId, empresaId } });
    if (!branch) return fail('BRANCH_NOT_FOUND');

    const entries = await InventoryStock.findAll({
      where: {
        empresaId,
        branchId,
        [Symbol.for('sequelize.and')]: [literal('quantity <= min_stock')],
      },
      include: [{ model: Product, as: 'product', attributes: ['name', 'sku', 'price'] }],
    });

    return ok(entries.map(this.toRecord));
  }

  private toRecord(entry: InventoryStock): StockRecord {
    const raw = entry as unknown as { product?: { name: string; sku: string; price: number } };
    return {
      id: entry.id,
      productId: entry.productId,
      branchId: entry.branchId,
      quantity: entry.quantity,
      minStock: entry.minStock,
      product: raw.product
        ? { name: raw.product.name, sku: raw.product.sku, price: raw.product.price }
        : undefined,
    };
  }

  private readRowValue(row: Record<string, unknown>, ...keys: string[]): unknown {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null) return value;
    }
    return undefined;
  }

  private toRecordFromRow(row: Record<string, unknown>): StockRecord {
    const productName = this.readRowValue(row, 'product_name', 'productName', 'name');
    const productSku = this.readRowValue(row, 'product_sku', 'productSku', 'sku');

    return {
      id: String(this.readRowValue(row, 'id') ?? ''),
      productId: String(this.readRowValue(row, 'product_id', 'productId') ?? ''),
      branchId: String(this.readRowValue(row, 'branch_id', 'branchId') ?? ''),
      quantity: Number(this.readRowValue(row, 'quantity') ?? 0),
      minStock: Number(this.readRowValue(row, 'min_stock', 'minStock') ?? 0),
      product: productName
        ? {
            name: String(productName),
            sku: String(productSku ?? ''),
            price: Number(this.readRowValue(row, 'product_price', 'productPrice', 'price') ?? 0),
          }
        : undefined,
    };
  }

  /** Evita respuestas tipo `{ product: {} }` por instancias Sequelize al serializar JSON. */
  private toPlainStock(record: StockRecord): StockRecord {
    return {
      id: record.id,
      productId: record.productId,
      branchId: record.branchId,
      quantity: record.quantity,
      minStock: record.minStock,
      ...(record.product
        ? {
            product: {
              name: record.product.name,
              sku: record.product.sku,
              price: record.product.price,
            },
          }
        : {}),
    };
  }
}

export default new InventoryDelegate();
