'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { platformFetch, usePlatformAuthStore } from '@/core/context/platform-auth';
import { PlatformPageHeader } from '@/components/molecules/PlatformPageHeader';
import { WspMarkdownText } from '@/components/molecules/WspMarkdownText';
import { unwrapApiEnvelope } from '@/core/api/normalizers';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: number;
};

type ApiEnvelope<T> = { success: boolean; data: T; error: string | null };

type AssistantBindingRow = {
  id: string;
  empresaId: string;
  empresaNombre?: string;
  channel: string;
  externalId: string;
  defaultBranchId: string | null;
  sessionBranchId: string | null;
};

type BranchRow = { id: string; name: string };

const QUICK_COMMANDS = [
  'sucursales',
  'buscar empanada',
  'pedido 1x2',
  'confirmar',
  'mi pedido',
  'ayuda',
] as const;

const CUSTOM_PHONE = '__custom__';
const DEMO_WSP_PHONE = '56900000001';

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function formatMsgTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

export default function PlatformWhatsappSimPage() {
  const router = useRouter();
  const isAuthenticated = usePlatformAuthStore((s) => s.isAuthenticated);

  const [phone, setPhone] = useState(DEMO_WSP_PHONE);
  const [phonePick, setPhonePick] = useState<string>(CUSTOM_PHONE);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  const [bindings, setBindings] = useState<AssistantBindingRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [sessionBranchId, setSessionBranchId] = useState<string>('');
  const [bindingId, setBindingId] = useState<string | null>(null);
  const [branchSaving, setBranchSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const demoBindingApplied = useRef(false);

  const wspBindings = useMemo(
    () => bindings.filter((b) => b.channel === 'WHATSAPP'),
    [bindings]
  );

  const activeBinding = useMemo(
    () => wspBindings.find((b) => normalizePhoneDigits(b.externalId) === normalizePhoneDigits(phone)),
    [phone, wspBindings]
  );

  useEffect(() => {
    if (!isAuthenticated) router.replace('/platform/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void (async () => {
      try {
        const res = await platformFetch<ApiEnvelope<{ bindings: AssistantBindingRow[] }>>(
          'platform/empresas/assistant-bindings'
        );
        const data = unwrapApiEnvelope(res) as { bindings?: AssistantBindingRow[] };
        setBindings(Array.isArray(data.bindings) ? data.bindings : []);
        setError(null);
      } catch (e) {
        setBindings([]);
        setError(e instanceof Error ? e.message : 'Error al cargar bindings');
      }
    })();
  }, [isAuthenticated]);

  useEffect(() => {
    if (demoBindingApplied.current || wspBindings.length === 0) return;
    const demo = wspBindings.find(
      (b) => normalizePhoneDigits(b.externalId) === DEMO_WSP_PHONE
    );
    if (demo) {
      demoBindingApplied.current = true;
      setPhonePick(demo.id);
      setPhone(demo.externalId);
    }
  }, [wspBindings]);

  useEffect(() => {
    const digits = normalizePhoneDigits(phone);
    const match = wspBindings.find((b) => normalizePhoneDigits(b.externalId) === digits);
    if (!match) {
      setBindingId(null);
      setBranches([]);
      setSessionBranchId('');
      return;
    }
    setBindingId(match.id);
    setSessionBranchId(match.sessionBranchId ?? match.defaultBranchId ?? '');
    void (async () => {
      try {
        const res = await platformFetch<ApiEnvelope<{ sucursales: BranchRow[] }>>(
          `platform/empresas/${match.empresaId}/branches`
        );
        const data = unwrapApiEnvelope(res) as { sucursales?: BranchRow[] };
        setBranches(Array.isArray(data.sucursales) ? data.sucursales : []);
      } catch {
        setBranches([]);
      }
    })();
  }, [phone, wspBindings]);

  const handlePhonePickChange = (value: string) => {
    setPhonePick(value);
    setError(null);
    if (value === CUSTOM_PHONE) {
      setTimeout(() => phoneInputRef.current?.focus(), 0);
      return;
    }
    const row = wspBindings.find((b) => b.id === value);
    if (row) setPhone(row.externalId);
  };

  const handleSessionBranchChange = async (branchId: string) => {
    if (!bindingId) return;
    setBranchSaving(true);
    setError(null);
    try {
      await platformFetch(`platform/empresas/assistant-bindings/${bindingId}/session-branch`, {
        method: 'PATCH',
        body: JSON.stringify({ branchId: branchId || null }),
      });
      setSessionBranchId(branchId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar la sucursal');
    } finally {
      setBranchSaving(false);
    }
  };

  const sendPayload = useCallback(
    async (payload: {
      displayText: string;
      text?: string;
      imageBase64?: string;
      mimeType?: string;
      caption?: string;
    }) => {
      if (sending) return;

      const from = phone.replace(/\D/g, '');
      if (from.length < 8) {
        setError('Ingresa un teléfono válido (E.164 sin +, ej. 56900000001)');
        return;
      }

      setError(null);
      setSending(true);
      const now = Date.now();
      setMessages((prev) => [
        ...prev,
        { id: `u-${now}`, role: 'user', text: payload.displayText, at: now },
      ]);

      try {
        const res = await platformFetch<ApiEnvelope<{ reply: string; success: boolean }>>(
          'platform/empresas/assistant/simulate',
          {
            method: 'POST',
            body: JSON.stringify({
              from,
              text: payload.text,
              imageBase64: payload.imageBase64,
              mimeType: payload.mimeType,
              caption: payload.caption,
            }),
          }
        );
        const data = unwrapApiEnvelope(res) as { reply?: string };
        const reply = String(data.reply ?? '').trim() || '(sin respuesta)';
        const replyAt = Date.now();
        setMessages((prev) => [
          ...prev,
          { id: `a-${replyAt}`, role: 'assistant', text: reply, at: replyAt },
        ]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error al enviar';
        setError(msg);
        const errAt = Date.now();
        setMessages((prev) => [
          ...prev,
          { id: `e-${errAt}`, role: 'assistant', text: `Error: ${msg}`, at: errAt },
        ]);
      } finally {
        setSending(false);
      }
    },
    [phone, sending]
  );

  const sendText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      void sendPayload({ displayText: trimmed, text: trimmed });
    },
    [sendPayload]
  );

  const sendImageFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('Solo imágenes (JPEG/PNG/WebP)');
        return;
      }
      if (file.size > 4 * 1024 * 1024) {
        setError('Imagen máximo 4 MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result ?? '');
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        if (!base64) {
          setError('No se pudo leer la imagen');
          return;
        }
        const caption = imageCaption.trim();
        void sendPayload({
          displayText: caption ? `📷 ${caption}` : '📷 Comprobante (imagen)',
          imageBase64: base64,
          mimeType: file.type,
          caption: caption || undefined,
        });
        setImageCaption('');
      };
      reader.onerror = () => setError('Error al leer el archivo');
      reader.readAsDataURL(file);
    },
    [imageCaption, sendPayload]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input;
    setInput('');
    sendText(text);
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  if (!isAuthenticated) return null;

  const headerTitle = activeBinding?.empresaNombre ?? 'POS-AI Asistente';
  const branchLabel =
    branches.find((b) => b.id === sessionBranchId)?.name ?? 'Sucursal automática';

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-4 p-4 sm:p-6">
      <PlatformPageHeader
        title="Simulador WhatsApp"
        description="Plan Estándar · prueba el flujo del asistente sin Meta Graph API"
      />

      <p className="rounded-xl border border-brand-linen/60 bg-brand-vainilla/80 px-3 py-2 text-xs text-brand-ink-muted">
        Demo: teléfono <strong>{DEMO_WSP_PHONE}</strong> (Costa Azul). Flujo:{' '}
        <strong>sucursales</strong> → <strong>buscar</strong> → <strong>pedido</strong> →{' '}
        <strong>confirmar</strong> → comprobante. Valida en el tenant en{' '}
        <strong>Comprobantes</strong>.
      </p>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 rounded-2xl border border-brand-linen bg-white p-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wsp-phone-pick" className="mb-1 block text-xs font-medium text-brand-ink-muted">
            Cliente (binding WSP)
          </label>
          <select
            id="wsp-phone-pick"
            className="app-select mb-2 w-full"
            value={phonePick === CUSTOM_PHONE ? '' : phonePick}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                handlePhonePickChange(CUSTOM_PHONE);
                return;
              }
              handlePhonePickChange(v);
            }}
          >
            <option value="">— Elegir binding —</option>
            {wspBindings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.empresaNombre ?? 'Empresa'} — {b.externalId}
              </option>
            ))}
          </select>
          <input
            id="wsp-phone-manual"
            ref={phoneInputRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            value={phone}
            onChange={(e) => {
              setPhonePick(CUSTOM_PHONE);
              setPhone(e.target.value.replace(/[^\d]/g, ''));
              setError(null);
            }}
            className="app-input app-input-mono w-full text-base"
            placeholder={DEMO_WSP_PHONE}
          />
          {phone.length >= 8 && !bindingId ? (
            <p className="mt-1 text-xs text-amber-900">
              Sin binding — regístralo en{' '}
              <Link href="/platform/empresas" className="underline">
                Empresas → Canal WhatsApp
              </Link>
              .
            </p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-brand-ink-muted">
            Sucursal de sesión (stock y pedidos)
          </label>
          <select
            className="app-select w-full disabled:opacity-50"
            value={sessionBranchId}
            disabled={!bindingId || branchSaving || branches.length === 0}
            onChange={(e) => void handleSessionBranchChange(e.target.value)}
          >
            <option value="">Por defecto del binding</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {activeBinding ? (
            <p className="mt-2 text-xs text-brand-ink-muted">
              <Link
                href={`/platform/empresas/${activeBinding.empresaId}`}
                className="font-medium text-brand-olive hover:underline"
              >
                {activeBinding.empresaNombre ?? 'Ver empresa'}
              </Link>
              {' · '}
              {branchLabel}
            </p>
          ) : null}
        </div>
      </div>

      <div className="wsp-chat-frame overflow-hidden rounded-2xl border border-brand-linen/80 shadow-md">
        <div className="wsp-chat-header flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{headerTitle}</p>
            <p className="truncate text-xs text-white/80">+{normalizePhoneDigits(phone) || '…'}</p>
          </div>
          <button
            type="button"
            onClick={clearChat}
            className="shrink-0 rounded-lg border border-white/30 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/10"
          >
            Limpiar chat
          </button>
        </div>

        <div
          ref={scrollRef}
          className="wsp-chat-body max-h-[50vh] min-h-[300px] space-y-2 overflow-y-auto px-3 py-4 sm:max-h-[55vh]"
        >
          {messages.length === 0 ? (
            <div className="mx-auto max-w-sm rounded-xl border border-brand-linen/70 bg-white/90 px-4 py-5 text-center shadow-sm">
              <p className="text-sm font-semibold text-brand-ink">Simulador POS-AI</p>
              <p className="mt-2 text-xs leading-relaxed text-brand-ink-muted">
                Flujo demo: <strong>sucursales</strong> → <strong>buscar empanada</strong> →{' '}
                <strong>pedido 1x2</strong> → <strong>confirmar</strong> → envía comprobante 📷
              </p>
              <p className="mt-3 text-[11px] text-brand-ink-muted">
                Valida el pago en el tenant: Comprobantes
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isError = m.role === 'assistant' && m.text.startsWith('Error:');
              return (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`relative max-w-[88%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                    m.role === 'user'
                      ? 'wsp-bubble-out rounded-br-none bg-[#d9fdd3] text-brand-ink'
                      : isError
                        ? 'wsp-bubble-in wsp-bubble-error rounded-bl-none'
                        : 'wsp-bubble-in rounded-bl-none border border-white/60 bg-white text-brand-ink'
                  }`}
                >
                  {m.role === 'assistant' ? <WspMarkdownText text={m.text} /> : m.text}
                  <span
                    className={`mt-1 block text-right text-[10px] ${
                      m.role === 'user' ? 'text-brand-ink-muted' : 'text-brand-ink-muted/80'
                    }`}
                  >
                    {formatMsgTime(m.at)}
                  </span>
                </div>
              </div>
            );
            })
          )}
          {sending ? (
            <div className="flex justify-start">
              <div className="wsp-typing" aria-label="Asistente escribiendo">
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-brand-linen/50 bg-white/90 px-3 py-2">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK_COMMANDS.map((cmd) => (
              <button
                key={cmd}
                type="button"
                disabled={sending}
                onClick={() => void sendText(cmd)}
                className="rounded-full border border-brand-linen bg-brand-vainilla px-2.5 py-0.5 text-[11px] text-brand-ink hover:border-brand-olive disabled:opacity-50"
              >
                {cmd}
              </button>
            ))}
          </div>

          <div className="mb-2 flex gap-2">
            <input
              type="text"
              value={imageCaption}
              onChange={(e) => setImageCaption(e.target.value)}
              placeholder="Monto antes de foto (ej. vale 5000)"
              disabled={sending}
              className="flex-1 rounded-lg border border-brand-linen bg-white px-3 py-1.5 text-xs outline-none focus:border-brand-olive"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={sending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) sendImageFile(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={sending}
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 rounded-lg border border-brand-linen bg-white px-3 py-1.5 text-xs hover:border-brand-olive disabled:opacity-50"
              title="Simular comprobante transferencia"
            >
              📷
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Mensaje…"
              disabled={sending}
              className="flex-1 rounded-full border border-brand-linen bg-white px-4 py-2 text-sm outline-none focus:border-brand-olive"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="wsp-on-olive rounded-full bg-brand-olive px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3d4532] disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>

      <p className="text-center text-[11px] text-brand-ink-muted">
        Producción: webhook Meta → <code className="text-brand-olive">/webhooks/whatsapp</code> en
        pos-api-assistant
      </p>
    </div>
  );
}
