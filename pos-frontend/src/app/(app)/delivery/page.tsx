'use client';

import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/molecules/DashboardLayout';
import { SidebarMenu } from '@/components/organisms/SidebarMenu';
import { Navbar } from '@/components/organisms/Navbar';
import { posProxyPath } from '@/core/constants/api-path';
import { useAuthStore } from '@/store/auth';

type DeliveryRow = {
  id: string;
  saleNumber: string;
  total: number;
  deliveryStatus: string;
  deliveryCustomerName: string | null;
  deliveryPhone: string | null;
  deliveryAddress: string | null;
  deliveryAmount: number;
  createdAt: string;
};

const NEXT_STATUS: Record<string, { label: string; status: string }> = {
  CREATED: { label: 'Asignar repartidor', status: 'ASSIGNED' },
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
  const [rows, setRows] = useState<DeliveryRow[]>([]);
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
      const res = await fetch(posProxyPath('sales/deliveries/pending'), { headers: headers() });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(String(json.error ?? 'No se pudo cargar envíos'));
        setRows([]);
        return;
      }
      const list = (json.data?.deliveries ?? json.data ?? []) as DeliveryRow[];
      setRows(Array.isArray(list) ? list : []);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [token, headers]);

  useEffect(() => {
    load();
  }, [load]);

  const advance = async (saleId: string, status: string) => {
    setBusyId(saleId);
    try {
      const res = await fetch(posProxyPath(`sales/${saleId}/delivery-status`), {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ status }),
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

  const markFailed = async (saleId: string) => {
    if (!confirm('¿Marcar este envío como fallido?')) return;
    await advance(saleId, 'FAILED');
  };

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-brand-olive">Envíos en curso</h1>
          <p className="mt-1 text-sm text-brand-ink-muted">
            Pedidos con delivery de la sucursal activa. Estados: creado → asignado → en ruta → entregado.
          </p>
        </div>

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
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-brand-ink-muted">
                      Cargando…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-brand-ink-muted">
                      No hay envíos pendientes. Crea una venta con delivery en el POS.
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
                          <span className="app-badge-warn">{STATUS_LABEL[r.deliveryStatus] ?? r.deliveryStatus}</span>
                        </td>
                        <td className="px-4 py-3">
                          {formatClp(r.total)}
                          {r.deliveryAmount > 0 ? (
                            <span className="block text-xs text-brand-ink-muted">
                              + envío {formatClp(r.deliveryAmount)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 space-x-2">
                          {next ? (
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
