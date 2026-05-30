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
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export function Dashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const role = user?.role;
  const profile = useMemo(() => getRoleProfile(role), [role]);
  const { activeBranchName, branchId, canSwitchBranch } = useActiveBranch();
  const [pendingShrinkagesCount, setPendingShrinkagesCount] = useState(0);

  const dashboardModules = useMemo(() => getDashboardModulesForRole(role), [role]);
  const navModules = useMemo(() => getNavModulesForRole(role), [role]);

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
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">
              {profile.label}
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {profile.panelTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
              {profile.panelDescription}
            </p>
          </div>

          {profile.canApproveShrinkages && (
            <button
              type="button"
              onClick={() => router.push('/mermas')}
              className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition"
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
          )}
        </div>

        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Hola, <span className="font-semibold text-gray-900 dark:text-white">{user?.name || 'Usuario'}</span>
          {' · '}
          Sucursal: <span className="font-semibold">{activeBranchName}</span>
          {canSwitchBranch && (
            <span className="text-gray-500 dark:text-gray-500">
              {' '}
              (cambia la sucursal en el encabezado para ver otra)
            </span>
          )}
        </p>
      </div>

      {dashboardModules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">
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
              className="text-left bg-white dark:bg-slate-900 rounded-lg shadow p-6 hover:shadow-lg transition border border-gray-200 dark:border-slate-800"
            >
              <div className="text-4xl mb-3">{module.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{module.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{module.description}</p>
            </button>
          ))}
        </div>
      )}

      <div className="mt-10 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
          Tu menú ({navModules.length} módulos)
        </h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {navModules.map((module) => (
            <li
              key={module.key}
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-slate-800 px-3 py-1 text-xs text-gray-700 dark:text-slate-200"
            >
              <span aria-hidden>{module.icon}</span>
              {module.title}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-gray-500 dark:text-slate-500">
          Los permisos se definen por rol en configuración central. Si agregas un rol nuevo en el sistema,
          asígnalo en los módulos correspondientes.
        </p>
      </div>
    </main>
  );
}
