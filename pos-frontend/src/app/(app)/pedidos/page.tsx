'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/core/api/api-client';
import {
  extractList,
  normalizeKitchenOrder,
  normalizePaymentProof,
  unwrapApiEnvelope,
  type PaymentProofRecord,
} from '@/core/api/normalizers';
import { posProxyPath } from '@/core/constants/api-path';
import { isPlanModuleEnabled } from '@/core/config/plan-access';
import { useActiveBranch } from '@/core/hooks/useActiveBranch';
import { useTenantEmpresa } from '@/core/hooks/useTenantEmpresa';
import { useAuthStore } from '@/store/auth';
import { AppPageContent } from '@/components/molecules/AppPageContent';
import { AppPageHeader } from '@/components/molecules/AppPageHeader';
import { DashboardLayout } from '@/components/molecules/DashboardLayout';
import { SidebarMenu } from '@/components/organisms/SidebarMenu';
import { Navbar } from '@/components/organisms/Navbar';
import { NavGlyph } from '@/components/atoms/NavGlyph';
import type { KitchenOrder } from '@/core/interfaces';

type InboxKind = 'pago' | 'envio' | 'cocina';

type InboxItem = {
  id: string;
  kind: InboxKind;
  title: string;
  meta: string;
  amount?: number;
  createdAt: string;
  href: string;
};

type DeliveryRow = {
  id: string;
  saleNumber?: string;
  total?: number;
  deliveryStatus?: string;
  deliveryCustomerName?: string | null;
  deliveryAddress?: string | null;
  createdAt?: string;
};

const KIND_LABEL: Record<InboxKind, string> = {
  pago: 'Pago',
  envio: 'Envío',
  cocina: 'Cocina',
};

function formatClp(value: number) {
  return `$${Math.round(value).toLocaleString('es-CL')}`;
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

export default function PedidosPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const { branchId } = useActiveBranch();
  const { empresa } = useTenantEmpresa();
  const plan = empresa?.plan ?? null;
  const canProofs = isPlanModuleEnabled('comprobantes', plan);

  const [filter, setFilter] = useState<'todos' | InboxKind>('todos');
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    const next: InboxItem[] = [];

    const jobs: Promise<void>[] = [];

    if (canProofs) {
      jobs.push(
        (async () => {
          const res = await api.getPaymentProofs('pending');
          const data = unwrapApiEnvelope(res.data) as { proofs?: Record<string, unknown>[] };
          const rows = extractList<Record<string, unknown>>(data, ['proofs']).map((row) =>
            normalizePaymentProof(row)
          );
          for (const proof of rows as PaymentProofRecord[]) {
            next.push({
              id: `pago-${proof.id}`,
              kind: 'pago',
              title: proof.clientPhone ? `WSP ${proof.clientPhone}` : 'Comprobante pendiente',
              meta: proof.branchName || 'Transferencia por validar',
              amount: proof.expectedTotal,
              createdAt: proof.createdAt,
              href: '/comprobantes',
            });
          }
        })()
      );
    }

    jobs.push(
      (async () => {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${token ?? ''}`,
          'x-internal-key': process.env.NEXT_PUBLIC_INTERNAL_KEY ?? 'supersecretkey',
        };
        if (branchId) headers['x-branch-id'] = branchId;
        const pendingRes = await fetch(posProxyPath('sales/deliveries/pending'), { headers });
        const pendingJson = await pendingRes.json();
        const list = (pendingJson.data?.deliveries ?? pendingJson.data ?? []) as DeliveryRow[];
        for (const row of Array.isArray(list) ? list : []) {
          next.push({
            id: `envio-${row.id}`,
            kind: 'envio',
            title: row.saleNumber ? `Venta ${row.saleNumber}` : 'Envío pendiente',
            meta: [row.deliveryCustomerName, row.deliveryAddress, row.deliveryStatus]
              .filter(Boolean)
              .join(' · '),
            amount: Number(row.total ?? 0),
            createdAt: row.createdAt ?? new Date().toISOString(),
            href: '/delivery',
          });
        }
      })()
    );

    jobs.push(
      (async () => {
        const response = await api.getSales();
        const sales = extractList<Record<string, unknown>>(unwrapApiEnvelope(response.data), ['sales']);
        const kitchen: KitchenOrder[] = sales
          .map((sale) => normalizeKitchenOrder(sale, new Map()))
          .filter((sale) => sale.status.toUpperCase() === 'PENDING');
        for (const order of kitchen) {
          next.push({
            id: `cocina-${order.id}`,
            kind: 'cocina',
            title: order.displayReference || 'Pedido cocina',
            meta: `${order.items.length} ítem(s)`,
            createdAt: order.createdAt,
            href: '/comandas',
          });
        }
      })()
    );

    const results = await Promise.allSettled(jobs);
    next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setItems(next);
    if (results.some((r) => r.status === 'rejected')) {
      setErrorMessage('Algunas colas no se pudieron cargar. Revisa pagos, envíos o comandas.');
    }
    setLoading(false);
  }, [branchId, canProofs, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => (filter === 'todos' ? items : items.filter((item) => item.kind === filter)),
    [filter, items]
  );

  const counts = useMemo(
    () => ({
      todos: items.length,
      pago: items.filter((i) => i.kind === 'pago').length,
      envio: items.filter((i) => i.kind === 'envio').length,
      cocina: items.filter((i) => i.kind === 'cocina').length,
    }),
    [items]
  );

  return (
    <DashboardLayout sidebar={<SidebarMenu />} header={<Navbar />}>
      <AppPageContent>
        <AppPageHeader
          kicker="Operar"
          title="Pedidos"
          description="Una cola para WhatsApp (pagos), envíos y cocina. El detalle y las acciones siguen en cada módulo."
          actions={
            <div className="flex flex-wrap gap-2">
              {canProofs ? (
                <button type="button" className="app-btn-secondary" onClick={() => router.push('/comprobantes')}>
                  Validar pagos
                </button>
              ) : null}
              {canProofs ? (
                <button type="button" className="app-btn-secondary" onClick={() => router.push('/wsp')}>
                  Menú QR
                </button>
              ) : null}
              <button type="button" className="app-btn-secondary" onClick={() => void load()}>
                Actualizar
              </button>
            </div>
          }
        />

        {errorMessage ? <p className="mb-4 app-alert-error">{errorMessage}</p> : null}

        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ['todos', 'Todos'],
              ['pago', 'Pagos'],
              ['envio', 'Envíos'],
              ['cocina', 'Cocina'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                filter === id
                  ? 'border-brand-olive bg-brand-olive text-white'
                  : 'border-brand-linen bg-white text-brand-ink'
              }`}
            >
              {label} ({counts[id]})
            </button>
          ))}
        </div>

        {loading ? (
          <p className="app-text-muted">Cargando cola…</p>
        ) : visible.length === 0 ? (
          <div className="app-card rounded-2xl p-8 text-center text-sm text-brand-ink-muted">
            No hay pedidos pendientes en este filtro.
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => router.push(item.href)}
                  className="app-card flex w-full items-start gap-3 rounded-2xl p-4 text-left transition hover:border-brand-olive/40"
                >
                  <span className="mt-0.5 text-brand-olive">
                    <NavGlyph
                      name={item.kind === 'pago' ? 'chat' : item.kind === 'envio' ? 'truck' : 'kitchen'}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-ink-muted">
                        {KIND_LABEL[item.kind]}
                      </span>
                      <span className="font-semibold text-brand-ink">{item.title}</span>
                    </span>
                    <span className="mt-1 block text-sm text-brand-ink-muted">{item.meta}</span>
                    <span className="mt-1 block text-xs text-brand-ink-muted">{formatWhen(item.createdAt)}</span>
                  </span>
                  {item.amount != null && item.amount > 0 ? (
                    <span className="shrink-0 text-sm font-semibold text-brand-ink">
                      {formatClp(item.amount)}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </AppPageContent>
    </DashboardLayout>
  );
}
