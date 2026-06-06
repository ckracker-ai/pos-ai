'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, getApiErrorMessage } from '@/core/api/api-client';
import { unwrapApiEnvelope } from '@/core/api/normalizers';
import { useAuthStore } from '@/store/auth';
import { getRoleProfile } from '@/core/config/role-access';
import { useActiveBranch } from '@/core/hooks/useActiveBranch';
import { AppPageContent } from '@/components/molecules/AppPageContent';
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
  requiresDelivery: boolean;
  deliveryAmount: number;
  deliveryAddress: string | null;
};

type InventoryRow = {
  productName: string;
  sku: string;
  branchName: string;
  quantity: number;
  minStock: number;
  price: number;
  categoryName: string | null;
  categoryPrincipalId: string | null;
  categoryPrincipalName: string | null;
};

type ShrinkageReportSummary = {
  pending: number;
  approved: number;
  rejected: number;
  pendingQuantity: number;
  approvedQuantity: number;
  rejectedQuantity: number;
};

type ShrinkageReportRow = {
  id: string;
  date: string;
  branchName: string;
  productName: string;
  productSku: string;
  quantity: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reportedByName: string;
  reviewedByName: string | null;
  rejectionNote: string | null;
};

type ShrinkageStatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

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
    requiresDelivery: Boolean(raw.requiresDelivery ?? raw.requires_delivery),
    deliveryAmount: Number(raw.deliveryAmount ?? raw.delivery_amount ?? 0),
    deliveryAddress:
      raw.deliveryAddress != null || raw.delivery_address != null
        ? String(raw.deliveryAddress ?? raw.delivery_address)
        : null,
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
    categoryName: (raw.categoryName ?? raw.category_name ?? null) as string | null,
    categoryPrincipalId: (raw.categoryPrincipalId ?? raw.category_principal_id ?? null) as
      | string
      | null,
    categoryPrincipalName: (raw.categoryPrincipalName ?? raw.category_principal_name ?? null) as
      | string
      | null,
  };
}

function formatMoney(value: number) {
  return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function stockBadgeClass(quantity: number, minStock: number) {
  if (quantity <= 0) return 'app-badge-danger';
  if (quantity <= minStock || quantity <= 5) return 'app-badge-warn';
  return 'app-badge-ok';
}

function shrinkageStatusLabel(status: string) {
  if (status === 'PENDING') return 'Pendiente';
  if (status === 'APPROVED') return 'Aprobada';
  if (status === 'REJECTED') return 'Rechazada';
  return status;
}

function shrinkageStatusClass(status: string) {
  if (status === 'APPROVED') return 'app-badge-approved';
  if (status === 'REJECTED') return 'app-badge-rejected';
  return 'app-badge-pending';
}

function normalizeShrinkageReportRow(raw: Record<string, unknown>): ShrinkageReportRow {
  const dateRaw = raw.date ?? raw.created_at ?? raw.createdAt;
  return {
    id: String(raw.id ?? ''),
    date: String(dateRaw ?? new Date().toISOString()),
    branchName: String(raw.branchName ?? raw.branch_name ?? '—'),
    productName: String(raw.productName ?? raw.product_name ?? 'Producto'),
    productSku: String(raw.productSku ?? raw.product_sku ?? raw.sku ?? ''),
    quantity: Number(raw.quantity ?? 0),
    reason: String(raw.reason ?? ''),
    status: String(raw.status ?? 'PENDING').toUpperCase() as ShrinkageReportRow['status'],
    reportedByName: String(raw.reportedByName ?? raw.reported_by_name ?? '—'),
    reviewedByName:
      raw.reviewedByName != null || raw.reviewed_by_name != null
        ? String(raw.reviewedByName ?? raw.reviewed_by_name)
        : null,
    rejectionNote:
      raw.rejectionNote != null || raw.rejection_note != null
        ? String(raw.rejectionNote ?? raw.rejection_note)
        : null,
  };
}

export default function ReportesPage() {
  const user = useAuthStore((s) => s.user);
  const { branchId, activeBranchName } = useActiveBranch();
  const canGlobal = getRoleProfile(user?.role).canSwitchBranch;

  const [globalView, setGlobalView] = useState(false);
  const [activeTab, setActiveTab] = useState<'ventas' | 'inventario' | 'mermas'>('ventas');
  const [shrinkageStatusFilter, setShrinkageStatusFilter] = useState<ShrinkageStatusFilter>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenuePoint[]>([]);
  const [lowStock, setLowStock] = useState<LowStockAlert[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [shrinkageSummary, setShrinkageSummary] = useState<ShrinkageReportSummary | null>(null);
  const [shrinkages, setShrinkages] = useState<ShrinkageReportRow[]>([]);
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('all');

  const reportParams = useMemo(
    () => ({ params: { global: globalView && canGlobal ? 'true' : undefined, days: 30 } }),
    [globalView, canGlobal]
  );

  const shrinkageReportParams = useMemo(
    () => ({
      params: {
        global: globalView && canGlobal ? 'true' : undefined,
        status: shrinkageStatusFilter,
        limit: 300,
      },
    }),
    [globalView, canGlobal, shrinkageStatusFilter]
  );

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [dashboardRes, salesRes, inventoryRes, shrinkageRes] = await Promise.all([
        api.getReportsDashboard(reportParams),
        api.getReportsSales({ params: { ...reportParams.params, limit: 300 } }),
        api.getReportsInventory(reportParams),
        api.getReportsShrinkage(shrinkageReportParams),
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

      const shrinkageData = unwrapApiEnvelope(shrinkageRes.data) as {
        summary?: ShrinkageReportSummary;
        shrinkages?: unknown[];
      };
      setShrinkageSummary(shrinkageData.summary ?? null);
      const shrinkageRows = Array.isArray(shrinkageData.shrinkages) ? shrinkageData.shrinkages : [];
      setShrinkages(
        shrinkageRows
          .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
          .map((row) => normalizeShrinkageReportRow(row))
      );
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [reportParams, shrinkageReportParams]);

  useEffect(() => {
    setGlobalView(false);
  }, [branchId]);

  useEffect(() => {
    loadReports();
  }, [loadReports, branchId]);

  const inventoryPrincipalOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of inventory) {
      const id = row.categoryPrincipalId;
      const name = row.categoryPrincipalName;
      if (id && name) map.set(id, name);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    if (inventoryCategoryFilter === 'all') return inventory;
    return inventory.filter((row) => row.categoryPrincipalId === inventoryCategoryFilter);
  }, [inventory, inventoryCategoryFilter]);

  const exportSalesExcel = () => {
    exportRowsToExcel(
      'reporte-ventas',
      ['Fecha', 'Sucursal', 'Total', 'Descuento', 'Delivery', 'Envío', 'Estado', 'Notas'],
      sales.map((s) => [
        new Date(s.date).toLocaleString('es-CO'),
        s.branchName,
        s.total,
        s.discount,
        s.requiresDelivery ? 'Sí' : 'No',
        s.requiresDelivery ? s.deliveryAmount : '',
        s.status,
        s.notes ?? '',
      ])
    );
  };

  const exportInventoryExcel = () => {
    exportRowsToExcel(
      'reporte-inventario',
      ['Producto', 'SKU', 'Familia', 'Categoría', 'Sucursal', 'Stock', 'Stock mínimo', 'Precio'],
      filteredInventory.map((row) => [
        row.productName,
        row.sku,
        row.categoryPrincipalName ?? '—',
        row.categoryName ?? '—',
        row.branchName,
        row.quantity,
        row.minStock,
        row.price,
      ])
    );
  };

  const exportShrinkageExcel = () => {
    exportRowsToExcel(
      'reporte-mermas',
      [
        'Fecha',
        'Sucursal',
        'Producto',
        'SKU',
        'Cantidad',
        'Motivo',
        'Estado',
        'Reportó',
        'Revisó',
        'Nota rechazo',
      ],
      shrinkages.map((row) => [
        new Date(row.date).toLocaleString('es-CO'),
        row.branchName,
        row.productName,
        row.productSku,
        row.quantity,
        row.reason,
        shrinkageStatusLabel(row.status),
        row.reportedByName,
        row.reviewedByName ?? '',
        row.rejectionNote ?? '',
      ])
    );
  };

  const handleExport = () => {
    if (activeTab === 'ventas') exportSalesExcel();
    else if (activeTab === 'inventario') exportInventoryExcel();
    else exportShrinkageExcel();
  };

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <AppPageContent>
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="app-eyebrow">Reportes</p>
              <h1 className="app-heading-page">Panel general</h1>
              <p className="mt-2 app-text-muted">
                {globalView && canGlobal
                  ? 'Resumen de todas las sucursales'
                  : `Resumen de ${activeBranchName}`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {canGlobal && (
                <label className="flex items-center gap-2 rounded-2xl border border-[rgba(209,199,189,0.9)] bg-white px-4 py-2 text-sm text-[#3d4532]">
                  <input
                    type="checkbox"
                    checked={globalView}
                    onChange={(e) => setGlobalView(e.target.checked)}
                    className="rounded border-[rgba(209,199,189,0.9)]"
                  />
                  Vista global
                </label>
              )}
              <button type="button" onClick={loadReports} className="app-btn-secondary">
                Actualizar
              </button>
            </div>
          </div>

          {errorMessage && <p className="mb-6 app-alert-error">{errorMessage}</p>}

          {isLoading ? (
            <p className="app-text-muted">Cargando reportes…</p>
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
                  <div key={card.title} className="app-card rounded-3xl p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm app-text-muted">{card.title}</p>
                        <p className="mt-2 text-3xl font-semibold text-[#3d4532]">{card.value}</p>
                        <p className="mt-1 text-xs text-[#6b7280]">{card.sub}</p>
                      </div>
                      <span className="app-stat-chip">{card.icon}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="app-card rounded-3xl p-6 xl:col-span-2">
                  <h2 className="text-lg font-semibold text-[#3d4532]">Tendencia de ingresos</h2>
                  <p className="text-sm app-text-muted">Ingresos diarios de los últimos 30 días</p>
                  <div className="mt-4 h-56 w-full">
                    <RevenueTrendChart points={revenueTrend} />
                  </div>
                </div>

                <div className="app-card rounded-3xl p-6">
                  <div className="flex items-center gap-2">
                    <span className="text-rose-600">⚠</span>
                    <h2 className="text-lg font-semibold text-[#3d4532]">Alertas de stock bajo</h2>
                  </div>
                  <p className="mt-1 text-sm app-text-muted">Productos que necesitan atención</p>
                  <ul className="mt-4 space-y-3">
                    {lowStock.length === 0 ? (
                      <li className="text-sm text-[#6b7280]">Sin alertas de stock.</li>
                    ) : (
                      lowStock.map((item) => (
                        <li
                          key={`${item.productId}-${item.branchId}`}
                          className="flex items-center justify-between gap-3 app-stat-inner"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[#3d4532]">
                              {item.productName || 'Producto sin nombre'}
                            </p>
                            <p className="truncate text-xs text-[#6b7280]">
                              {item.branchName || 'Sucursal'}
                            </p>
                          </div>
                          <span className={`shrink-0 ${stockBadgeClass(item.quantity, item.minStock)}`}>
                            {Number.isFinite(item.quantity) ? item.quantity : 0} en stock
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>

              <div className="app-card mt-8 rounded-3xl p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('ventas')}
                      className={activeTab === 'ventas' ? 'app-tab-active' : 'app-tab'}
                    >
                      Ventas
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('inventario')}
                      className={activeTab === 'inventario' ? 'app-tab-active' : 'app-tab'}
                    >
                      Inventario
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('mermas')}
                      className={activeTab === 'mermas' ? 'app-tab-active' : 'app-tab'}
                    >
                      Mermas
                    </button>
                  </div>
                  <button type="button" onClick={handleExport} className="app-btn-primary">
                    Exportar Excel
                  </button>
                </div>

                {activeTab === 'mermas' && shrinkageSummary && (
                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      {
                        label: 'Pendientes',
                        count: shrinkageSummary.pending,
                        qty: shrinkageSummary.pendingQuantity,
                        tone: 'text-amber-700',
                      },
                      {
                        label: 'Aprobadas',
                        count: shrinkageSummary.approved,
                        qty: shrinkageSummary.approvedQuantity,
                        tone: 'text-emerald-700',
                      },
                      {
                        label: 'Rechazadas',
                        count: shrinkageSummary.rejected,
                        qty: shrinkageSummary.rejectedQuantity,
                        tone: 'text-rose-700',
                      },
                    ].map((card) => (
                      <div key={card.label} className="app-panel px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-[#6b7280]">{card.label}</p>
                        <p className={`mt-1 text-2xl font-semibold ${card.tone}`}>{card.count}</p>
                        <p className="text-xs text-[#6b7280]">{card.qty} unidades</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'inventario' && inventoryPrincipalOptions.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <label className="text-sm app-text-muted">Familia (categoría principal)</label>
                    <select
                      value={inventoryCategoryFilter}
                      onChange={(e) => setInventoryCategoryFilter(e.target.value)}
                      className="app-select w-auto min-w-[12rem]"
                    >
                      <option value="all">Todas</option>
                      {inventoryPrincipalOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-[#6b7280]">
                      {filteredInventory.length} de {inventory.length} filas
                    </span>
                  </div>
                )}

                {activeTab === 'mermas' && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <label className="text-sm app-text-muted">Filtrar estado</label>
                    <select
                      value={shrinkageStatusFilter}
                      onChange={(e) =>
                        setShrinkageStatusFilter(e.target.value as ShrinkageStatusFilter)
                      }
                      className="app-select w-auto min-w-[10rem]"
                    >
                      <option value="ALL">Todas</option>
                      <option value="PENDING">Pendientes</option>
                      <option value="APPROVED">Aprobadas</option>
                      <option value="REJECTED">Rechazadas</option>
                    </select>
                    <p className="text-xs text-[#6b7280]">
                      Las rechazadas muestran la nota del administrador (sin descuento de stock).
                    </p>
                  </div>
                )}

                <div className="app-table-wrap mt-6 overflow-x-auto">
                  {activeTab === 'ventas' ? (
                    <table className="app-table min-w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Sucursal</th>
                          <th>Total</th>
                          <th>Descuento</th>
                          <th>Delivery</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-[#6b7280]">
                              No hay ventas para mostrar.
                            </td>
                          </tr>
                        ) : (
                          sales.map((sale) => (
                            <tr key={sale.id}>
                              <td>{new Date(sale.date).toLocaleString('es-CO')}</td>
                              <td className="font-medium">{sale.branchName}</td>
                              <td>{formatMoney(sale.total)}</td>
                              <td>{formatMoney(sale.discount)}</td>
                              <td>
                                {sale.requiresDelivery ? (
                                  <span className="app-badge-warn" title={sale.deliveryAddress ?? ''}>
                                    Envío {formatMoney(sale.deliveryAmount)}
                                  </span>
                                ) : (
                                  <span className="text-[#6b7280]">—</span>
                                )}
                              </td>
                              <td>{sale.status}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  ) : activeTab === 'inventario' ? (
                    <table className="app-table min-w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>SKU</th>
                          <th>Familia</th>
                          <th>Sucursal</th>
                          <th>Stock</th>
                          <th>Mínimo</th>
                          <th>Precio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInventory.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-[#6b7280]">
                              No hay inventario para mostrar.
                            </td>
                          </tr>
                        ) : (
                          filteredInventory.map((row, idx) => (
                            <tr key={`${row.sku}-${row.branchName}-${idx}`}>
                              <td className="font-medium">{row.productName}</td>
                              <td>{row.sku}</td>
                              <td>{row.categoryPrincipalName ?? row.categoryName ?? '—'}</td>
                              <td>{row.branchName}</td>
                              <td>{row.quantity}</td>
                              <td>{row.minStock}</td>
                              <td>{formatMoney(row.price)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <table className="app-table min-w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Sucursal</th>
                          <th>Producto</th>
                          <th>Cant.</th>
                          <th>Motivo</th>
                          <th>Estado</th>
                          <th>Reportó</th>
                          <th>Revisó</th>
                          <th>Nota rechazo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shrinkages.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-[#6b7280]">
                              No hay mermas para mostrar.
                            </td>
                          </tr>
                        ) : (
                          shrinkages.map((row) => (
                            <tr key={row.id}>
                              <td>{new Date(row.date).toLocaleString('es-CO')}</td>
                              <td className="font-medium">{row.branchName}</td>
                              <td>
                                <p>{row.productName}</p>
                                <p className="text-xs text-[#6b7280]">{row.productSku}</p>
                              </td>
                              <td>{row.quantity}</td>
                              <td className="max-w-[180px]">{row.reason}</td>
                              <td>
                                <span className={`inline-flex ${shrinkageStatusClass(row.status)}`}>
                                  {shrinkageStatusLabel(row.status)}
                                </span>
                              </td>
                              <td>{row.reportedByName}</td>
                              <td>{row.reviewedByName ?? '—'}</td>
                              <td className="max-w-[220px]">
                                {row.status === 'REJECTED' && row.rejectionNote ? (
                                  <span className="text-rose-700">{row.rejectionNote}</span>
                                ) : (
                                  '—'
                                )}
                              </td>
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
      </AppPageContent>
    </DashboardLayout>
  );
}
