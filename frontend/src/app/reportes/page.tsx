'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, getApiErrorMessage } from '@/core/api/api-client';
import { unwrapApiEnvelope } from '@/core/api/normalizers';
import { useAuthStore } from '@/store/auth';
import { useActiveBranch } from '@/core/hooks/useActiveBranch';
import { DashboardLayout } from '@/components/molecules/DashboardLayout';
import { SidebarMenu } from '@/components/organisms/SidebarMenu';
import { Navbar } from '@/components/organisms/Navbar';
import { RevenueTrendChart } from '@/components/organisms/RevenueTrendChart';
import { exportRowsToExcel } from '@/utils/exportExcel';

type ReportsSummary = {
  totalRevenue: number;
  todayRevenue: number;
  totalSales: number;
  todaySales: number;
  activeBranches: number;
  registeredUsers: number;
  scope: 'branch' | 'global';
};

type RevenuePoint = { date: string; revenue: number; salesCount: number };

type LowStockAlert = {
  productId: string;
  productName: string;
  branchId: string;
  branchName: string;
  quantity: number;
  minStock: number;
};

type SaleRow = {
  id: string;
  date: string;
  branchName: string;
  total: number;
  discount: number;
  status: string;
  notes: string | null;
};

type InventoryRow = {
  productName: string;
  sku: string;
  branchName: string;
  quantity: number;
  minStock: number;
  price: number;
};

function normalizeSaleReportRow(raw: Record<string, unknown>): SaleRow {
  const dateRaw = raw.date ?? raw.created_at ?? raw.createdAt;
  return {
    id: String(raw.id ?? ''),
    date: String(dateRaw ?? new Date().toISOString()),
    branchName: String(raw.branchName ?? raw.branch_name ?? '—'),
    total: Number(raw.total ?? 0),
    discount: Number(raw.discount ?? 0),
    status: String(raw.status ?? ''),
    notes: raw.notes != null ? String(raw.notes) : null,
  };
}

function normalizeInventoryReportRow(raw: Record<string, unknown>): InventoryRow {
  return {
    productName: String(
      raw.productName ?? raw.product_name ?? raw.name ?? 'Producto'
    ),
    sku: String(raw.sku ?? raw.product_sku ?? ''),
    branchName: String(raw.branchName ?? raw.branch_name ?? '—'),
    quantity: Number(raw.quantity ?? 0),
    minStock: Number(raw.minStock ?? raw.min_stock ?? 0),
    price: Number(raw.price ?? raw.product_price ?? 0),
  };
}

function formatMoney(value: number) {
  return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function stockBadgeClass(quantity: number, minStock: number) {
  if (quantity <= 0) return 'bg-rose-500/20 text-rose-200 border-rose-500/40';
  if (quantity <= minStock || quantity <= 5) return 'bg-amber-500/20 text-amber-100 border-amber-500/40';
  return 'bg-slate-800 text-slate-300 border-slate-700';
}

export default function ReportesPage() {
  const user = useAuthStore((s) => s.user);
  const { branchId, activeBranchName } = useActiveBranch();
  const canGlobal = user?.role === 'admin' || user?.role === 'auditor';

  const [globalView, setGlobalView] = useState(false);
  const [activeTab, setActiveTab] = useState<'ventas' | 'inventario'>('ventas');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenuePoint[]>([]);
  const [lowStock, setLowStock] = useState<LowStockAlert[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);

  const reportParams = useMemo(
    () => ({ params: { global: globalView && canGlobal ? 'true' : undefined, days: 30 } }),
    [globalView, canGlobal]
  );

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [dashboardRes, salesRes, inventoryRes] = await Promise.all([
        api.getReportsDashboard(reportParams),
        api.getReportsSales({ params: { ...reportParams.params, limit: 300 } }),
        api.getReportsInventory(reportParams),
      ]);

      const dashboard = unwrapApiEnvelope(dashboardRes.data) as {
        summary: ReportsSummary;
        revenueTrend: RevenuePoint[];
        lowStockAlerts: LowStockAlert[];
      };

      setSummary(dashboard.summary);
      setRevenueTrend(dashboard.revenueTrend ?? []);
      setLowStock(dashboard.lowStockAlerts ?? []);

      const salesData = unwrapApiEnvelope(salesRes.data) as { sales?: unknown[] };
      const saleRows = Array.isArray(salesData?.sales) ? salesData.sales : [];
      setSales(
        saleRows
          .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
          .map((row) => normalizeSaleReportRow(row))
      );

      const invData = unwrapApiEnvelope(inventoryRes.data) as { inventory?: unknown[] };
      const invRows = Array.isArray(invData?.inventory) ? invData.inventory : [];
      setInventory(
        invRows
          .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
          .map((row) => normalizeInventoryReportRow(row))
      );
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [reportParams]);

  useEffect(() => {
    setGlobalView(false);
  }, [branchId]);

  useEffect(() => {
    loadReports();
  }, [loadReports, branchId]);

  const exportSalesExcel = () => {
    exportRowsToExcel('reporte-ventas', ['Fecha', 'Sucursal', 'Total', 'Descuento', 'Estado', 'Notas'], sales.map((s) => [
      new Date(s.date).toLocaleString('es-CO'),
      s.branchName,
      s.total,
      s.discount,
      s.status,
      s.notes ?? '',
    ]));
  };

  const exportInventoryExcel = () => {
    exportRowsToExcel(
      'reporte-inventario',
      ['Producto', 'SKU', 'Sucursal', 'Stock', 'Stock mínimo', 'Precio'],
      inventory.map((row) => [row.productName, row.sku, row.branchName, row.quantity, row.minStock, row.price])
    );
  };

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Reportes</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Panel General</h1>
              <p className="mt-2 text-slate-400">
                {globalView && canGlobal
                  ? 'Resumen de todas las sucursales'
                  : `Resumen de ${activeBranchName}`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {canGlobal && (
                <label className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={globalView}
                    onChange={(e) => setGlobalView(e.target.checked)}
                    className="rounded border-slate-600"
                  />
                  Vista global
                </label>
              )}
              <button
                type="button"
                onClick={loadReports}
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-900"
              >
                Actualizar
              </button>
            </div>
          </div>

          {errorMessage && (
            <p className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {errorMessage}
            </p>
          )}

          {isLoading ? (
            <p className="text-slate-500">Cargando reportes…</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    title: 'Ingresos Totales',
                    value: formatMoney(summary?.totalRevenue ?? 0),
                    sub: `${formatMoney(summary?.todayRevenue ?? 0)} hoy`,
                    icon: '$',
                  },
                  {
                    title: 'Ventas Totales',
                    value: String(summary?.totalSales ?? 0),
                    sub: `+${summary?.todaySales ?? 0} hoy`,
                    icon: '🛍',
                  },
                  {
                    title: 'Sucursales Activas',
                    value: String(summary?.activeBranches ?? 0),
                    sub: 'En todo el sistema',
                    icon: '🏪',
                  },
                  {
                    title: 'Usuarios Registrados',
                    value: String(summary?.registeredUsers ?? 0),
                    sub: 'En todas las sucursales',
                    icon: '👥',
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-slate-400">{card.title}</p>
                        <p className="mt-2 text-3xl font-semibold text-white">{card.value}</p>
                        <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
                      </div>
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800 text-lg">
                        {card.icon}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-lg xl:col-span-2">
                  <h2 className="text-lg font-semibold text-white">Tendencia de Ingresos</h2>
                  <p className="text-sm text-slate-400">Ingresos diarios de los últimos 30 días</p>
                  <div className="mt-4 h-56 w-full">
                    <RevenueTrendChart points={revenueTrend} />
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-rose-400">⚠</span>
                    <h2 className="text-lg font-semibold text-white">Alertas de Stock Bajo</h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">Productos que necesitan atención</p>
                  <ul className="mt-4 space-y-3">
                    {lowStock.length === 0 ? (
                      <li className="text-sm text-slate-500">Sin alertas de stock.</li>
                    ) : (
                      lowStock.map((item) => (
                        <li
                          key={`${item.productId}-${item.branchId}`}
                          className="flex items-center justify-between gap-3 rounded-2xl bg-slate-950/80 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-white">
                              {item.productName || 'Producto sin nombre'}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {item.branchName || 'Sucursal'}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${stockBadgeClass(item.quantity, item.minStock)}`}
                          >
                            {Number.isFinite(item.quantity) ? item.quantity : 0} en stock
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>

              <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-lg">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('ventas')}
                      className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                        activeTab === 'ventas'
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      Ventas
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('inventario')}
                      className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                        activeTab === 'inventario'
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      Inventario
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={activeTab === 'ventas' ? exportSalesExcel : exportInventoryExcel}
                    className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                  >
                    Exportar Excel
                  </button>
                </div>

                <div className="mt-6 overflow-x-auto">
                  {activeTab === 'ventas' ? (
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-950/80 text-slate-400">
                        <tr>
                          <th className="px-4 py-3">Fecha</th>
                          <th className="px-4 py-3">Sucursal</th>
                          <th className="px-4 py-3">Total</th>
                          <th className="px-4 py-3">Descuento</th>
                          <th className="px-4 py-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {sales.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                              No hay ventas para mostrar.
                            </td>
                          </tr>
                        ) : (
                          sales.map((sale) => (
                            <tr key={sale.id} className="hover:bg-slate-950/60">
                              <td className="px-4 py-3 text-slate-300">
                                {new Date(sale.date).toLocaleString('es-CO')}
                              </td>
                              <td className="px-4 py-3 text-white">{sale.branchName}</td>
                              <td className="px-4 py-3 text-slate-300">{formatMoney(sale.total)}</td>
                              <td className="px-4 py-3 text-slate-300">{formatMoney(sale.discount)}</td>
                              <td className="px-4 py-3 text-slate-300">{sale.status}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-950/80 text-slate-400">
                        <tr>
                          <th className="px-4 py-3">Producto</th>
                          <th className="px-4 py-3">SKU</th>
                          <th className="px-4 py-3">Sucursal</th>
                          <th className="px-4 py-3">Stock</th>
                          <th className="px-4 py-3">Mínimo</th>
                          <th className="px-4 py-3">Precio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {inventory.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                              No hay inventario para mostrar.
                            </td>
                          </tr>
                        ) : (
                          inventory.map((row, idx) => (
                            <tr key={`${row.sku}-${row.branchName}-${idx}`} className="hover:bg-slate-950/60">
                              <td className="px-4 py-3 text-white">{row.productName}</td>
                              <td className="px-4 py-3 text-slate-300">{row.sku}</td>
                              <td className="px-4 py-3 text-slate-300">{row.branchName}</td>
                              <td className="px-4 py-3 text-slate-300">{row.quantity}</td>
                              <td className="px-4 py-3 text-slate-300">{row.minStock}</td>
                              <td className="px-4 py-3 text-slate-300">{formatMoney(row.price)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
