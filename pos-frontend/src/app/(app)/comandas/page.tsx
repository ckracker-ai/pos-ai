'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppPageContent } from '@/components/molecules/AppPageContent';
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
      <AppPageContent>
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="app-eyebrow">Cocina</p>
              <h1 className="app-heading-page">Comandas en vivo</h1>
              <p className="mt-2 max-w-2xl app-text-muted">
                Pedidos pendientes de preparación. Se actualiza automáticamente cada {POLL_MS / 1000}s.
              </p>
              {branchLoadError && (
                <p className="mt-2 text-xs text-[#8C6A2B]">{branchLoadError}</p>
              )}
              {isFetching && !isLoading && (
                <p className="mt-2 text-xs text-[#4A533C]">Actualizando...</p>
              )}
            </div>
            <span className="inline-flex rounded-full border border-[rgba(176,138,76,0.5)] bg-[rgba(176,138,76,0.1)] px-4 py-2 text-sm font-semibold text-[#8C6A2B]">
              Pendientes: {isLoading ? '…' : sortedOrders.length}
            </span>
          </div>

          {(errorMessage || loadErrorMessage) && (
            <p className="mb-6 app-alert-error">{errorMessage ?? loadErrorMessage}</p>
          )}

          {isLoading ? (
            <p className="app-text-muted">Cargando comandas...</p>
          ) : isError ? null : sortedOrders.length === 0 ? (
            <div className="app-panel rounded-3xl border border-dashed p-12 text-center text-[#6b7280]">
              No hay comandas pendientes en <strong className="text-[#3d4532]">{activeBranchName}</strong>.
              Las nuevas ventas del POS en esta sucursal aparecerán aquí.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {sortedOrders.map((order) => (
                <article
                  key={order.id}
                  className="app-card rounded-3xl border border-[rgba(176,138,76,0.28)] p-6 shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-[#8C6A2B]">Comanda</p>
                      <h2 className="mt-2 text-lg font-semibold text-[#3D4532]">{order.displayReference}</h2>
                      <p className="mt-1 text-xs text-[#6b7280]">
                        {new Date(order.createdAt).toLocaleString('es-CO', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                    <span className="rounded-full border border-[rgba(176,138,76,0.45)] bg-[rgba(176,138,76,0.1)] px-3 py-1 text-xs font-semibold text-[#8C6A2B]">
                      PENDIENTE
                    </span>
                  </div>

                  {order.customerNotes && (
                    <p className="mt-4 rounded-2xl border border-[rgba(209,199,189,0.8)] bg-[rgba(74,83,60,0.05)] px-4 py-3 text-sm app-text-muted">
                      {order.customerNotes}
                    </p>
                  )}

                  <ul className="mt-5 space-y-3">
                    {order.items.length === 0 ? (
                      <li className="text-sm text-[#6b7280]">Sin líneas de detalle en la venta.</li>
                    ) : (
                      order.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between rounded-2xl border border-[rgba(209,199,189,0.8)] bg-white px-4 py-3"
                        >
                          <span className="font-medium text-[#3D4532]">{item.productName}</span>
                          <span className="rounded-full border border-[rgba(74,83,60,0.2)] bg-[rgba(74,83,60,0.08)] px-3 py-1 text-sm font-semibold text-[#4A533C]">
                            ×{item.quantity}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>

                  <button
                    type="button"
                    onClick={() => handleMarkReady(order.id)}
                    className="app-btn-primary mt-6 w-full rounded-3xl px-4 py-3 text-sm font-semibold transition"
                  >
                    Marcar como entregado
                  </button>
                </article>
              ))}
            </div>
          )}
      </AppPageContent>
    </DashboardLayout>
  );
}
