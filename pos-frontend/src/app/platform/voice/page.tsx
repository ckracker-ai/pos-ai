'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { platformFetch, usePlatformAuthStore } from '@/core/context/platform-auth';
import { PlatformPageHeader } from '@/components/molecules/PlatformPageHeader';
import { unwrapApiEnvelope } from '@/core/api/normalizers';

type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string };
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
  '1',
  'pedido 1x2',
  'confirmar',
  'ayuda',
] as const;

const CUSTOM_PHONE = '__custom__';
const DEMO_VOICE_PHONE = '56900000003';

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export default function PlatformVoiceSimPage() {
  const router = useRouter();
  const isAuthenticated = usePlatformAuthStore((s) => s.isAuthenticated);

  const [phone, setPhone] = useState(DEMO_VOICE_PHONE);
  const [phonePick, setPhonePick] = useState<string>(CUSTOM_PHONE);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bindings, setBindings] = useState<AssistantBindingRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [sessionBranchId, setSessionBranchId] = useState<string>('');
  const [bindingId, setBindingId] = useState<string | null>(null);
  const [branchSaving, setBranchSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const voiceBindings = bindings.filter((b) => b.channel === 'VOZ');

  useEffect(() => {
    if (!isAuthenticated) router.replace('/platform/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

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
    const digits = normalizePhoneDigits(phone);
    const match = voiceBindings.find((b) => normalizePhoneDigits(b.externalId) === digits);
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
  }, [phone, voiceBindings]);

  const handlePhonePickChange = (value: string) => {
    setPhonePick(value);
    setError(null);
    if (value === CUSTOM_PHONE) {
      setTimeout(() => phoneInputRef.current?.focus(), 0);
      return;
    }
    const row = voiceBindings.find((b) => b.id === value);
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

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      const from = phone.replace(/\D/g, '');
      if (from.length < 8) {
        setError('Teléfono inválido (ej. 56900000003, plan Full)');
        return;
      }

      setError(null);
      setSending(true);
      setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: trimmed }]);

      try {
        const res = await platformFetch<ApiEnvelope<{ reply: string }>>(
          'platform/empresas/assistant/simulate-voice',
          { method: 'POST', body: JSON.stringify({ from, text: trimmed }) }
        );
        const data = unwrapApiEnvelope(res) as { reply?: string };
        const reply = String(data.reply ?? '').trim() || '(sin respuesta)';
        setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: reply }]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error al enviar';
        setError(msg);
        setMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: 'assistant', text: `Error: ${msg}` }]);
      } finally {
        setSending(false);
      }
    },
    [phone, sending]
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t) return;
    setInput('');
    void sendText(t);
  };

  const activeBinding = voiceBindings.find(
    (b) => normalizePhoneDigits(b.externalId) === normalizePhoneDigits(phone)
  );

  return (
    <div className="voice-sim-panel mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-4 p-4 sm:p-6">
      <PlatformPageHeader
        title="Simular llamada (voz IA)"
        description="Plan Full · respuestas cortas para telefonía · mismo motor que WhatsApp"
      />

      <p className="rounded-xl border border-brand-lino/60 bg-brand-vainilla/80 px-3 py-2 text-xs text-brand-ink-muted">
        Demo: teléfono <strong>{DEMO_VOICE_PHONE}</strong> (Costa Azul plan Full tras migración v1.18).
        El pago siempre se envía por WhatsApp al mismo número.
      </p>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="grid gap-3 rounded-2xl border border-brand-lino bg-white p-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-brand-ink-muted">Línea cliente (VOZ)</label>
          <select
            className="mb-2 w-full rounded-lg border border-brand-lino px-3 py-2 text-sm"
            value={phonePick}
            onChange={(e) => handlePhonePickChange(e.target.value)}
          >
            {voiceBindings.length === 0 ? (
              <option value={CUSTOM_PHONE}>Sin bindings VOZ — usa {DEMO_VOICE_PHONE}</option>
            ) : (
              voiceBindings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.empresaNombre ?? b.empresaId.slice(0, 8)} — {b.externalId}
                </option>
              ))
            )}
            <option value={CUSTOM_PHONE}>Otro número…</option>
          </select>
          {phonePick === CUSTOM_PHONE ? (
            <input
              ref={phoneInputRef}
              className="w-full rounded-lg border border-brand-lino px-3 py-2 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="56900000003"
            />
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-brand-ink-muted">Sucursal sesión</label>
          <select
            className="w-full rounded-lg border border-brand-lino px-3 py-2 text-sm disabled:opacity-50"
            value={sessionBranchId}
            disabled={!bindingId || branchSaving}
            onChange={(e) => void handleSessionBranchChange(e.target.value)}
          >
            <option value="">— automática —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {activeBinding ? (
            <p className="mt-1 text-xs text-brand-ink-muted">
              Empresa: {activeBinding.empresaNombre ?? activeBinding.empresaId}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd}
            type="button"
            disabled={sending}
            onClick={() => void sendText(cmd)}
            className="rounded-full border border-brand-olive/30 bg-brand-vainilla px-3 py-1 text-xs text-brand-olive hover:bg-brand-lino/40 disabled:opacity-50"
          >
            {cmd}
          </button>
        ))}
      </div>

      <div className="wsp-chat-frame overflow-hidden rounded-2xl border border-brand-linen/80 shadow-md">
        <div className="wsp-chat-header px-4 py-3">
          <p className="text-sm font-semibold text-white">Llamada simulada · voz IA</p>
          <p className="text-xs text-white/80">+{normalizePhoneDigits(phone) || '…'}</p>
        </div>

        <div
          ref={scrollRef}
          className="wsp-chat-body min-h-[280px] max-h-[50vh] flex-1 space-y-3 overflow-y-auto p-4 sm:max-h-[55vh]"
        >
          {messages.length === 0 ? (
            <p className="text-center text-sm text-brand-ink-muted">
              Escribe lo que diría el cliente por teléfono. La respuesta se adapta a voz (sin markdown).
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  m.role === 'user'
                    ? 'wsp-bubble-out ml-auto rounded-br-none'
                    : 'wsp-bubble-in mr-auto rounded-bl-none border border-white/60'
                }`}
              >
                <span className="assistant-chat-label">
                  {m.role === 'user' ? 'Cliente (STT)' : 'Asistente (TTS)'}
                </span>
                {m.text}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-brand-linen/50 bg-white/90 px-3 py-3">
          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              className="flex-1 rounded-full border border-brand-linen bg-white px-4 py-2 text-sm text-brand-ink outline-none focus:border-brand-olive"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Ej. "buscar empanada" o "sucursales"'
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="wsp-on-olive rounded-full bg-brand-olive px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3d4532] disabled:opacity-50"
            >
              {sending ? '…' : 'Hablar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
