import { v4 as uuidv4 } from 'uuid';
import { QueryTypes } from 'sequelize';
import sequelize from '../../../config/database';
import Product from '../models/Product.model';
import Category from '../models/Category.model';
import Supplier from '../models/Supplier.model';
import categoryDelegate from './CategoryDelegate';
import InventoryStock from '../../inventory/models/InventoryStock.model';
import Branch from '../../branch/models/Branch.model';
import { Result, ok, fail } from '../../../types/result';

export interface BranchStockInfo {
  stockId: string | null;
  quantity: number;
  minStock: number;
  inBranch: boolean;
}

export interface ProductWithBranchStock {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  price: number;
  unit: string;
  isActive: boolean;
  categoryId: string;
  supplierId: string;
  createdAt: Date;
  updatedAt: Date;
  category?: { id: string; name: string };
  supplier?: { id: string; name: string };
  stock: number;
  minStock: number;
  inBranch: boolean;
  stockRecordId: string | null;
}

export interface CreateProductInput {
  name: string;
  sku: string;
  categoryId: string;
  supplierId: string;
  price: number;
  description?: string;
  unit?: string;
  isActive?: boolean;
  initialStock?: number;
  minStock?: number;
}

export interface UpdateProductInput {
  name?: string;
  sku?: string;
  categoryId?: string;
  supplierId?: string;
  price?: number;
  description?: string | null;
  unit?: string;
  isActive?: boolean;
}

type BranchStockRow = {
  id: string;
  productId: string;
  quantity: number;
  minStock: number;
};

class CatalogProductDelegate {
  private resolveProductId(product: Product): string {
    return String(product.getDataValue('id') ?? product.id ?? '');
  }

  private readRowValue(row: Record<string, unknown>, ...keys: string[]): unknown {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null) return value;
    }
    return undefined;
  }

  private mapBranchStockRow(row: Record<string, unknown>): BranchStockRow | null {
    const productId = String(this.readRowValue(row, 'product_id', 'productId') ?? '');
    if (!productId) return null;
    return {
      id: String(this.readRowValue(row, 'id') ?? ''),
      productId,
      quantity: Number(this.readRowValue(row, 'quantity') ?? 0),
      minStock: Number(this.readRowValue(row, 'min_stock', 'minStock') ?? 0),
    };
  }

  async listByBranch(empresaId: string, branchId: string): Promise<Result<ProductWithBranchStock[]>> {
    const branch = await Branch.findOne({ where: { id: branchId, empresaId } });
    if (!branch) return fail('BRANCH_NOT_FOUND');

    const products = await Product.findAll({
      where: { empresaId },
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name'] },
        { model: Supplier, as: 'supplier', attributes: ['id', 'name'] },
      ],
      order: [['name', 'ASC']],
    });

    const productIds = products.map((p) => this.resolveProductId(p)).filter(Boolean);
    const stockRows =
      productIds.length > 0
        ? await sequelize.query<Record<string, unknown>>(
            `SELECT id, product_id, quantity, min_stock
             FROM inventory_stock
             WHERE empresa_id = :empresaId
               AND branch_id = :branchId
               AND product_id IN (:productIds)`,
            {
              replacements: { empresaId, branchId, productIds },
              type: QueryTypes.SELECT,
            }
          )
        : [];

    const stockByProductId = new Map<string, BranchStockRow>();
    for (const row of stockRows) {
      const mapped = this.mapBranchStockRow(row);
      if (!mapped) continue;
      stockByProductId.set(mapped.productId, mapped);
    }

    return ok(
      products.map((row) =>
        this.toProductWithBranchStock(row, stockByProductId.get(this.resolveProductId(row)))
      )
    );
  }

  async createWithBranchStock(
    empresaId: string,
    branchId: string,
    input: CreateProductInput
  ): Promise<Result<{ product: Product; inventory: InventoryStock }>> {
    const branch = await Branch.findOne({ where: { id: branchId, empresaId } });
    if (!branch) return fail('BRANCH_NOT_FOUND');

    const categoryCheck = await categoryDelegate.assertValidProductCategory(
      empresaId,
      input.categoryId
    );
    if (!categoryCheck.success) return categoryCheck;

    const supplier = await Supplier.findOne({ where: { id: input.supplierId, empresaId } });
    if (!supplier) return fail('SUPPLIER_NOT_FOUND');

    const initialStock = Number.isFinite(input.initialStock) ? Number(input.initialStock) : 0;
    const minStock = Number.isFinite(input.minStock) ? Number(input.minStock) : 0;

    if (initialStock < 0 || minStock < 0) {
      return fail('VALIDATION_ERROR: initialStock and minStock must be >= 0');
    }

    const transaction = await sequelize.transaction();
    try {
      const productId = uuidv4();
      const product = await Product.create(
        {
          id: productId,
          empresaId,
          name: input.name.trim(),
          sku: input.sku.trim(),
          categoryId: input.categoryId,
          supplierId: input.supplierId,
          price: input.price,
          description: input.description ?? null,
          unit: input.unit ?? 'unit',
          isActive: input.isActive !== false,
        },
        { transaction }
      );

      const resolvedProductId = String(product.getDataValue('id') ?? productId);
      if (!resolvedProductId) {
        await transaction.rollback();
        return fail('PRODUCT_CREATE_FAILED');
      }

      const inventory = await InventoryStock.create(
        {
          id: uuidv4(),
          empresaId,
          productId: resolvedProductId,
          branchId,
          quantity: initialStock,
          minStock,
        },
        { transaction }
      );

      await transaction.commit();

      await product.reload({
        include: [
          { model: Category, as: 'category', attributes: ['id', 'name'] },
          { model: Supplier, as: 'supplier', attributes: ['id', 'name'] },
        ],
      });

      return ok({ product, inventory });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async update(
    empresaId: string,
    productId: string,
    input: UpdateProductInput
  ): Promise<Result<Product>> {
    const product = await Product.findOne({ where: { id: productId, empresaId } });
    if (!product) return fail('PRODUCT_NOT_FOUND');

    const patch: Record<string, unknown> = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) return fail('VALIDATION_ERROR: name is required');
      patch.name = name;
    }

    if (input.sku !== undefined) {
      const sku = input.sku.trim();
      if (!sku) return fail('VALIDATION_ERROR: sku is required');
      patch.sku = sku;
    }

    if (input.categoryId !== undefined) {
      const categoryId = input.categoryId.trim();
      if (!categoryId) return fail('VALIDATION_ERROR: categoryId is required');
      const categoryCheck = await categoryDelegate.assertValidProductCategory(empresaId, categoryId);
      if (!categoryCheck.success) return categoryCheck;
      patch.categoryId = categoryId;
    }

    if (input.supplierId !== undefined) {
      const supplierId = input.supplierId.trim();
      if (!supplierId) return fail('VALIDATION_ERROR: supplierId is required');
      const supplier = await Supplier.findOne({ where: { id: supplierId, empresaId } });
      if (!supplier) return fail('SUPPLIER_NOT_FOUND');
      patch.supplierId = supplierId;
    }

    if (input.price !== undefined) {
      const price = Number(input.price);
      if (!Number.isFinite(price) || price <= 0) {
        return fail('VALIDATION_ERROR: price must be a positive number');
      }
      patch.price = price;
    }

    if (input.description !== undefined) {
      patch.description = input.description?.trim() || null;
    }

    if (input.unit !== undefined) {
      const unit = input.unit.trim();
      if (!unit) return fail('VALIDATION_ERROR: unit is required');
      patch.unit = unit;
    }

    if (input.isActive !== undefined) {
      patch.isActive = input.isActive;
    }

    if (Object.keys(patch).length === 0) {
      return fail('VALIDATION_ERROR: no fields to update');
    }

    await product.update(patch);
    await product.reload({
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name'] },
        { model: Supplier, as: 'supplier', attributes: ['id', 'name'] },
      ],
    });

    return ok(product);
  }

  private toProductWithBranchStock(
    product: Product,
    stockEntry?: BranchStockRow | null
  ): ProductWithBranchStock {
    const plain = product.get({ plain: true }) as ProductWithBranchStock & {
      category?: { id: string; name: string };
      supplier?: { id: string; name: string };
    };

    const branchStock: BranchStockInfo = {
      stockId: stockEntry?.id ?? null,
      quantity: stockEntry ? Number(stockEntry.quantity ?? 0) : 0,
      minStock: stockEntry ? Number(stockEntry.minStock ?? 0) : 0,
      inBranch: Boolean(stockEntry),
    };

    return {
      id: this.resolveProductId(product),
      name: String(product.getDataValue('name') ?? plain.name ?? ''),
      sku: String(product.getDataValue('sku') ?? plain.sku ?? ''),
      description: plain.description ?? null,
      price: Number(product.getDataValue('price') ?? plain.price ?? 0),
      unit: String(plain.unit ?? 'unit'),
      isActive: plain.isActive !== false,
      categoryId: plain.categoryId,
      supplierId: plain.supplierId,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      category: plain.category,
      supplier: plain.supplier,
      stock: branchStock.quantity,
      minStock: branchStock.minStock,
      inBranch: branchStock.inBranch,
      stockRecordId: branchStock.stockId,
    };
  }
}

export default new CatalogProductDelegate();
