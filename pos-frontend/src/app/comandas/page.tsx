'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/molecules/DashboardLayout';
import { SidebarMenu } from '@/components/organisms/SidebarMenu';
import { Navbar } from '@/components/organisms/Navbar';
import { api, getApiErrorMessage } from '@/core/api/api-client';
import {
  extractList,
  normalizeKitchenOrder,
  unwrapApiEnvelope,
} from '@/core/api/normalizers';
import { KitchenOrder } from '@/core/interfaces';
import { useActiveBranch } from '@/core/hooks/useActiveBranch';
import { useAuthStore } from '@/store/auth';

const POLL_MS = 4000;
const EMPTY_PRODUCT_NAMES = new Map<string, string>();

export default function ComandasPage() {
  const user = useAuthStore((s) => s.user);
  const { branchId, activeBranchName, loadError: branchLoadError } = useActiveBranch();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const assignedBranchId = user?.branchId ?? branchId;

  const loadOrders = useCallback(async (): Promise<KitchenOrder[]> => {
    const response = await api.getSales();
    const sales = extractList<Record<string, unknown>>(unwrapApiEnvelope(response.data), ['sales']);
    return sales
      .map((sale) => normalizeKitchenOrder(sale, EMPTY_PRODUCT_NAMES))
      .filter((sale) => sale.status.toUpperCase() === 'PENDING');
  }, []);

  const {
    data: orders = [],
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ['comandas', assignedBranchId],
    queryFn: loadOrders,
    enabled: Boolean(assignedBranchId),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
  });

  const loadErrorMessage = isError ? getApiErrorMessage(error, 'comandas.list') : null;

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders]
  );

  const handleMarkReady = async (orderId: string) => {
    try {
      await api.updateSale(orderId, { status: 'COMPLETED' });
      setErrorMessage(null);
      await queryClient.invalidateQueries({ queryKey: ['comandas'] });
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, 'comandas.update'));
    }
  };

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Cocina</p>
              <h1 className="mt-3 text-3xl font-semibold text-white">Comandas en vivo</h1>
              <p className="mt-2 max-w-2xl text-slate-400">
                Pedidos pendientes de preparación. Se actualiza automáticamente cada {POLL_MS / 1000}s.
              </p>
              {branchLoadError && (
                <p className="mt-2 text-xs text-amber-300">{branchLoadError}</p>
              )}
              {isFetching && !isLoading && (
                <p className="mt-2 text-xs text-sky-400">Actualizando...</p>
              )}
            </div>
            <span className="inline-flex rounded-full bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-200">
              Pendientes: {isLoading ? '…' : sortedOrders.length}
            </span>
          </div>

          {(errorMessage || loadErrorMessage) && (
            <p className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {errorMessage ?? loadErrorMessage}
            </p>
          )}

          {isLoading ? (
            <p className="text-slate-400">Cargando comandas...</p>
          ) : isError ? null : sortedOrders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 p-12 text-center text-slate-500">
              No hay comandas pendientes en <strong className="text-slate-300">{activeBranchName}</strong>.
              Las nuevas ventas del POS en esta sucursal aparecerán aquí.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {sortedOrders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-3xl border border-amber-500/30 bg-slate-900/90 p-6 shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-amber-400">Comanda</p>
                      <h2 className="mt-2 text-lg font-semibold text-white">{order.displayReference}</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleString('es-CO', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-200">
                      PENDIENTE
                    </span>
                  </div>

                  {order.customerNotes && (
                    <p className="mt-4 rounded-2xl bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
                      {order.customerNotes}
                    </p>
                  )}

                  <ul className="mt-5 space-y-3">
                    {order.items.length === 0 ? (
                      <li className="text-sm text-slate-500">Sin líneas de detalle en la venta.</li>
                    ) : (
                      order.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3"
                        >
                          <span className="font-medium text-white">{item.productName}</span>
                          <span className="rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold text-amber-200">
                            ×{item.quantity}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>

                  <button
                    type="button"
                    onClick={() => handleMarkReady(order.id)}
                    className="mt-6 w-full rounded-3xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition"
                  >
                    Marcar como entregado
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
