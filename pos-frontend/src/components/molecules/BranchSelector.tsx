'use client';

import { useActiveBranch } from '@/core/hooks/useActiveBranch';

export function BranchSelector() {
  const {
    branchId: selectedBranchId,
    setBranchId: setSelectedBranchId,
    branches,
    activeBranchName,
    canSwitchBranch,
    loadError: error,
  } = useActiveBranch();

  if (!canSwitchBranch) {
    const current = branches.find((b) => b.id === selectedBranchId);
    return (
      <div className="min-w-0 text-left sm:text-right">
        <p className="text-[10px] uppercase tracking-wider text-brand-ink-muted">Sucursal activa</p>
        <p
          className="truncate text-sm font-medium text-brand-ink"
          title={current?.name ?? activeBranchName}
        >
          {current?.name ?? activeBranchName}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 w-full flex-col sm:items-end">
      <label
        htmlFor="branch-selector"
        className="mb-1 text-[10px] uppercase tracking-wider text-brand-ink-muted"
      >
        Sucursal activa
      </label>
      <select
        id="branch-selector"
        value={selectedBranchId}
        onChange={(e) => setSelectedBranchId(e.target.value)}
        title="Productos, stock, ventas y reportes usan esta sucursal"
        className="w-full min-w-0 max-w-[220px] rounded-xl border border-brand-linen bg-white px-3 py-1.5 text-sm text-brand-ink outline-none transition focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20 sm:py-2"
      >
        {branches.length === 0 ? (
          <option value={selectedBranchId}>Cargando...</option>
        ) : (
          branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))
        )}
      </select>
      {error && <p className="mt-1 max-w-[220px] text-xs text-rose-600">{error}</p>}
    </div>
  );
}
