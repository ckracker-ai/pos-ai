'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { getApiClient, unwrapApiData } from '@/core/api/api-client';
import { posProxyPath } from '@/core/constants/api-path';

type Message = { id: string; authorKind: string; body: string; createdAt: string };
type Caso = {
  id: string;
  subject: string;
  status: string;
  messages: Message[];
};
type ManualHit = {
  id: string;
  title: string;
  hint: string;
  path: string;
  snippets: string[];
};

function CopilotBody({ text }: { text: string }) {
  const parts = text.split(/(\/manual#[a-z0-9-]+)/g);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) =>
        part.startsWith('/manual#') ? (
          <Link key={`${part}-${i}`} href={part} className="text-brand-olive underline">
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [casos, setCasos] = useState<Caso[]>([]);
  const [active, setActive] = useState<Caso | null>(null);
  const [text, setText] = useState('');
  const [hits, setHits] = useState<ManualHit[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadList = async () => {
    const res = await getApiClient().get(posProxyPath('support/casos'));
    const data = unwrapApiData<{ casos?: Caso[] }>(res.data);
    setCasos(Array.isArray(data?.casos) ? data.casos : []);
  };

  useEffect(() => {
    if (!open) return;
    void loadList().catch(() => setError('No se pudieron cargar tus casos.'));
  }, [open]);

  useEffect(() => {
    if (!open || active) {
      setHits([]);
      return;
    }
    const q = text.trim();
    if (q.length < 3) {
      setHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      void getApiClient()
        .get(posProxyPath(`support/manual/search?q=${encodeURIComponent(q)}`))
        .then((res) => {
          const data = unwrapApiData<{ hits?: ManualHit[] }>(res.data);
          setHits(Array.isArray(data?.hits) ? data.hits : []);
        })
        .catch(() => setHits([]));
    }, 280);
    return () => window.clearTimeout(t);
  }, [text, open, active]);

  const ask = async (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (body.length < 3) return;
    setBusy(true);
    setError('');
    try {
      const subject = body.slice(0, 80);
      if (active) {
        const res = await getApiClient().post(posProxyPath(`support/casos/${active.id}/copilot`), { body });
        const data = unwrapApiData<{ caso: Caso }>(res.data);
        setActive(data.caso);
      } else {
        const res = await getApiClient().post(posProxyPath('support/casos/ask'), { subject, body });
        const data = unwrapApiData<{ caso: Caso }>(res.data);
        setActive(data.caso);
      }
      setText('');
      setHits([]);
      await loadList();
    } catch {
      setError('No se pudo enviar. Reintenta.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {open ? (
        <div className="pointer-events-auto w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-brand-linen bg-white shadow-xl">
          <header className="flex items-center justify-between bg-brand-olive px-3 py-2 text-white">
            <p className="text-sm font-semibold">Ayuda POS-AI</p>
            <button type="button" className="text-xs opacity-80 hover:opacity-100" onClick={() => setOpen(false)}>
              Cerrar
            </button>
          </header>
          <div className="max-h-80 space-y-2 overflow-y-auto p-3 text-sm">
            {error ? <p className="text-red-700">{error}</p> : null}
            {!active ? (
              <>
                <p className="text-brand-ink-muted">
                  Busca en el manual. Si no alcanza, envía y queda un caso para soporte.
                </p>
                <div className="flex flex-wrap gap-1">
                  {['olvidé mi contraseña', 'cambiar sucursal', 'comprobante WhatsApp', 'hablar con un humano'].map(
                    (chip) => (
                      <button
                        key={chip}
                        type="button"
                        className="rounded-full border border-brand-linen px-2 py-0.5 text-[11px] hover:bg-brand-surface"
                        onClick={() => setText(chip)}
                      >
                        {chip}
                      </button>
                    )
                  )}
                </div>
                {hits.length > 0 ? (
                  <ul className="space-y-1">
                    {hits.map((h) => (
                      <li key={h.id}>
                        <Link
                          href={h.path}
                          className="block rounded-lg border border-brand-linen px-2 py-1 hover:bg-brand-surface"
                        >
                          <span className="font-medium text-brand-ink">{h.title}</span>
                          <span className="mt-0.5 block text-[11px] text-brand-ink-muted">{h.snippets[0]}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {casos.length > 0 ? (
                  <ul className="space-y-1">
                    {casos.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full rounded-lg border border-brand-linen px-2 py-1 text-left hover:bg-brand-surface"
                          onClick={() => {
                            void getApiClient()
                              .get(posProxyPath(`support/casos/${c.id}`))
                              .then((res) => {
                                const data = unwrapApiData<{ caso: Caso }>(res.data);
                                setActive(data.caso);
                              })
                              .catch(() => setError('No se pudo abrir el caso.'));
                          }}
                        >
                          {c.subject}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <>
                <button type="button" className="text-xs text-brand-olive" onClick={() => setActive(null)}>
                  ← Casos
                </button>
                {active.messages?.map((m) => (
                  <p
                    key={m.id}
                    className={`rounded-lg px-2 py-1 ${
                      m.authorKind === 'USER' ? 'bg-brand-surface' : 'bg-brand-olive/10'
                    }`}
                  >
                    <span className="block text-[10px] uppercase text-brand-ink-muted">{m.authorKind}</span>
                    <CopilotBody text={m.body} />
                  </p>
                ))}
              </>
            )}
          </div>
          <form onSubmit={(e) => void ask(e)} className="border-t border-brand-linen p-2">
            <textarea
              className="w-full rounded-lg border border-brand-linen px-2 py-1 text-sm"
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe tu consulta…"
            />
            <div className="mt-1 flex gap-1">
              <button
                type="submit"
                disabled={busy}
                className="flex-1 rounded-lg bg-brand-olive py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {busy ? 'Enviando…' : 'Enviar'}
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-lg border border-brand-linen px-2 py-1.5 text-[11px] disabled:opacity-50"
                onClick={() => {
                  setText('quiero hablar con un humano');
                }}
              >
                Humano
              </button>
            </div>
          </form>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto rounded-full bg-brand-olive px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#3d4532]"
      >
        Ayuda
      </button>
    </div>
  );
}
