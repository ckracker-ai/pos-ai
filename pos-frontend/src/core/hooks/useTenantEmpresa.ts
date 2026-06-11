'use client';

import { useEffect, useState } from 'react';
import { api } from '@/core/api/api-client';
import { extractEntity, normalizeEmpresa, unwrapApiEnvelope } from '@/core/api/normalizers';
import type { Empresa } from '@/core/interfaces';
import { useAuthStore } from '@/store/auth';

export function useTenantEmpresa() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setEmpresa(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.getEmpresaMe();
        const raw = extractEntity<Record<string, unknown>>(unwrapApiEnvelope(res.data), ['empresa']);
        if (!cancelled && raw) setEmpresa(normalizeEmpresa(raw));
      } catch {
        if (!cancelled) setEmpresa(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const displayName =
    empresa?.nombreFantasia?.trim() || empresa?.razonSocial?.trim() || null;

  return { empresa, displayName, loading };
}
