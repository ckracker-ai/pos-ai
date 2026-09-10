'use client';

import { useAuthStore } from '@/store/auth';
import { api } from '@/core/api/api-client';
import { extractList, unwrapApiEnvelope } from '@/core/api/normalizers';
import {
  APP_MODULES,
  getRoleProfile,
  resolveUserRole,
  roleHasModuleAccess,
} from '@/core/config/role-access';
import { isPlanModuleEnabled } from '@/core/config/plan-access';
import { isRubroModuleEnabled } from '@/core/config/rubro-packs';
import { useActiveBranch } from '@/core/hooks/useActiveBranch';
import { useTenantEmpresa } from '@/core/hooks/useTenantEmpresa';
import { AppPageHeader } from '@/components/molecules/AppPageHeader';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

function formatClp(value: number) {
  return `$${Math.round(value).toLocaleString('es-CL')}`;
}

function canUseModule(
  role: string | undefined,
  plan: Parameters<typeof isPlanModuleEnabled>[1],
  key: string,
  rubroNegocio?: string | null
) {
  const module = APP_MODULES.find((m) => m.key === key);
  if (!module || !role || !roleHasModuleAccess(role, module)) return false;
  return isPlanModuleEnabled(key, plan) && isRubroModuleEnabled(key, rubroNegocio);
}

type OpsMetrics = {
  todayRevenue: number;
  todaySales: number;
  lowStockCount: number;
  pendingProofs: number;
  pendingShrinkages: number;
};

export function Dashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const role = user?.role;
  const profile = useMemo(() => getRoleProfile(role), [role]);
  const { branchId } = useActiveBranch();
  const { empresa } = useTenantEmpresa();
  const plan = empresa?.plan ?? null;
  const rubro = empresa?.rubroNegocio;

  const roleKey = resolveUserRole(role);
  const canReports = canUseModule(role, plan, 'reportes', rubro);
  const canPos = canUseModule(role, plan, 'pos', rubro);
  const canProofs = canUseModule(role, plan, 'comprobantes', rubro);
  const canPedidos = canUseModule(role, plan, 'pedidos', rubro);
  const isKitchenHome = roleKey === 'comanda' && isRubroModuleEnabled('comandas', rubro);
  const isCourierHome = roleKey === 'delivery' && isRubroModuleEnabled('delivery', rubro);

  const [metrics, setMetrics] = useState<OpsMetrics>({
    todayRevenue: 0,
    todaySales: 0,
    lowStockCount: 0,
    pendingProofs: 0,
    pendingShrinkages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setLoadError(null);

      const next: OpsMetrics = {
        todayRevenue: 0,
        todaySales: 0,
        lowStockCount: 0,
        pendingProofs: 0,
        pendingShrinkages: 0,
      };

      try {
        const jobs: Promise<void>[] = [];

        if (canReports) {
          jobs.push(
            (async () => {
              const res = await api.getReportsDashboard({ params: { days: 30 } });
              const dashboard = unwrapApiEnvelope(res.data) as {
                summary?: { todayRevenue?: number; todaySales?: number };
                lowStockAlerts?: unknown[];
              };
              next.todayRevenue = Number(dashboard.summary?.todayRevenue ?? 0);
              next.todaySales = Number(dashboard.summary?.todaySales ?? 0);
              next.lowStockCount = Array.isArray(dashboard.lowStockAlerts)
                ? dashboard.lowStockAlerts.length
                : 0;
            })()
          );
        }

        if (canProofs && branchId) {
          jobs.push(
            (async () => {
              const res = await api.getPaymentProofs('pending');
              const data = unwrapApiEnvelope(res.data) as { proofs?: Record<string, unknown>[] };
              next.pendingProofs = extractList<Record<string, unknown>>(data, ['proofs']).length;
            })()
          );
        }

        if (profile.canApproveShrinkages) {
          jobs.push(
            (async () => {
              const res = await api.getShrinkageByStatus('PENDING');
              const envelopeData = unwrapApiEnvelope(res.data) as { shrinkages?: unknown[] };
              const list = Array.isArray(envelopeData?.shrinkages) ? envelopeData.shrinkages : [];
              next.pendingShrinkages = list.length;
            })()
          );
        }

        const results = await Promise.allSettled(jobs);
        if (cancelled) return;
        const failed = results.some((r) => r.status === 'rejected');
        setMetrics({ ...next });
        if (failed && canReports) {
          setLoadError('No se pudieron cargar todos los indicadores. Revisa reportes o vuelve a intentar.');
        }
      } catch {
        if (!cancelled) setLoadError('No se pudo cargar el resumen de hoy.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [branchId, canProofs, canReports, profile.canApproveShrinkages]);

  const avgTicket =
    metrics.todaySales > 0 ? Math.round(metrics.todayRevenue / metrics.todaySales) : 0;

  const kpiCards = [
    canReports
      ? {
          key: 'sales',
          title: 'Ventas hoy',
          value: isLoading ? '…' : String(metrics.todaySales),
          hint: canReports ? `${formatClp(metrics.todayRevenue)} en ingresos` : undefined,
          onClick: () => router.push('/reportes'),
        }
      : null,
    canReports
      ? {
          key: 'ticket',
          title: 'Ticket medio',
          value: isLoading ? '…' : formatClp(avgTicket),
          hint: 'Ingresos / ventas de hoy',
          onClick: () => router.push('/reportes'),
        }
      : null,
    canReports
      ? {
          key: 'stock',
          title: 'Stock crítico',
          value: isLoading ? '…' : String(metrics.lowStockCount),
          hint: metrics.lowStockCount > 0 ? 'Hay productos bajo el mínimo' : 'Sin alertas de stock',
          alert: metrics.lowStockCount > 0,
          onClick: () => router.push('/reportes'),
        }
      : null,
    canProofs
      ? {
          key: 'proofs',
          title: 'Pagos por validar',
          value: isLoading ? '…' : String(metrics.pendingProofs),
          hint: 'Comprobantes de transferencia pendientes',
          alert: metrics.pendingProofs > 0,
          onClick: () => router.push('/comprobantes'),
        }
      : null,
    profile.canApproveShrinkages
      ? {
          key: 'shrinkage',
          title: 'Mermas pendientes',
          value: isLoading ? '…' : String(metrics.pendingShrinkages),
          hint: 'Esperan autorización',
          alert: metrics.pendingShrinkages > 0,
          onClick: () => router.push('/mermas'),
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    title: string;
    value: string;
    hint?: string;
    alert?: boolean;
    onClick: () => void;
  }>;

  return (
    <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <AppPageHeader
        kicker={profile.label}
        title="Hoy"
        description={profile.panelDescription}
      />

      {loadError ? <p className="mb-6 app-alert-error">{loadError}</p> : null}

      {kpiCards.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={card.onClick}
              className={`app-card rounded-2xl p-5 text-left transition hover:border-brand-olive/40 ${
                card.alert ? 'border-rose-200 bg-rose-50/60' : ''
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-ink-muted">
                {card.title}
              </p>
              <p className="mt-2 text-2xl font-semibold text-brand-ink">{card.value}</p>
              {card.hint ? <p className="mt-1 text-sm text-brand-ink-muted">{card.hint}</p> : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-ink-muted">
          Acciones
        </h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {canPos ? (
            <button type="button" className="app-btn-primary" onClick={() => router.push('/pos')}>
              Nueva venta
            </button>
          ) : null}
          {canPedidos ? (
            <button
              type="button"
              className="app-btn-secondary"
              onClick={() => router.push('/pedidos')}
            >
              Pedidos
              {metrics.pendingProofs > 0 ? (
                <span className="ml-2 rounded-full bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {metrics.pendingProofs}
                </span>
              ) : null}
            </button>
          ) : null}
          {canReports ? (
            <button type="button" className="app-btn-secondary" onClick={() => router.push('/reportes')}>
              Reportes
            </button>
          ) : null}
          {isKitchenHome ? (
            <button type="button" className="app-btn-primary" onClick={() => router.push('/comandas')}>
              Ver comandas
            </button>
          ) : null}
          {isCourierHome ? (
            <button type="button" className="app-btn-primary" onClick={() => router.push('/delivery')}>
              Mis entregas
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
