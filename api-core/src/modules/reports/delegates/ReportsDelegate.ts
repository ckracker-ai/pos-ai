import { Op, fn, col, QueryTypes } from 'sequelize';
import sequelize from '../../../config/database';
import Sale from '../../sales/models/Sale.model';
import Branch from '../../branch/models/Branch.model';
import User from '../../auth/models/User.model';
import { Result, ok, fail } from '../../../types/result';

export interface ReportsSummary {
  totalRevenue: number;
  todayRevenue: number;
  totalSales: number;
  todaySales: number;
  activeBranches: number;
  registeredUsers: number;
  scope: 'branch' | 'global';
  branchId: string | null;
}

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
  salesCount: number;
}

export interface LowStockAlert {
  productId: string;
  productName: string;
  branchId: string;
  branchName: string;
  quantity: number;
  minStock: number;
}

export interface SaleReportRow {
  id: string;
  date: string;
  branchId: string;
  branchName: string;
  total: number;
  discount: number;
  status: string;
  notes: string | null;
}

export interface InventoryReportRow {
  productId: string;
  productName: string;
  sku: string;
  branchId: string;
  branchName: string;
  quantity: number;
  minStock: number;
  price: number;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function saleWhere(branchId: string | null) {
  const base = { status: { [Op.ne]: 'CANCELLED' as const } };
  return branchId ? { ...base, branchId } : base;
}

/** Fecha segura: ventas antiguas pueden tener created_at NULL o no hidratado por Sequelize. */
function readRowValue(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

class ReportsDelegate {
  async getSummary(branchId: string | null): Promise<Result<ReportsSummary>> {
    const where = saleWhere(branchId);
    const today = startOfToday();

    const [totalRevenueRaw, todayRevenueRaw, totalSales, todaySales, activeBranches, registeredUsers] =
      await Promise.all([
        Sale.sum('total', { where }),
        Sale.sum('total', { where: { ...where, createdAt: { [Op.gte]: today } } }),
        Sale.count({ where }),
        Sale.count({ where: { ...where, createdAt: { [Op.gte]: today } } }),
        Branch.count({ where: { isActive: true } }),
        User.count({ where: { isActive: true } }),
      ]);

    return ok({
      totalRevenue: Number(totalRevenueRaw ?? 0),
      todayRevenue: Number(todayRevenueRaw ?? 0),
      totalSales: Number(totalSales ?? 0),
      todaySales: Number(todaySales ?? 0),
      activeBranches: Number(activeBranches ?? 0),
      registeredUsers: Number(registeredUsers ?? 0),
      scope: branchId ? 'branch' : 'global',
      branchId,
    });
  }

  async getRevenueTrend(
    branchId: string | null,
    days = 30
  ): Promise<Result<RevenueTrendPoint[]>> {
    const from = daysAgo(days - 1);
    const where = {
      ...saleWhere(branchId),
      createdAt: { [Op.gte]: from },
    };

    const rows = (await Sale.findAll({
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('SUM', col('total')), 'revenue'],
        [fn('COUNT', col('id')), 'salesCount'],
      ],
      where,
      group: [fn('DATE', col('created_at'))],
      order: [[fn('DATE', col('created_at')), 'ASC']],
      raw: true,
    })) as unknown as Array<{ date: string; revenue: string; salesCount: string }>;

    const byDate = new Map<string, RevenueTrendPoint>();
    for (const row of rows) {
      const dateKey = String(row.date).slice(0, 10);
      byDate.set(dateKey, {
        date: dateKey,
        revenue: Number(row.revenue ?? 0),
        salesCount: Number(row.salesCount ?? 0),
      });
    }

    const points: RevenueTrendPoint[] = [];
    for (let i = 0; i < days; i++) {
      const d = daysAgo(days - 1 - i);
      const key = d.toISOString().slice(0, 10);
      points.push(byDate.get(key) ?? { date: key, revenue: 0, salesCount: 0 });
    }

    return ok(points);
  }

  async getLowStockAlerts(
    branchId: string | null,
    limit = 20
  ): Promise<Result<LowStockAlert[]>> {
    try {
      const branchClause = branchId ? 'WHERE s.branch_id = :branchId' : '';
      const rows = await sequelize.query<Record<string, unknown>>(
        `SELECT
           s.product_id,
           s.branch_id,
           s.quantity,
           s.min_stock,
           p.name AS product_name,
           b.name AS branch_name
         FROM inventory_stock s
         LEFT JOIN products p ON p.id = s.product_id
         LEFT JOIN branches b ON b.id = s.branch_id
         ${branchClause}
         ORDER BY s.quantity ASC`,
        {
          replacements: branchId ? { branchId } : {},
          type: QueryTypes.SELECT,
        }
      );

      const alerts: LowStockAlert[] = [];
      for (const row of rows) {
        const qty = Number(readRowValue(row, 'quantity') ?? 0);
        const min = Number(readRowValue(row, 'min_stock', 'minStock') ?? 0);
        const threshold = min > 0 ? min : 5;
        if (!Number.isFinite(qty) || qty > threshold) continue;

        alerts.push({
          productId: String(readRowValue(row, 'product_id', 'productId') ?? ''),
          productName: String(readRowValue(row, 'product_name', 'productName') ?? 'Producto'),
          branchId: String(readRowValue(row, 'branch_id', 'branchId') ?? ''),
          branchName: String(readRowValue(row, 'branch_name', 'branchName') ?? 'Sucursal'),
          quantity: qty,
          minStock: min,
        });
      }

      alerts.sort((a, b) => a.quantity - b.quantity);
      return ok(alerts.slice(0, limit));
    } catch (error) {
      console.error('[Reports] getLowStockAlerts failed', error);
      return fail('ERROR_FETCHING_LOW_STOCK');
    }
  }

  async getSalesTable(branchId: string | null, limit = 200): Promise<Result<SaleReportRow[]>> {
    try {
      const branchClause = branchId ? 'AND s.branch_id = :branchId' : '';
      const saleRows = await sequelize.query<Record<string, unknown>>(
        `SELECT
           s.id,
           s.branch_id,
           s.total,
           s.discount,
           s.status,
           s.notes,
           s.created_at,
           b.name AS branch_name
         FROM sales s
         LEFT JOIN branches b ON b.id = s.branch_id
         WHERE s.status <> 'CANCELLED'
           ${branchClause}
         ORDER BY s.created_at DESC
         LIMIT :limit`,
        {
          replacements: { branchId, limit },
          type: QueryTypes.SELECT,
        }
      );

      const rows: SaleReportRow[] = saleRows.map((row) => {
        const createdRaw = readRowValue(row, 'created_at', 'createdAt');
        let date: string;
        if (createdRaw instanceof Date && !Number.isNaN(createdRaw.getTime())) {
          date = createdRaw.toISOString();
        } else if (typeof createdRaw === 'string' && createdRaw.trim()) {
          const parsed = new Date(createdRaw);
          date = Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
        } else {
          date = new Date().toISOString();
        }

        const branchName = readRowValue(row, 'branch_name', 'branchName');
        const branchIdValue = readRowValue(row, 'branch_id', 'branchId');

        return {
          id: String(readRowValue(row, 'id') ?? ''),
          date,
          branchId: String(branchIdValue ?? ''),
          branchName: String(branchName ?? branchIdValue ?? 'Sucursal'),
          total: Number(readRowValue(row, 'total') ?? 0),
          discount: Number(readRowValue(row, 'discount') ?? 0),
          status: String(readRowValue(row, 'status') ?? ''),
          notes: (readRowValue(row, 'notes') ?? null) as string | null,
        };
      });

      return ok(rows);
    } catch (error) {
      console.error('[Reports] getSalesTable failed', error);
      return fail('ERROR_FETCHING_SALES_REPORT');
    }
  }

  async getInventoryTable(branchId: string | null): Promise<Result<InventoryReportRow[]>> {
    try {
      const branchClause = branchId ? 'WHERE s.branch_id = :branchId' : '';
      const stockRows = await sequelize.query<Record<string, unknown>>(
        `SELECT
           s.product_id,
           s.branch_id,
           s.quantity,
           s.min_stock,
           p.name AS product_name,
           p.sku AS product_sku,
           p.price AS product_price,
           b.name AS branch_name
         FROM inventory_stock s
         LEFT JOIN products p ON p.id = s.product_id
         LEFT JOIN branches b ON b.id = s.branch_id
         ${branchClause}
         ORDER BY s.quantity ASC`,
        {
          replacements: branchId ? { branchId } : {},
          type: QueryTypes.SELECT,
        }
      );

      const rows: InventoryReportRow[] = stockRows.map((row) => ({
        productId: String(readRowValue(row, 'product_id', 'productId') ?? ''),
        productName: String(readRowValue(row, 'product_name', 'productName') ?? 'Producto'),
        sku: String(readRowValue(row, 'product_sku', 'sku') ?? ''),
        branchId: String(readRowValue(row, 'branch_id', 'branchId') ?? ''),
        branchName: String(readRowValue(row, 'branch_name', 'branchName') ?? 'Sucursal'),
        quantity: Number(readRowValue(row, 'quantity') ?? 0),
        minStock: Number(readRowValue(row, 'min_stock', 'minStock') ?? 0),
        price: Number(readRowValue(row, 'product_price', 'price') ?? 0),
      }));

      return ok(rows);
    } catch (error) {
      console.error('[Reports] getInventoryTable failed', error);
      return fail('ERROR_FETCHING_INVENTORY_REPORT');
    }
  }
}

export default new ReportsDelegate();
