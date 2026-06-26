'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/molecules/DashboardLayout';
import { AppPageHeader } from '@/components/molecules/AppPageHeader';
import { SidebarMenu } from '@/components/organisms/SidebarMenu';
import { Navbar } from '@/components/organisms/Navbar';
import { posProxyPath } from '@/core/constants/api-path';
import { useAuthStore } from '@/store/auth';
import { normalizeRoleName } from '@/core/api/normalizers';

type DeliveryRow = {
  id: string;
  saleNumber: string;
  total: number;
  deliveryStatus: string;
  deliveryCustomerName: string | null;
  deliveryPhone: string | null;
  deliveryAddress: string | null;
  deliveryAmount: number;
  assignedDriverId: string | null;
  assignedDriverName: string | null;
  createdAt: string;
};

type DriverOption = {
  id: string;
  fullName: string;
  email: string;
};

const NEXT_STATUS: Record<string, { label: string; status: string }> = {
  ASSIGNED: { label: 'En ruta', status: 'ON_ROUTE' },
  ON_ROUTE: { label: 'Entregado', status: 'DELIVERED' },
};

const STATUS_LABEL: Record<string, string> = {
  CREATED: 'Creado',
  ASSIGNED: 'Asignado',
  ON_ROUTE: 'En ruta',
  DELIVERED: 'Entregado',
  FAILED: 'Fallido',
};

function formatClp(n: number): string {
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

export default function DeliveryPage() {
  const token = useAuthStore((s) => s.token);
  const branchId = useAuthStore((s) => s.user?.branchId);
  const userRole = useAuthStore((s) => s.user?.role);
  const isDispatcher = useMemo(
    () => normalizeRoleName(userRole) !== 'delivery',
    [userRole]
  );

  const [rows, setRows] = useState<DeliveryRow[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [pickDriver, setPickDriver] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const headers = useCallback(() => {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token ?? ''}`,
      'x-internal-key': process.env.NEXT_PUBLIC_INTERNAL_KEY ?? 'supersecretkey',
    };
    if (branchId) h['x-branch-id'] = branchId;
    return h;
  }, [token, branchId]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const pendingRes = await fetch(posProxyPath('sales/deliveries/pending'), { headers: headers() });
      const pendingJson = await pendingRes.json();
      if (!pendingRes.ok || !pendingJson.success) {
        setError(String(pendingJson.error ?? 'No se pudo cargar envíos'));
        setRows([]);
        return;
      }
      const list = (pendingJson.data?.deliveries ?? pendingJson.data ?? []) as DeliveryRow[];
      setRows(Array.isArray(list) ? list : []);

      if (isDispatcher) {
        const driversRes = await fetch(posProxyPath('sales/deliveries/drivers'), { headers: headers() });
        const driversJson = await driversRes.json();
        const driverList = (driversJson.data?.drivers ?? []) as DriverOption[];
        setDrivers(Array.isArray(driverList) ? driverList : []);
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [token, headers, isDispatcher]);

  useEffect(() => {
    load();
  }, [load]);

  const advance = async (saleId: string, status: string, assignedDriverId?: string) => {
    setBusyId(saleId);
    try {
      const body: { status: string; assignedDriverId?: string } = { status };
      if (assignedDriverId) body.assignedDriverId = assignedDriverId;

      const res = await fetch(posProxyPath(`sales/sales/${saleId}/delivery-status`), {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(String(json.error ?? 'No se pudo actualizar'));
        return;
      }
      await load();
    } catch {
      setError('Error al actualizar estado');
    } finally {
      setBusyId(null);
    }
  };

  const assignDriver = async (saleId: string) => {
    const driverId = pickDriver[saleId];
    if (!driverId) {
      setError('Elige un repartidor antes de asignar');
      return;
    }
    await advance(saleId, 'ASSIGNED', driverId);
  };

  const markFailed = async (saleId: string) => {
    if (!confirm('¿Marcar este envío como fallido?')) return;
    await advance(saleId, 'FAILED');
  };

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <div className="space-y-6">
        <AppPageHeader
          kicker="Delivery"
          title={isDispatcher ? 'Envíos en curso' : 'Mis entregas'}
          description={
            isDispatcher
              ? 'Asigna repartidor y avanza estados: creado → asignado → en ruta → entregado.'
              : 'Pedidos asignados a ti. Marca en ruta cuando salgas y entregado al llegar.'
          }
        />

        {isDispatcher && drivers.length === 0 && !loading ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            No hay usuarios con rol <strong>Repartidor</strong> en esta sucursal. Créalos en{' '}
            <strong>Usuarios</strong> antes de asignar envíos.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        ) : null}

        <div className="app-card rounded-2xl overflow-hidden">
          <div className="app-table-wrap overflow-x-auto">
            <table className="app-table min-w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Dirección</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Repartidor</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-brand-ink-muted">
                      Cargando…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-brand-ink-muted">
                      {isDispatcher
                        ? 'No hay envíos pendientes. Crea una venta con delivery en el POS.'
                        : 'No tienes entregas asignadas por ahora.'}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const next = NEXT_STATUS[r.deliveryStatus];
                    return (
                      <tr key={r.id}>
                        <td className="px-4 py-3 font-mono text-xs">{r.saleNumber}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{r.deliveryCustomerName}</div>
                          <div className="text-xs text-brand-ink-muted">{r.deliveryPhone}</div>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate" title={r.deliveryAddress ?? ''}>
                          {r.deliveryAddress}
                        </td>
                        <td className="px-4 py-3">
                          <span className="app-badge-warn">
                            {STATUS_LABEL[r.deliveryStatus] ?? r.deliveryStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {r.assignedDriverName ? (
                            <span className="text-sm font-medium text-brand-ink">{r.assignedDriverName}</span>
                          ) : isDispatcher && r.deliveryStatus === 'CREATED' ? (
                            <select
                              className="app-select max-w-[180px] text-xs"
                              value={pickDriver[r.id] ?? ''}
                              onChange={(e) =>
                                setPickDriver((prev) => ({ ...prev, [r.id]: e.target.value }))
                              }
                            >
                              <option value="">Elegir…</option>
                              {drivers.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.fullName}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-brand-ink-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {formatClp(r.total)}
                          {r.deliveryAmount > 0 ? (
                            <span className="block text-xs text-brand-ink-muted">
                              + envío {formatClp(r.deliveryAmount)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                          {isDispatcher && r.deliveryStatus === 'CREATED' ? (
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => assignDriver(r.id)}
                              className="rounded-lg bg-brand-olive px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#3d4532] disabled:opacity-50"
                            >
                              {busyId === r.id ? '…' : 'Asignar'}
                            </button>
                          ) : next ? (
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => advance(r.id, next.status)}
                              className="rounded-lg bg-brand-olive px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#3d4532] disabled:opacity-50"
                            >
                              {busyId === r.id ? '…' : next.label}
                            </button>
                          ) : null}
                          {r.deliveryStatus !== 'DELIVERED' && r.deliveryStatus !== 'FAILED' ? (
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => markFailed(r.id)}
                              className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-800 hover:bg-red-50"
                            >
                              Fallido
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-brand-linen px-4 py-2 text-sm font-medium text-brand-ink hover:bg-brand-surface"
        >
          Actualizar
        </button>
      </div>
    </DashboardLayout>
  );
}
