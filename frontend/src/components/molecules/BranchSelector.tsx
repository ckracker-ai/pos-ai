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
        <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-slate-500">Sucursal</p>
        <p
          className="text-sm font-medium text-gray-800 dark:text-slate-200 max-w-[220px] break-words"
          title={current?.name ?? activeBranchName}
        >
          {current?.name ?? activeBranchName}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:items-end">
      <label htmlFor="branch-selector" className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-slate-500 mb-1">
        Sucursal activa
      </label>
      <select
        id="branch-selector"
        value={selectedBranchId}
        onChange={(e) => setSelectedBranchId(e.target.value)}
        className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white min-w-[160px] max-w-[220px]"
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
      {error && <p className="mt-1 text-xs text-rose-500 max-w-[220px]">{error}</p>}
    </div>
  );
}
