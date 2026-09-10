'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/core/api/api-client';
import { extractEntity, normalizeEmpresa, unwrapApiEnvelope } from '@/core/api/normalizers';
import type { Empresa } from '@/core/interfaces';
import { useAuthStore } from '@/store/auth';

export const EMPRESA_UPDATED_EVENT = 'pos-ai-empresa-updated';

export function notifyEmpresaUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EMPRESA_UPDATED_EVENT));
  }
}

export function useTenantEmpresa() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setEmpresa(null);
      return;
    }
    setLoading(true);
    try {
      const res = await api.getEmpresaMe();
      const raw = extractEntity<Record<string, unknown>>(unwrapApiEnvelope(res.data), ['empresa']);
      setEmpresa(raw ? normalizeEmpresa(raw) : null);
    } catch {
      setEmpresa(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onUpd = () => {
      void load();
    };
    window.addEventListener(EMPRESA_UPDATED_EVENT, onUpd);
    return () => window.removeEventListener(EMPRESA_UPDATED_EVENT, onUpd);
  }, [load]);

  const displayName =
    empresa?.nombreFantasia?.trim() || empresa?.razonSocial?.trim() || null;

  return { empresa, displayName, loading, reload: load };
}
