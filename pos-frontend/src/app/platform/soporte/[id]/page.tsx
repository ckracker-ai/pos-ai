'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { platformFetch } from '@/core/context/platform-auth';
import { PlatformPageHeader } from '@/components/molecules/PlatformPageHeader';
import { unwrapApiEnvelope } from '@/core/api/normalizers';

type ApiEnvelope<T> = { success: boolean; data: T; error: string | null; code: number };

type Message = {
  id: string;
  authorKind: string;
  body: string;
  createdAt: string;
};

type Caso = {
  id: string;
  empresaId: string;
  empresaRazonSocial: string;
  status: string;
  origin: string;
  severity: string;
  subject: string;
  messages: Message[];
};

const AUTHOR_LABEL: Record<string, string> = {
  USER: 'Comercio',
  PLATFORM: 'Soporte POS-AI',
  SYSTEM: 'Sistema',
  COPILOT: 'Copiloto',
};

export default function PlatformSoporteCasePage() {
  const params = useParams();
  const id = String(params.id ?? '');
  const [caso, setCaso] = useState<Caso | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await platformFetch<ApiEnvelope<{ caso: Caso }>>(`platform/soporte/casos/${id}`);
    const data = unwrapApiEnvelope(res) as { caso?: Caso };
    setCaso(data?.caso ?? null);
  }, [id]);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar'));
  }, [load]);

  const reply = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await platformFetch(`platform/soporte/casos/${id}/mensajes`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      setBody('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo responder');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (status: string) => {
    setSaving(true);
    try {
      await platformFetch(`platform/soporte/casos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  };

  if (!caso && !error) return <p className="text-sm text-brand-ink-muted">Cargando…</p>;

  return (
    <div>
      <PlatformPageHeader
        title={caso?.subject ?? 'Caso'}
        description={caso ? `${caso.empresaRazonSocial} · ${caso.origin} · ${caso.status}` : undefined}
        actions={
          caso ? (
            <Link href={`/platform/empresas/${caso.empresaId}`} className="app-btn-secondary text-sm">
              Ver empresa
            </Link>
          ) : null
        }
      />
      <p className="mb-4">
        <Link href="/platform/soporte" className="text-sm text-brand-olive hover:underline">
          ← Inbox
        </Link>
      </p>

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      {caso ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {['ABIERTO', 'ESPERANDO_CLIENTE', 'ESPERANDO_SOPORTE', 'RESUELTO'].map((s) => (
              <button
                key={s}
                type="button"
                disabled={saving || caso.status === s}
                onClick={() => void setStatus(s)}
                className="rounded-full border border-brand-linen px-3 py-1 text-xs disabled:opacity-40"
              >
                {s.split('_').join(' ')}
              </button>
            ))}
          </div>

          <div className="space-y-3 rounded-2xl border border-brand-linen bg-white p-4">
            {caso.messages.map((m) => (
              <article
                key={m.id}
                className={`rounded-xl px-3 py-2 text-sm ${
                  m.authorKind === 'PLATFORM' || m.authorKind === 'COPILOT'
                    ? 'bg-brand-olive/10'
                    : 'bg-brand-surface'
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink-muted">
                  {AUTHOR_LABEL[m.authorKind] ?? m.authorKind} · {new Date(m.createdAt).toLocaleString('es-CL')}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-brand-ink">{m.body}</p>
              </article>
            ))}
          </div>

          <form onSubmit={(e) => void reply(e)} className="mt-4 space-y-2">
            <textarea
              className="w-full rounded-lg border border-brand-linen px-3 py-2 text-sm"
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Respuesta al comercio…"
              required
            />
            <button type="submit" disabled={saving} className="app-btn-primary text-sm">
              {saving ? 'Enviando…' : 'Responder'}
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}
