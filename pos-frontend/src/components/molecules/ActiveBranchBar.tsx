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
    <div className="border-b border-brand-linen/50 bg-brand-olive/8 px-4 py-2 text-center text-sm text-brand-ink sm:px-6">
      <span className="text-brand-ink-muted">
        {canSwitchBranch ? 'Sucursal activa — ' : 'Tu sucursal — '}
      </span>
      <span className="font-semibold text-brand-olive" title={activeBranchName}>
        {activeBranchName}
      </span>
      <span className="ml-2 hidden text-xs text-brand-ink-muted sm:inline">
        (productos, stock, ventas y reportes usan esta sucursal)
      </span>
    </div>
  );
}
