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
      <div className="hidden sm:block text-right">
        <p className="text-[10px] uppercase tracking-wider text-brand-ink-muted">Sucursal activa</p>
        <p
          className="max-w-[220px] break-words text-sm font-medium text-brand-ink"
          title={current?.name ?? activeBranchName}
        >
          {current?.name ?? activeBranchName}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:items-end">
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
        className="min-w-[160px] max-w-[220px] rounded-xl border border-brand-linen bg-white px-3 py-2 text-sm text-brand-ink outline-none transition focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20"
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
