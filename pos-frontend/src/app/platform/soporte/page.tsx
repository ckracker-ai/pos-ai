'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { platformFetch } from '@/core/context/platform-auth';
import { PlatformPageHeader } from '@/components/molecules/PlatformPageHeader';
import { extractList, unwrapApiEnvelope } from '@/core/api/normalizers';

type ApiEnvelope<T> = { success: boolean; data: T; error: string | null; code: number };

type CaseRow = {
  id: string;
  empresaId: string;
  empresaRazonSocial: string;
  empresaEstado: string | null;
  status: string;
  origin: string;
  severity: string;
  subject: string;
  lastMessageAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  ABIERTO: 'Abierto',
  ESPERANDO_CLIENTE: 'Espera cliente',
  ESPERANDO_SOPORTE: 'Espera soporte',
  RESUELTO: 'Resuelto',
};

const STATUS_STYLE: Record<string, string> = {
  ABIERTO: 'bg-sky-100 text-sky-800',
  ESPERANDO_CLIENTE: 'bg-amber-100 text-amber-900',
  ESPERANDO_SOPORTE: 'bg-rose-100 text-rose-800',
  RESUELTO: 'bg-emerald-100 text-emerald-800',
};

export default function PlatformSoportePage() {
  const [casos, setCasos] = useState<CaseRow[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [empresas, setEmpresas] = useState<Array<{ id: string; razonSocial: string }>>([]);
  const [form, setForm] = useState({ empresaId: '', subject: '', body: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const qs = new URLSearchParams({ openOnly: 'true' });
    if (typeof window !== 'undefined') {
      const empresaId = new URLSearchParams(window.location.search).get('empresaId');
      if (empresaId) qs.set('empresaId', empresaId);
    }
    const res = await platformFetch<ApiEnvelope<{ casos: CaseRow[]; openCount: number }>>(
      `platform/soporte/casos?${qs.toString()}`
    );
    const data = unwrapApiEnvelope(res) as { casos?: CaseRow[]; openCount?: number };
    setCasos(Array.isArray(data?.casos) ? data.casos : []);
    setOpenCount(Number(data?.openCount ?? 0));
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudieron cargar los casos');
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const openCreate = async () => {
    setShowCreate(true);
    try {
      const res = await platformFetch<ApiEnvelope<{ empresas: Array<{ id: string; razonSocial: string }> }>>(
        'platform/empresas'
      );
      const data = unwrapApiEnvelope(res);
      const rows = extractList<{ id: string; razonSocial?: string; razon_social?: string }>(data, [
        'empresas',
        'items',
      ]);
      setEmpresas(
        rows.map((e) => ({
          id: e.id,
          razonSocial: String(e.razonSocial ?? e.razon_social ?? e.id),
        }))
      );
    } catch {
      setEmpresas([]);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await platformFetch('platform/soporte/casos', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setShowCreate(false);
      setForm({ empresaId: '', subject: '', body: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el caso');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PlatformPageHeader
        title="Soporte"
        description="Casos abiertos por tenant. El comercio escribe desde el ERP; aquí responde un humano."
        actions={
          <button type="button" className="app-btn-primary text-sm" onClick={() => void openCreate()}>
            Nuevo caso
          </button>
        }
      />

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <p className="mb-4 text-sm text-brand-ink-muted">
        Abiertos: <strong className="text-brand-ink">{openCount}</strong>
      </p>

      {showCreate ? (
        <form onSubmit={(e) => void handleCreate(e)} className="mb-6 space-y-3 rounded-2xl border border-brand-linen bg-white p-4">
          <label className="block text-sm font-medium text-brand-ink">
            Empresa
            <select
              className="mt-1 w-full rounded-lg border border-brand-linen px-3 py-2"
              value={form.empresaId}
              onChange={(ev) => setForm((f) => ({ ...f, empresaId: ev.target.value }))}
              required
            >
              <option value="">Selecciona…</option>
              {empresas.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.razonSocial}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-brand-ink">
            Asunto
            <input
              className="mt-1 w-full rounded-lg border border-brand-linen px-3 py-2"
              value={form.subject}
              onChange={(ev) => setForm((f) => ({ ...f, subject: ev.target.value }))}
              minLength={3}
              required
            />
          </label>
          <label className="block text-sm font-medium text-brand-ink">
            Mensaje
            <textarea
              className="mt-1 w-full rounded-lg border border-brand-linen px-3 py-2"
              rows={4}
              value={form.body}
              onChange={(ev) => setForm((f) => ({ ...f, body: ev.target.value }))}
              required
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="app-btn-primary text-sm">
              {saving ? 'Creando…' : 'Crear'}
            </button>
            <button type="button" className="app-btn-secondary text-sm" onClick={() => setShowCreate(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p className="text-sm text-brand-ink-muted">Cargando…</p>
      ) : casos.length === 0 ? (
        <p className="text-sm text-brand-ink-muted">No hay casos abiertos.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-brand-linen bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-surface text-xs uppercase tracking-wide text-brand-ink-muted">
              <tr>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Asunto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Origen</th>
                <th className="px-4 py-3">Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {casos.map((c) => (
                <tr key={c.id} className="border-t border-brand-linen/70">
                  <td className="px-4 py-3">
                    <Link href={`/platform/empresas/${c.empresaId}`} className="text-brand-olive hover:underline">
                      {c.empresaRazonSocial || c.empresaId}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/platform/soporte/${c.id}`} className="font-medium text-brand-ink hover:underline">
                      {c.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[c.status] ?? ''}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-ink-muted">{c.origin}</td>
                  <td className="px-4 py-3 text-xs text-brand-ink-muted">
                    {new Date(c.lastMessageAt).toLocaleString('es-CL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
