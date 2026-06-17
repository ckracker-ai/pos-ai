'use client';

import { useAuthStore } from '@/store/auth';
import { api } from '@/core/api/api-client';
import { unwrapApiEnvelope } from '@/core/api/normalizers';
import {
  getDashboardModulesForRole,
  getNavModulesForRole,
  getRoleProfile,
} from '@/core/config/role-access';
import { useActiveBranch } from '@/core/hooks/useActiveBranch';
import { useTenantEmpresa } from '@/core/hooks/useTenantEmpresa';
import { AppPageHeader } from '@/components/molecules/AppPageHeader';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export function Dashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const role = user?.role;
  const profile = useMemo(() => getRoleProfile(role), [role]);
  const { activeBranchName, branchId, canSwitchBranch } = useActiveBranch();
  const { displayName: empresaName, empresa } = useTenantEmpresa();
  const [pendingShrinkagesCount, setPendingShrinkagesCount] = useState(0);
  const plan = empresa?.plan ?? null;

  const dashboardModules = useMemo(() => getDashboardModulesForRole(role, plan), [role, plan]);
  const navModules = useMemo(() => getNavModulesForRole(role, plan), [role, plan]);

  useEffect(() => {
    if (!profile.canApproveShrinkages) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await api.getShrinkageByStatus('PENDING');
        const envelopeData = unwrapApiEnvelope(res.data) as { shrinkages?: unknown[] };
        const list = Array.isArray(envelopeData?.shrinkages) ? envelopeData.shrinkages : [];
        if (!cancelled) setPendingShrinkagesCount(list.length);
      } catch {
        if (!cancelled) setPendingShrinkagesCount(0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile.canApproveShrinkages, branchId]);

  return (
    <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <AppPageHeader
        kicker={profile.label}
        title={profile.panelTitle}
        description={profile.panelDescription}
        actions={
          profile.canApproveShrinkages ? (
            <button
              type="button"
              onClick={() => router.push('/mermas')}
              className="relative rounded-xl border border-brand-linen bg-white px-3 py-2 text-sm text-brand-ink transition hover:border-brand-olive/30 hover:bg-brand-surface"
              aria-label="Mermas pendientes por autorizar"
              title="Mermas pendientes por autorizar"
            >
              <span className="mr-2">🧾</span>
              Mermas pendientes
              {pendingShrinkagesCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-600 px-2 text-xs font-semibold text-white">
                  {pendingShrinkagesCount}
                </span>
              )}
            </button>
          ) : undefined
        }
        meta={
          <>
            Hola, <span className="font-semibold text-brand-ink">{user?.name || 'Usuario'}</span>
            {empresaName ? (
              <>
                {' · '}
                <span className="font-semibold text-brand-ink">{empresaName}</span>
              </>
            ) : null}
            {' · '}
            Sucursal: <span className="font-semibold text-brand-ink">{activeBranchName}</span>
            {canSwitchBranch ? (
              <span className="text-brand-ink-muted/80">
                {' '}
                (cambia la sucursal en el encabezado para ver otra)
              </span>
            ) : null}
          </>
        }
      />

      {dashboardModules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-linen bg-white/80 p-8 text-center">
          <p className="text-brand-ink-muted">
            No hay accesos rápidos en el panel para tu rol. Usa el menú lateral o contacta al administrador.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardModules.map((module) => (
            <button
              key={module.key}
              type="button"
              onClick={() => router.push(module.path)}
              className="app-card rounded-2xl p-6 text-left transition"
            >
              <div className="mb-3 text-4xl">{module.icon}</div>
              <h3 className="mb-2 text-lg font-semibold text-brand-ink">{module.title}</h3>
              <p className="text-sm text-brand-ink-muted">{module.description}</p>
            </button>
          ))}
        </div>
      )}

      <div className="app-card mt-10 rounded-2xl p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-ink-muted">
          Tu menú ({navModules.length} módulos)
        </h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {navModules.map((module) => (
            <li
              key={module.key}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-linen/60 bg-brand-surface px-3 py-1 text-xs text-brand-ink"
            >
              <span aria-hidden>{module.icon}</span>
              {module.title}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-brand-ink-muted">
          Los permisos se definen por rol en configuración central. Si agregas un rol nuevo en el sistema,
          asígnalo en los módulos correspondientes.
        </p>
      </div>
    </main>
  );
}
