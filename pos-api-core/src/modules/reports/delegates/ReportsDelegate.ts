import { Op, fn, col, QueryTypes } from 'sequelize';
import sequelize from '../../../config/database';
import Sale from '../../sales/models/Sale.model';
import Branch from '../../branch/models/Branch.model';
import User from '../../auth/models/User.model';
import { Result, ok, fail } from '../../../types/result';
import { computeReorderDraftQty, santiagoHour } from '../operationalLearning';

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
  requiresDelivery: boolean;
  deliveryAmount: number;
  deliveryAddress: string | null;
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
  categoryId: string | null;
  categoryName: string | null;
  categoryPrincipalId: string | null;
  categoryPrincipalName: string | null;
}

export interface ShrinkageReportSummary {
  pending: number;
  approved: number;
  rejected: number;
  pendingQuantity: number;
  approvedQuantity: number;
  rejectedQuantity: number;
}

export interface ShrinkageReportRow {
  id: string;
  date: string;
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reportedByName: string;
  reviewedByName: string | null;
  rejectionNote: string | null;
}

export interface ShrinkageReportPayload {
  summary: ShrinkageReportSummary;
  shrinkages: ShrinkageReportRow[];
}

export interface HotSkuRow {
  productId: string;
  name: string;
  sku: string | null;
  qtySold: number;
  hour: number;
  fallback: boolean;
}

export interface ReorderDraftRow {
  productId: string;
  productName: string;
  sku: string | null;
  branchId: string;
  branchName: string;
  quantity: number;
  minStock: number;
  qtySold7d: number;
  suggestedQty: number;
  status: 'DRAFT';
}

export interface BusinessInsightsPayload {
  mix7d: Array<{ productName: string; qtySold: number }>;
  peakHour: number | null;
  peakSaleCount: number;
  mermaQty7d: number;
  mermaQty28d: number;
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

function saleWhere(empresaId: string, branchId: string | null) {
  const base = { empresaId, status: { [Op.ne]: 'CANCELLED' as const } };
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
  async getSummary(empresaId: string, branchId: string | null): Promise<Result<ReportsSummary>> {
    const where = saleWhere(empresaId, branchId);
    const today = startOfToday();

    const [totalRevenueRaw, todayRevenueRaw, totalSales, todaySales, activeBranches, registeredUsers] =
      await Promise.all([
        Sale.sum('total', { where }),
        Sale.sum('total', { where: { ...where, createdAt: { [Op.gte]: today } } }),
        Sale.count({ where }),
        Sale.count({ where: { ...where, createdAt: { [Op.gte]: today } } }),
        Branch.count({ where: { isActive: true, empresaId } }),
        User.count({ where: { isActive: true, empresaId } }),
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
    empresaId: string,
    branchId: string | null,
    days = 30
  ): Promise<Result<RevenueTrendPoint[]>> {
    const from = daysAgo(days - 1);
    const where = {
      ...saleWhere(empresaId, branchId),
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
    empresaId: string,
    branchId: string | null,
    limit = 20
  ): Promise<Result<LowStockAlert[]>> {
    try {
      const branchClause = branchId
        ? 'WHERE s.empresa_id = :empresaId AND s.branch_id = :branchId'
        : 'WHERE s.empresa_id = :empresaId';
      const rows = await sequelize.query<Record<string, unknown>>(
        `SELECT
           s.product_id,
           s.branch_id,
           s.quantity,
           s.min_stock,
           p.name AS product_name,
           b.name AS branch_name
         FROM inventory_stock s
         LEFT JOIN products p ON p.id = s.product_id AND p.empresa_id = :empresaId
         LEFT JOIN branches b ON b.id = s.branch_id AND b.empresa_id = :empresaId
         ${branchClause}
         ORDER BY s.quantity ASC`,
        {
          replacements: branchId ? { empresaId, branchId } : { empresaId },
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

  async getSalesTable(
    empresaId: string,
    branchId: string | null,
    limit = 200
  ): Promise<Result<SaleReportRow[]>> {
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
           s.requires_delivery,
           s.delivery_amount,
           s.delivery_address,
           s.created_at,
           b.name AS branch_name
         FROM sales s
         LEFT JOIN branches b ON b.id = s.branch_id AND b.empresa_id = :empresaId
         WHERE s.empresa_id = :empresaId
           AND s.status <> 'CANCELLED'
           ${branchClause}
         ORDER BY s.created_at DESC
         LIMIT :limit`,
        {
          replacements: { empresaId, branchId, limit },
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
          requiresDelivery: Boolean(
            readRowValue(row, 'requires_delivery', 'requiresDelivery')
          ),
          deliveryAmount: Number(readRowValue(row, 'delivery_amount', 'deliveryAmount') ?? 0),
          deliveryAddress: (readRowValue(row, 'delivery_address', 'deliveryAddress') ??
            null) as string | null,
        };
      });

      return ok(rows);
    } catch (error) {
      console.error('[Reports] getSalesTable failed', error);
      return fail('ERROR_FETCHING_SALES_REPORT');
    }
  }

  async getInventoryTable(
    empresaId: string,
    branchId: string | null
  ): Promise<Result<InventoryReportRow[]>> {
    try {
      const branchClause = branchId
        ? 'WHERE s.empresa_id = :empresaId AND s.branch_id = :branchId'
        : 'WHERE s.empresa_id = :empresaId';
      const stockRows = await sequelize.query<Record<string, unknown>>(
        `SELECT
           s.product_id,
           s.branch_id,
           s.quantity,
           s.min_stock,
           p.name AS product_name,
           p.sku AS product_sku,
           p.price AS product_price,
           p.category_id,
           c.name AS category_name,
           c.parent_id AS category_parent_id,
           COALESCE(pc.name, c.name) AS category_principal_name,
           COALESCE(pc.id, c.id) AS category_principal_id,
           b.name AS branch_name
         FROM inventory_stock s
         LEFT JOIN products p ON p.id = s.product_id AND p.empresa_id = :empresaId
         LEFT JOIN categories c ON c.id = p.category_id AND c.empresa_id = :empresaId
         LEFT JOIN categories pc ON pc.id = c.parent_id AND pc.empresa_id = :empresaId
         LEFT JOIN branches b ON b.id = s.branch_id AND b.empresa_id = :empresaId
         ${branchClause}
         ORDER BY s.quantity ASC`,
        {
          replacements: branchId ? { empresaId, branchId } : { empresaId },
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
        categoryId: (readRowValue(row, 'category_id', 'categoryId') ?? null) as string | null,
        categoryName: (readRowValue(row, 'category_name', 'categoryName') ?? null) as
          | string
          | null,
        categoryPrincipalId: (readRowValue(
          row,
          'category_principal_id',
          'categoryPrincipalId'
        ) ?? null) as string | null,
        categoryPrincipalName: (readRowValue(
          row,
          'category_principal_name',
          'categoryPrincipalName'
        ) ?? null) as string | null,
      }));

      return ok(rows);
    } catch (error) {
      console.error('[Reports] getInventoryTable failed', error);
      return fail('ERROR_FETCHING_INVENTORY_REPORT');
    }
  }

  async getShrinkageReport(
    empresaId: string,
    branchId: string | null,
    options?: { status?: string; limit?: number }
  ): Promise<Result<ShrinkageReportPayload>> {
    try {
      const branchClause = branchId
        ? 'WHERE sh.empresa_id = :empresaId AND sh.branch_id = :branchId'
        : 'WHERE sh.empresa_id = :empresaId';
      const branchAnd = branchId ? 'AND sh.branch_id = :branchId' : '';

      const summaryRows = await sequelize.query<Record<string, unknown>>(
        `SELECT sh.status, COUNT(*) AS cnt, COALESCE(SUM(sh.quantity), 0) AS qty
         FROM shrinkages sh
         ${branchClause}
         GROUP BY sh.status`,
        {
          replacements: branchId ? { empresaId, branchId } : { empresaId },
          type: QueryTypes.SELECT,
        }
      );

      const summary: ShrinkageReportSummary = {
        pending: 0,
        approved: 0,
        rejected: 0,
        pendingQuantity: 0,
        approvedQuantity: 0,
        rejectedQuantity: 0,
      };

      for (const row of summaryRows) {
        const status = String(readRowValue(row, 'status') ?? '').toUpperCase();
        const cnt = Number(readRowValue(row, 'cnt') ?? 0);
        const qty = Number(readRowValue(row, 'qty') ?? 0);
        if (status === 'PENDING') {
          summary.pending = cnt;
          summary.pendingQuantity = qty;
        } else if (status === 'APPROVED') {
          summary.approved = cnt;
          summary.approvedQuantity = qty;
        } else if (status === 'REJECTED') {
          summary.rejected = cnt;
          summary.rejectedQuantity = qty;
        }
      }

      const statusFilter = String(options?.status ?? 'ALL').toUpperCase();
      const statusClause =
        statusFilter !== 'ALL' && ['PENDING', 'APPROVED', 'REJECTED'].includes(statusFilter)
          ? 'AND sh.status = :statusFilter'
          : '';

      const limit = Math.min(500, Math.max(10, Number(options?.limit ?? 300)));

      const shrinkageRows = await sequelize.query<Record<string, unknown>>(
        `SELECT
           sh.id,
           sh.branch_id,
           sh.product_id,
           sh.quantity,
           sh.reason,
           sh.status,
           sh.rejection_note,
           sh.created_at,
           p.name AS product_name,
           p.sku AS product_sku,
           b.name AS branch_name,
           rep.full_name AS reported_by_name,
           rev.full_name AS reviewed_by_name
         FROM shrinkages sh
         LEFT JOIN products p ON p.id = sh.product_id
         LEFT JOIN branches b ON b.id = sh.branch_id
         LEFT JOIN users rep ON rep.id = sh.reported_by
         LEFT JOIN users rev ON rev.id = sh.approved_by
         WHERE sh.empresa_id = :empresaId
           ${branchAnd}
           ${statusClause}
         ORDER BY sh.created_at DESC
         LIMIT :limit`,
        {
          replacements: {
            empresaId,
            ...(branchId ? { branchId } : {}),
            ...(statusClause ? { statusFilter } : {}),
            limit,
          },
          type: QueryTypes.SELECT,
        }
      );

      const shrinkages: ShrinkageReportRow[] = shrinkageRows.map((row) => {
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

        return {
          id: String(readRowValue(row, 'id') ?? ''),
          date,
          branchId: String(readRowValue(row, 'branch_id', 'branchId') ?? ''),
          branchName: String(readRowValue(row, 'branch_name', 'branchName') ?? 'Sucursal'),
          productId: String(readRowValue(row, 'product_id', 'productId') ?? ''),
          productName: String(readRowValue(row, 'product_name', 'productName') ?? 'Producto'),
          productSku: String(readRowValue(row, 'product_sku', 'productSku', 'sku') ?? ''),
          quantity: Number(readRowValue(row, 'quantity') ?? 0),
          reason: String(readRowValue(row, 'reason') ?? ''),
          status: String(readRowValue(row, 'status') ?? 'PENDING').toUpperCase() as
            | 'PENDING'
            | 'APPROVED'
            | 'REJECTED',
          reportedByName: String(readRowValue(row, 'reported_by_name', 'reportedByName') ?? '—'),
          reviewedByName: (() => {
            const v = readRowValue(row, 'reviewed_by_name', 'reviewedByName');
            return v != null && String(v).trim() ? String(v) : null;
          })(),
          rejectionNote: (() => {
            const v = readRowValue(row, 'rejection_note', 'rejectionNote');
            return v != null && String(v).trim() ? String(v) : null;
          })(),
        };
      });

      return ok({ summary, shrinkages });
    } catch (error) {
      console.error('[Reports] getShrinkageReport failed', error);
      return fail('ERROR_FETCHING_SHRINKAGE_REPORT');
    }
  }

  async getHotSkus(
    empresaId: string,
    branchId: string | null,
    hourInput?: number
  ): Promise<Result<{ hour: number; items: HotSkuRow[] }>> {
    const hour =
      Number.isFinite(hourInput) && hourInput != null
        ? Math.min(23, Math.max(0, Math.trunc(hourInput)))
        : santiagoHour();
    if (!branchId) {
      return ok({ hour, items: [] });
    }
    try {
      const run = async (restrictHour: boolean) => {
        const hourClause = restrictHour
          ? 'AND HOUR(CONVERT_TZ(s.created_at, \'+00:00\', \'-03:00\')) = :hour'
          : '';
        return sequelize.query<Record<string, unknown>>(
          `SELECT
             d.product_id,
             p.name AS product_name,
             p.sku,
             SUM(d.quantity) AS qty_sold
           FROM sale_details d
           INNER JOIN sales s ON s.id = d.sale_id
           INNER JOIN products p ON p.id = d.product_id AND p.empresa_id = s.empresa_id
           WHERE s.empresa_id = :empresaId
             AND s.branch_id = :branchId
             AND s.status = 'COMPLETED'
             AND s.created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 28 DAY)
             ${hourClause}
           GROUP BY d.product_id, p.name, p.sku
           ORDER BY qty_sold DESC
           LIMIT 8`,
          {
            replacements: { empresaId, branchId, hour },
            type: QueryTypes.SELECT,
          }
        );
      };

      let rows = await run(true);
      let fallback = false;
      if (rows.length === 0) {
        rows = await run(false);
        fallback = true;
      }

      const items: HotSkuRow[] = rows.map((row) => ({
        productId: String(readRowValue(row, 'product_id', 'productId') ?? ''),
        name: String(readRowValue(row, 'product_name', 'productName') ?? 'Producto'),
        sku: (() => {
          const v = readRowValue(row, 'sku');
          return v != null && String(v).trim() ? String(v) : null;
        })(),
        qtySold: Number(readRowValue(row, 'qty_sold', 'qtySold') ?? 0),
        hour,
        fallback,
      })).filter((row) => row.productId);

      return ok({ hour, items });
    } catch (error) {
      console.error('[Reports] getHotSkus failed', error);
      return fail('ERROR_FETCHING_HOT_SKUS');
    }
  }

  async getReorderDraft(
    empresaId: string,
    branchId: string | null,
    limit = 20
  ): Promise<Result<ReorderDraftRow[]>> {
    try {
      const branchClause = branchId ? 'AND st.branch_id = :branchId' : '';
      const soldBranch = branchId ? 'AND s.branch_id = :branchId' : '';
      const rows = await sequelize.query<Record<string, unknown>>(
        `SELECT
           st.product_id,
           st.branch_id,
           st.quantity,
           st.min_stock,
           p.name AS product_name,
           p.sku,
           b.name AS branch_name,
           COALESCE(sold.qty7, 0) AS qty_7d
         FROM inventory_stock st
         INNER JOIN products p ON p.id = st.product_id AND p.empresa_id = st.empresa_id
         INNER JOIN branches b ON b.id = st.branch_id AND b.empresa_id = st.empresa_id
         LEFT JOIN (
           SELECT s.branch_id, d.product_id, SUM(d.quantity) AS qty7
           FROM sale_details d
           INNER JOIN sales s ON s.id = d.sale_id
           WHERE s.empresa_id = :empresaId
             AND s.status = 'COMPLETED'
             AND s.created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
             ${soldBranch}
           GROUP BY s.branch_id, d.product_id
         ) sold ON sold.product_id = st.product_id AND sold.branch_id = st.branch_id
         WHERE st.empresa_id = :empresaId
           ${branchClause}`,
        {
          replacements: branchId ? { empresaId, branchId } : { empresaId },
          type: QueryTypes.SELECT,
        }
      );

      const drafts: ReorderDraftRow[] = [];
      for (const row of rows) {
        const quantity = Number(readRowValue(row, 'quantity') ?? 0);
        const minStock = Number(readRowValue(row, 'min_stock', 'minStock') ?? 0);
        const qtySold7d = Number(readRowValue(row, 'qty_7d', 'qty7d') ?? 0);
        const suggestedQty = computeReorderDraftQty(quantity, minStock, qtySold7d);
        if (suggestedQty <= 0) continue;
        drafts.push({
          productId: String(readRowValue(row, 'product_id', 'productId') ?? ''),
          productName: String(readRowValue(row, 'product_name', 'productName') ?? 'Producto'),
          sku: (() => {
            const v = readRowValue(row, 'sku');
            return v != null && String(v).trim() ? String(v) : null;
          })(),
          branchId: String(readRowValue(row, 'branch_id', 'branchId') ?? ''),
          branchName: String(readRowValue(row, 'branch_name', 'branchName') ?? 'Sucursal'),
          quantity,
          minStock,
          qtySold7d,
          suggestedQty,
          status: 'DRAFT',
        });
      }

      drafts.sort((a, b) => b.suggestedQty - a.suggestedQty || a.quantity - b.quantity);
      if (drafts.length === 0) {
        const low = await this.getLowStockAlerts(empresaId, branchId, limit);
        if (low.success) {
          for (const alert of low.value) {
            const suggestedQty = computeReorderDraftQty(alert.quantity, alert.minStock, 0);
            if (suggestedQty <= 0) continue;
            drafts.push({
              productId: alert.productId,
              productName: alert.productName,
              sku: null,
              branchId: alert.branchId,
              branchName: alert.branchName,
              quantity: alert.quantity,
              minStock: alert.minStock,
              qtySold7d: 0,
              suggestedQty,
              status: 'DRAFT',
            });
          }
        }
      }
      return ok(drafts.filter((d) => d.productId).slice(0, Math.min(50, Math.max(5, limit))));
    } catch (error) {
      console.error('[Reports] getReorderDraft failed', error);
      return fail('ERROR_FETCHING_REORDER_DRAFT');
    }
  }

  /** S15: agregados de mix / pico / merma. Solo lectura; no inventa stock. */
  async getBusinessInsights(
    empresaId: string,
    branchId: string | null
  ): Promise<Result<BusinessInsightsPayload>> {
    const branchAndSales = branchId ? 'AND s.branch_id = :branchId' : '';
    const branchAndSh = branchId ? 'AND sh.branch_id = :branchId' : '';
    const replacements = branchId ? { empresaId, branchId } : { empresaId };

    try {
      const mixRows = await sequelize.query<Record<string, unknown>>(
        `SELECT
           p.name AS product_name,
           SUM(d.quantity) AS qty_sold
         FROM sale_details d
         INNER JOIN sales s ON s.id = d.sale_id
         INNER JOIN products p ON p.id = d.product_id AND p.empresa_id = s.empresa_id
         WHERE s.empresa_id = :empresaId
           AND s.status <> 'CANCELLED'
           AND s.created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)
           ${branchAndSales}
         GROUP BY p.id, p.name
         ORDER BY qty_sold DESC
         LIMIT 5`,
        { replacements, type: QueryTypes.SELECT }
      );

      const peakRows = await sequelize.query<Record<string, unknown>>(
        `SELECT
           HOUR(CONVERT_TZ(s.created_at, '+00:00', '-03:00')) AS peak_hour,
           COUNT(*) AS sale_count
         FROM sales s
         WHERE s.empresa_id = :empresaId
           AND s.status <> 'CANCELLED'
           AND s.created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 28 DAY)
           ${branchAndSales}
         GROUP BY HOUR(CONVERT_TZ(s.created_at, '+00:00', '-03:00'))
         HAVING peak_hour IS NOT NULL
         ORDER BY sale_count DESC
         LIMIT 1`,
        { replacements, type: QueryTypes.SELECT }
      );

      const mermaRows = await sequelize.query<Record<string, unknown>>(
        `SELECT
           COALESCE(SUM(CASE
             WHEN sh.created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY) THEN sh.quantity
             ELSE 0
           END), 0) AS qty_7d,
           COALESCE(SUM(sh.quantity), 0) AS qty_28d
         FROM shrinkages sh
         WHERE sh.empresa_id = :empresaId
           AND sh.status = 'APPROVED'
           AND sh.created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 28 DAY)
           ${branchAndSh}`,
        { replacements, type: QueryTypes.SELECT }
      );

      const peak = peakRows[0];
      const merma = mermaRows[0];
      const peakHourRaw = peak ? Number(readRowValue(peak, 'peak_hour', 'peakHour')) : NaN;

      return ok({
        mix7d: mixRows
          .map((row) => ({
            productName: String(readRowValue(row, 'product_name', 'productName') ?? '').trim(),
            qtySold: Number(readRowValue(row, 'qty_sold', 'qtySold') ?? 0) || 0,
          }))
          .filter((row) => row.productName),
        peakHour: Number.isFinite(peakHourRaw) ? Math.min(23, Math.max(0, Math.trunc(peakHourRaw))) : null,
        peakSaleCount: peak ? Number(readRowValue(peak, 'sale_count', 'saleCount') ?? 0) || 0 : 0,
        mermaQty7d: merma ? Number(readRowValue(merma, 'qty_7d', 'qty7d') ?? 0) || 0 : 0,
        mermaQty28d: merma ? Number(readRowValue(merma, 'qty_28d', 'qty28d') ?? 0) || 0 : 0,
      });
    } catch (error) {
      console.error('[Reports] getBusinessInsights failed', error);
      return fail('ERROR_FETCHING_BUSINESS_INSIGHTS');
    }
  }
}

export default new ReportsDelegate();
