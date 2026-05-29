import { Router } from 'express';
import { sendOk, sendFail } from '../../../middleware/globalErrorHandler';
import {
  authenticateToken,
  requireSeller,
  AuthenticatedRequest,
} from '../../../middleware/auth.middleware';
import { getEffectiveBranchId } from '../../../utils/branchContext';
import reportsDelegate from '../delegates/ReportsDelegate';

const router = Router();

router.use(authenticateToken);

function resolveReportBranchId(req: AuthenticatedRequest): string | null {
  const global =
    String(req.query.global ?? '').toLowerCase() === 'true' ||
    String(req.query.scope ?? '').toLowerCase() === 'global';

  const role = String(req.user?.roleName ?? '').toUpperCase();
  const canGlobal = ['ADMIN', 'AUDITOR'].includes(role);

  if (global && canGlobal) return null;
  return getEffectiveBranchId(req);
}

router.get('/summary', requireSeller, async (req: AuthenticatedRequest, res) => {
  const branchId = resolveReportBranchId(req);
  const result = await reportsDelegate.getSummary(branchId);
  if (result.success) return sendOk(res, result.value);
  return sendFail(res, result.error, 500);
});

router.get('/revenue-trend', requireSeller, async (req: AuthenticatedRequest, res) => {
  const branchId = resolveReportBranchId(req);
  const days = Math.min(90, Math.max(7, Number(req.query.days ?? 30)));
  const result = await reportsDelegate.getRevenueTrend(branchId, days);
  if (result.success) return sendOk(res, { points: result.value, days });
  return sendFail(res, result.error, 500);
});

router.get('/low-stock', requireSeller, async (req: AuthenticatedRequest, res) => {
  const branchId = resolveReportBranchId(req);
  const limit = Math.min(50, Math.max(5, Number(req.query.limit ?? 20)));
  const result = await reportsDelegate.getLowStockAlerts(branchId, limit);
  if (result.success) return sendOk(res, { alerts: result.value });
  return sendFail(res, result.error, 500);
});

router.get('/sales', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const branchId = resolveReportBranchId(req);
    const limit = Math.min(500, Math.max(10, Number(req.query.limit ?? 200)));
    const result = await reportsDelegate.getSalesTable(branchId, limit);
    if (result.success) return sendOk(res, { sales: result.value });
    return sendFail(res, result.error, 500);
  } catch {
    return sendFail(res, 'ERROR_FETCHING_SALES_REPORT', 500);
  }
});

router.get('/inventory', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const branchId = resolveReportBranchId(req);
    const result = await reportsDelegate.getInventoryTable(branchId);
    if (result.success) return sendOk(res, { inventory: result.value });
    return sendFail(res, result.error, 500);
  } catch {
    return sendFail(res, 'ERROR_FETCHING_INVENTORY_REPORT', 500);
  }
});

router.get('/shrinkage', requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const branchId = resolveReportBranchId(req);
    const status = String(req.query.status ?? 'ALL');
    const limit = Math.min(500, Math.max(10, Number(req.query.limit ?? 300)));
    const result = await reportsDelegate.getShrinkageReport(branchId, { status, limit });
    if (result.success) return sendOk(res, result.value);
    return sendFail(res, result.error, 500);
  } catch {
    return sendFail(res, 'ERROR_FETCHING_SHRINKAGE_REPORT', 500);
  }
});

router.get('/dashboard', requireSeller, async (req: AuthenticatedRequest, res) => {
  const branchId = resolveReportBranchId(req);
  const days = Math.min(90, Math.max(7, Number(req.query.days ?? 30)));

  const [summary, trend, alerts] = await Promise.all([
    reportsDelegate.getSummary(branchId),
    reportsDelegate.getRevenueTrend(branchId, days),
    reportsDelegate.getLowStockAlerts(branchId, 20),
  ]);

  if (!summary.success) return sendFail(res, summary.error, 500);
  if (!trend.success) return sendFail(res, trend.error, 500);
  if (!alerts.success) return sendFail(res, alerts.error, 500);

  return sendOk(res, {
    summary: summary.value,
    revenueTrend: trend.value,
    lowStockAlerts: alerts.value,
    days,
  });
});

export default router;
