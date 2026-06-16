'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { platformFetch, usePlatformAuthStore } from '@/core/context/platform-auth';
import { PlatformPageHeader } from '@/components/molecules/PlatformPageHeader';
import { unwrapApiEnvelope } from '@/core/api/normalizers';

type ApiEnvelope<T> = { success: boolean; data: T; error: string | null };

type DashboardStats = {
  empresasActivas: number;
  empresasSuspendidas: number;
  empresasPendientes: number;
  porPlan: Array<{ codigo: string; nombre: string; count: number }>;
  bindingsWhatsapp: number;
  comprobantesPendientes: number;
  suscripcionesVencidas: number;
  suscripcionesEnGracia: number;
};

export default function PlatformDashboardPage() {
  const router = useRouter();
  const isAuthenticated = usePlatformAuthStore((s) => s.isAuthenticated);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) router.replace('/platform/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await platformFetch<ApiEnvelope<{ stats: DashboardStats }>>('platform/dashboard');
        const data = unwrapApiEnvelope(res) as { stats?: DashboardStats };
        setStats(data.stats ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar dashboard');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const cards = stats
    ? [
        { label: 'Empresas activas', value: stats.empresasActivas, tone: 'text-emerald-700' },
        { label: 'Suspendidas', value: stats.empresasSuspendidas, tone: 'text-rose-700' },
        { label: 'Pendiente onboarding', value: stats.empresasPendientes, tone: 'text-amber-700' },
        { label: 'Bindings WhatsApp', value: stats.bindingsWhatsapp, tone: 'text-brand-olive' },
        { label: 'Comprobantes pendientes', value: stats.comprobantesPendientes, tone: 'text-brand-olive' },
        { label: 'Suscripciones vencidas', value: stats.suscripcionesVencidas, tone: 'text-rose-700' },
        { label: 'Suscripciones en gracia', value: stats.suscripcionesEnGracia, tone: 'text-amber-700' },
      ]
    : [];

  return (
    <>
      <PlatformPageHeader
        title="Dashboard"
        description="Resumen de tenants, planes SaaS, canal WhatsApp y comprobantes pendientes."
      />
      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-brand-ink-muted">Cargando KPIs…</p>}

      {!loading && stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <div key={c.label} className="app-card rounded-2xl px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink-muted">{c.label}</p>
                <p className={`mt-2 text-3xl font-semibold ${c.tone}`}>{c.value}</p>
              </div>
            ))}
          </div>

          <section className="app-card mt-8 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-brand-olive">Empresas por plan</h2>
            <ul className="mt-3 space-y-2 text-sm text-brand-ink">
              {stats.porPlan.length === 0 && (
                <li className="text-brand-ink-muted">Sin empresas registradas.</li>
              )}
              {stats.porPlan.map((p) => (
                <li key={p.codigo} className="flex justify-between border-b border-brand-linen/50 py-2">
                  <span>
                    {p.nombre} <span className="text-brand-ink-muted">({p.codigo})</span>
                  </span>
                  <span className="font-mono font-medium">{p.count}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
