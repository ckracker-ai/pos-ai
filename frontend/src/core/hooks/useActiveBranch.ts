'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, getApiErrorMessage } from '@/core/api/api-client';
import {
  extractEntity,
  extractList,
  normalizeBranch,
  unwrapApiEnvelope,
} from '@/core/api/normalizers';
import { Branch } from '@/core/interfaces';
import { useAuthStore } from '@/store/auth';
import { useBranchStore } from '@/store/branch';
import { sanitizeBranchDisplayLabel } from '@/core/utils/branch-display';

const ROLES_WITH_BRANCH_SWITCH = ['admin', 'auditor'];

export function useActiveBranch() {
  const user = useAuthStore((s) => s.user);
  const branchId = useBranchStore((s) => s.selectedBranchId);
  const setBranchId = useBranchStore((s) => s.setSelectedBranchId);
  const setActiveBranchLabel = useBranchStore((s) => s.setActiveBranchLabel);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const canSwitchBranch = ROLES_WITH_BRANCH_SWITCH.includes(user?.role ?? '');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const assignedId = user?.branchId?.trim() || branchId;
      if (!canSwitchBranch && assignedId) {
        if (branchId !== assignedId) {
          setBranchId(assignedId);
        }
        try {
          const response = await api.getBranch(assignedId);
          const row = extractEntity<Record<string, unknown>>(unwrapApiEnvelope(response.data), [
            'branch',
          ]);
          if (cancelled || !row) return;
          const branch = normalizeBranch(row);
          setBranches([branch]);
          setLoadError(null);
        } catch (error) {
          if (!cancelled) setLoadError(getApiErrorMessage(error, 'branches.list'));
        }
        return;
      }

      try {
        const response = await api.getBranches();
        const rows = extractList<Record<string, unknown>>(unwrapApiEnvelope(response.data), [
          'branches',
        ]);
        const loaded = rows.map((row) => normalizeBranch(row));
        const activeBranches = loaded.filter((b) => b.isActive);
        if (cancelled) return;

        setBranches(activeBranches);
        setLoadError(null);

        if (activeBranches.length > 0 && !activeBranches.some((b) => b.id === branchId)) {
          const preferred =
            activeBranches.find((b) => b.id === user?.branchId)?.id ?? activeBranches[0]?.id;
          if (preferred) setBranchId(preferred);
        }
      } catch (error) {
        if (!cancelled) setLoadError(getApiErrorMessage(error, 'branches.list'));
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [branchId, canSwitchBranch, setBranchId, user?.branchId]);

  const activeBranch = useMemo(
    () => branches.find((b) => b.id === branchId),
    [branches, branchId]
  );

  const activeBranchName = sanitizeBranchDisplayLabel(
    activeBranch?.name,
    branchId ? 'Cargando…' : '—'
  );

  useEffect(() => {
    setActiveBranchLabel(activeBranchName);
  }, [activeBranchName, setActiveBranchLabel]);

  return {
    branchId,
    setBranchId,
    branches,
    activeBranch,
    activeBranchName,
    canSwitchBranch,
    loadError,
  };
}
