'use client';

import { useAuthStore } from '@/store/auth';
import { useBranchStore } from '@/store/branch';
import { getRoleProfile } from '@/core/config/role-access';
import { sanitizeBranchDisplayLabel } from '@/core/utils/branch-display';

/** Indica qué sucursal filtra las peticiones API (header x-branch-id). */
export function ActiveBranchBar() {
  const user = useAuthStore((s) => s.user);
  const activeBranchName = sanitizeBranchDisplayLabel(
    useBranchStore((s) => s.activeBranchLabel),
    'Cargando…'
  );
  const canSwitchBranch = getRoleProfile(user?.role).canSwitchBranch;

  return (
    <div className="border-b border-sky-500/20 bg-sky-500/10 px-4 py-2 text-center text-sm text-sky-900 dark:text-sky-100 sm:px-6">
      <span className="text-sky-700/80 dark:text-sky-300/80">
        {canSwitchBranch ? 'Sucursal activa — ' : 'Tu sucursal — '}
      </span>
      <span className="font-semibold" title={activeBranchName}>
        {activeBranchName}
      </span>
      <span className="ml-2 hidden text-xs text-sky-700/70 dark:text-sky-400/70 sm:inline">
        (productos, stock, ventas y reportes usan esta sucursal)
      </span>
    </div>
  );
}
